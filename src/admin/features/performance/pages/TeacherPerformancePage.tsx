import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Users, School, Target, BookOpen, Layers, FileText,
  ChevronRight, AlertTriangle, CheckCircle2, TrendingUp,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import {
  calcStudentProgress,
  calcClassProgress,
  type StudentProgress,
} from "@shared/utils/progressTracking";
import TeacherScorecard from "@admin/features/performance/components/TeacherScorecard";

interface TeacherRow {
  id: string;
  full_name: string;
  linked_user_id: string | null;
  classCount: number;
  studentCount: number;
  avgSessionCompletion: number;
  avgExerciseCompletion: number;
  avgTestCompletion: number;
  avgOverallScore: number | null;
  delayedStudents: number;
  completedStudents: number;
}

export function TeacherPerformanceContent() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [allLinkedUserIds, setAllLinkedUserIds] = useState<string[]>([]);
  const [allTeachngoIds, setAllTeachngoIds] = useState<string[]>([]);
  const [allClassIds, setAllClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch all teachers
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, full_name, linked_user_id, email")
      .order("full_name");

    if (!teachersData || teachersData.length === 0) {
      setTeachers([]);
      setLoading(false);
      return;
    }

    // Fetch all classes with teacher assignment
    const { data: classes } = await (supabase as any)
      .from("classes")
      .select("id, class_name, teacher_id")
      .not("teacher_id", "is", null);

    // Fetch all enrollments
    const classIds = ((classes || []) as any[]).map(c => c.id);
    const { data: enrollments } = await (supabase as any)
      .from("class_students")
      .select("class_id, teachngo_student_id")
      .in("class_id", classIds.length > 0 ? classIds : ["__none__"]);

    // Fetch all students
    const teachngoIds = [...new Set(((enrollments || []) as any[]).map(e => e.teachngo_student_id))] as string[];
    const { data: students } = await (supabase as any)
      .from("synced_students")
      .select("teachngo_id, linked_user_id")
      .in("teachngo_id", teachngoIds.length > 0 ? teachngoIds : ["__none__"]);

    const linkedStudents = ((students || []) as any[]).filter(s => s.linked_user_id);
    const linkedUserIds = linkedStudents.map(s => s.linked_user_id!);

    // Fetch all plans
    const { data: plans } = await supabase
      .from("study_plans")
      .select("id, current_score, teachngo_student_id, class_ids, student_ids");

    const planIds = (plans || []).map(p => p.id);

    // Fetch entries, test results, practice results
    const [{ data: entries }, { data: testResults }, { data: practiceResults }] = await Promise.all([
      supabase.from("study_plan_entries").select("plan_id, entry_date, plan_status, exercise_ids, assessment_ids").in("plan_id", planIds.length > 0 ? planIds : ["__none__"]),
      supabase.from("test_results").select("user_id, section_type, score, created_at, assessment_id").in("user_id", linkedUserIds.length > 0 ? linkedUserIds : ["__none__"]).order("created_at", { ascending: false }),
      supabase.from("practice_results").select("user_id, exercise_id").in("user_id", linkedUserIds.length > 0 ? linkedUserIds : ["__none__"]),
    ]);

    const entriesByPlan: Record<string, any[]> = {};
    for (const e of entries || []) {
      if (!entriesByPlan[e.plan_id]) entriesByPlan[e.plan_id] = [];
      entriesByPlan[e.plan_id].push(e);
    }

    // Build teacher rows
    const teacherRows: TeacherRow[] = [];

    for (const teacher of teachersData) {
      const teacherClasses = ((classes || []) as any[]).filter(c => c.teacher_id === teacher.id);
      const teacherClassIds = teacherClasses.map(c => c.id);
      const teacherEnrollments = ((enrollments || []) as any[]).filter(e => teacherClassIds.includes(e.class_id));
      const teacherStudentIds = [...new Set(teacherEnrollments.map(e => e.teachngo_student_id))] as string[];
      const teacherLinkedStudents = linkedStudents.filter(s => teacherStudentIds.includes(s.teachngo_id));

      const progresses: StudentProgress[] = [];
      let delayedCount = 0;
      let completedCount = 0;

      for (const student of teacherLinkedStudents) {
        const uid = student.linked_user_id!;
        const tid = student.teachngo_id;

        const studentPlans = (plans || []).filter((p: any) => {
          if (p.teachngo_student_id === tid) return true;
          const sids = Array.isArray(p.student_ids) ? p.student_ids : [];
          if (sids.includes(tid)) return true;
          const cids = Array.isArray(p.class_ids) ? p.class_ids : [];
          return cids.some((cid: string) => teacherClassIds.includes(cid));
        });

        if (studentPlans.length === 0) continue;

        const allEntries = studentPlans.flatMap((p: any) => entriesByPlan[p.id] || []);
        const userTests = (testResults || []).filter((r: any) => r.user_id === uid);
        const userPracticeIds = [...new Set((practiceResults || []).filter((r: any) => r.user_id === uid).map((r: any) => r.exercise_id))];
        const userTestIds = [...new Set(userTests.map((r: any) => r.assessment_id))];

        const manual = studentPlans[0]?.current_score as Record<string, number | null> | null;
        const hasManual = manual && typeof manual === "object" && Object.values(manual).some(v => v != null && v !== 0);

        const p = calcStudentProgress(allEntries, userPracticeIds, userTestIds, hasManual ? manual : null, userTests);
        progresses.push(p);

        if (p.overallStatus === "delayed") delayedCount++;
        if (p.overallStatus === "completed") completedCount++;
      }

      const agg = calcClassProgress(progresses);

      teacherRows.push({
        id: teacher.id,
        full_name: teacher.full_name,
        linked_user_id: teacher.linked_user_id,
        classCount: teacherClasses.length,
        studentCount: teacherStudentIds.length,
        ...agg,
        delayedStudents: delayedCount,
        completedStudents: completedCount,
      });
    }

    setTeachers(teacherRows);
    setAllLinkedUserIds(linkedUserIds);
    setAllTeachngoIds(teachngoIds as string[]);
    setAllClassIds(classIds as string[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Overall summary
  const totalClasses = teachers.reduce((s, t) => s + t.classCount, 0);
  const totalStudents = teachers.reduce((s, t) => s + t.studentCount, 0);
  const totalDelayed = teachers.reduce((s, t) => s + t.delayedStudents, 0);
  const totalCompleted = teachers.reduce((s, t) => s + t.completedStudents, 0);
  const teachersWithStudents = teachers.filter(t => t.studentCount > 0);
  const avgSession = teachersWithStudents.length > 0
    ? Math.round(teachersWithStudents.reduce((s, t) => s + t.avgSessionCompletion, 0) / teachersWithStudents.length)
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold">Hiệu suất giảng viên</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Theo dõi tiến độ lớp học và học viên theo từng giảng viên
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard icon={Users} label="Giáo viên" value={teachers.length} />
        <SummaryCard icon={School} label="Lớp học" value={totalClasses} />
        <SummaryCard icon={Users} label="Học viên" value={totalStudents} />
        <SummaryCard icon={CheckCircle2} label="Hoàn thành" value={totalCompleted} color="text-emerald-600" />
        <SummaryCard icon={AlertTriangle} label="Chậm tiến độ" value={totalDelayed} color="text-amber-600" />
      </div>

      {/* Teacher Scorecard */}
      <TeacherScorecard
        linkedUserIds={allLinkedUserIds}
        teachngoStudentIds={allTeachngoIds}
        classIds={allClassIds}
      />

      {/* Teacher list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium">Giáo viên</th>
              <th className="text-center px-2 py-3 font-medium w-16">Lớp</th>
              <th className="text-center px-2 py-3 font-medium w-16">HV</th>
              <th className="text-center px-2 py-3 font-medium w-20">
                <div className="flex items-center justify-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>Buổi</span>
                </div>
              </th>
              <th className="text-center px-2 py-3 font-medium w-20">
                <div className="flex items-center justify-center gap-1">
                  <Layers className="h-3 w-3" />
                  <span>BT</span>
                </div>
              </th>
              <th className="text-center px-2 py-3 font-medium w-20">
                <div className="flex items-center justify-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Thi</span>
                </div>
              </th>
              <th className="text-center px-2 py-3 font-medium w-16">Điểm</th>
              <th className="text-center px-2 py-3 font-medium w-20">Trạng thái</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr
                key={t.id}
                className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => {
                  if (t.linked_user_id) {
                    navigate(`/users/${t.linked_user_id}/performance`);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{t.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.classCount} lớp · {t.studentCount} học viên
                  </p>
                </td>
                <td className="text-center px-2 py-3 font-semibold">{t.classCount}</td>
                <td className="text-center px-2 py-3">{t.studentCount}</td>
                <td className="text-center px-2 py-3">
                  <RateBadge rate={t.avgSessionCompletion} />
                </td>
                <td className="text-center px-2 py-3">
                  <RateBadge rate={t.avgExerciseCompletion} />
                </td>
                <td className="text-center px-2 py-3">
                  <RateBadge rate={t.avgTestCompletion} />
                </td>
                <td className="text-center px-2 py-3 font-bold text-primary">
                  {t.avgOverallScore ?? "—"}
                </td>
                <td className="text-center px-2 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {t.delayedStudents > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        {t.delayedStudents}⏱
                      </span>
                    )}
                    {t.completedStudents > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {t.completedStudents}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TeacherPerformancePage() {
  return <TeacherPerformanceContent />;
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number; color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10", color || "text-primary")}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  return (
    <span className={cn(
      "text-xs font-bold px-2 py-0.5 rounded-full",
      rate >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
      rate >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
      rate > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
      "bg-muted text-muted-foreground"
    )}>
      {rate}%
    </span>
  );
}
