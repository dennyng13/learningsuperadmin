import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import {
  BookOpen, Target, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import {
  calcPlanProgress,
  calcClassPlanProgress,
  type PlanProgress,
} from "@shared/utils/studyPlanProgress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DelayedClassInfo {
  classId: string;
  className: string;
  level: string | null;
  program: string | null;
  delayedStudents: number;
  totalStudents: number;
  delayedSessions: number;
}

export default function TeacherProgressSummary() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    totalPlans: number;
    totalStudentsWithPlans: number;
    avgCompletion: number;
    avgExpected: number;
    avgDelta: number;
    totalOnTrack: number;
    totalBehind: number;
    totalCompleted: number;
  } | null>(null);
  const [delayedClasses, setDelayedClasses] = useState<DelayedClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, isSuperAdmin]);

  async function fetchData() {
    setLoading(true);

    let teacherId: string | null = null;
    if (!isSuperAdmin) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("linked_user_id", user!.id)
        .maybeSingle();
      teacherId = teacher?.id || null;
    }

    let classQuery = supabase.from("teachngo_classes").select("id, class_name, level, program");
    if (!isSuperAdmin && teacherId) {
      classQuery = classQuery.eq("teacher_id", teacherId);
    }
    const { data: classes } = await classQuery;
    if (!classes || classes.length === 0) {
      setStats(null);
      setDelayedClasses([]);
      setLoading(false);
      return;
    }

    const classIds = classes.map(c => c.id);
    const classMap = new Map(classes.map(c => [c.id, c]));

    const { data: enrollments } = await supabase
      .from("teachngo_class_students")
      .select("class_id, teachngo_student_id")
      .in("class_id", classIds);

    const teachngoIds = [...new Set((enrollments || []).map(e => e.teachngo_student_id))];
    if (teachngoIds.length === 0) {
      setStats(null);
      setDelayedClasses([]);
      setLoading(false);
      return;
    }

    const studentClassMap: Record<string, string[]> = {};
    for (const e of enrollments || []) {
      if (!studentClassMap[e.teachngo_student_id]) studentClassMap[e.teachngo_student_id] = [];
      if (!studentClassMap[e.teachngo_student_id].includes(e.class_id)) {
        studentClassMap[e.teachngo_student_id].push(e.class_id);
      }
    }

    const { data: studentsData } = await supabase
      .from("teachngo_students")
      .select("teachngo_id, full_name, linked_user_id")
      .in("teachngo_id", teachngoIds);

    const linkedStudents = (studentsData || []).filter(s => s.linked_user_id);
    if (linkedStudents.length === 0) {
      setStats(null);
      setDelayedClasses([]);
      setLoading(false);
      return;
    }

    const allTeachngoIds = linkedStudents.map(s => s.teachngo_id);

    // Fetch plans
    const { data: plans } = await supabase
      .from("study_plans")
      .select("id, teachngo_student_id, class_ids, student_ids, start_date, end_date")
      .or(
        [
          `teachngo_student_id.in.(${allTeachngoIds.join(",")})`,
          ...classIds.map(cid => `class_ids.cs.["${cid}"]`),
        ].join(",")
      );

    if (!plans || plans.length === 0) {
      setStats(null);
      setDelayedClasses([]);
      setLoading(false);
      return;
    }

    const planIds = plans.map(p => p.id);

    const { data: entries } = await supabase
      .from("study_plan_entries")
      .select("plan_id, entry_date, plan_status, session_number")
      .in("plan_id", planIds);

    const entriesByPlan: Record<string, any[]> = {};
    for (const e of entries || []) {
      if (!entriesByPlan[e.plan_id]) entriesByPlan[e.plan_id] = [];
      entriesByPlan[e.plan_id].push(e);
    }

    const studentProgresses: { studentName: string; progress: PlanProgress }[] = [];

    // Track per-class delayed info
    const classDelayTracker: Record<string, { delayedStudents: number; totalStudents: number; delayedSessions: number }> = {};
    for (const cid of classIds) {
      classDelayTracker[cid] = { delayedStudents: 0, totalStudents: 0, delayedSessions: 0 };
    }

    for (const student of linkedStudents) {
      const tid = student.teachngo_id;

      const studentPlans = plans.filter((p: any) => {
        if (p.teachngo_student_id === tid) return true;
        const sids = Array.isArray(p.student_ids) ? p.student_ids : [];
        if (sids.includes(tid)) return true;
        const cids = Array.isArray(p.class_ids) ? p.class_ids : [];
        return cids.some((cid: string) => classIds.includes(cid));
      });

      if (studentPlans.length === 0) continue;

      const allEntries = studentPlans.flatMap((p: any) => entriesByPlan[p.id] || []);
      const progress = calcPlanProgress(
        allEntries,
        studentPlans[0]?.start_date,
        studentPlans[0]?.end_date,
      );

      studentProgresses.push({ studentName: student.full_name, progress });

      // Track per class
      const studentClasses = studentClassMap[tid] || [];
      for (const cid of studentClasses) {
        if (classDelayTracker[cid]) {
          classDelayTracker[cid].totalStudents++;
          if (progress.sessionsBehind > 0) {
            classDelayTracker[cid].delayedStudents++;
            classDelayTracker[cid].delayedSessions += progress.delayedSessions;
          }
        }
      }
    }

    if (studentProgresses.length === 0) {
      setStats(null);
      setDelayedClasses([]);
      setLoading(false);
      return;
    }

    // Build delayed classes list
    const delayed: DelayedClassInfo[] = [];
    for (const [cid, tracker] of Object.entries(classDelayTracker)) {
      if (tracker.delayedStudents > 0) {
        const cls = classMap.get(cid);
        if (cls) {
          delayed.push({
            classId: cid,
            className: cls.class_name,
            level: cls.level,
            program: cls.program,
            delayedStudents: tracker.delayedStudents,
            totalStudents: tracker.totalStudents,
            delayedSessions: tracker.delayedSessions,
          });
        }
      }
    }
    delayed.sort((a, b) => b.delayedStudents - a.delayedStudents);
    setDelayedClasses(delayed);

    const agg = calcClassPlanProgress(studentProgresses);
    if (agg) {
      setStats({
        totalPlans: plans.length,
        totalStudentsWithPlans: studentProgresses.length,
        ...agg,
      });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded mb-3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card overflow-hidden">
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Tiến độ tổng quan</h3>
          <span className="text-[10px] text-muted-foreground">
            ({stats.totalStudentsWithPlans} học viên · {stats.totalPlans} kế hoạch)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stats.totalBehind > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.totalBehind} chậm
            </span>
          )}
          {stats.totalCompleted > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats.totalCompleted} xong
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatBlock icon={BookOpen} label="Hoàn thành" value={`${stats.avgCompletion}%`} rate={stats.avgCompletion} />
            <StatBlock icon={Target} label="Kỳ vọng" value={`${stats.avgExpected}%`} rate={stats.avgExpected} />
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Chênh lệch</p>
              <p className={cn(
                "text-xl font-bold",
                stats.avgDelta >= 0 ? "text-emerald-600" : stats.avgDelta >= -10 ? "text-amber-600" : "text-red-600"
              )}>
                {stats.avgDelta >= 0 ? "+" : ""}{stats.avgDelta}%
              </p>
            </div>
          </div>

          {/* Delayed classes */}
          {delayedClasses.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 w-full text-left hover:opacity-80 transition-opacity">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Lớp đang bị trễ tiến độ ({delayedClasses.length})
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-2 mt-2">
                  {delayedClasses.map(dc => (
                    <button
                      key={dc.classId}
                      onClick={() => navigate(`/classes?search=${encodeURIComponent(dc.className)}`)}
                      className="w-full text-left rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold truncate">{dc.className}</span>
                          {dc.level && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                              {dc.level}
                            </span>
                          )}
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          {dc.delayedStudents}/{dc.totalStudents} học viên trễ
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dc.delayedSessions} buổi trễ
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StatBlock({ icon: Icon, label, value, rate }: {
  icon: any; label: string; value: string; rate: number;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn(
        "text-lg font-bold",
        rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600"
      )}>
        {value}
      </p>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
        <div
          className={cn("h-full rounded-full", rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}
