/**
 * CourseGradeView — Single source of truth via get_student_course_grade RPC.
 * Shows the 40/40/20 formula breakdown per class with selectable class picker.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentCourseGrade } from "@shared/hooks/usePerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Loader2, GraduationCap, Calendar, BookOpen, CheckCircle2, ClipboardCheck } from "lucide-react";
import { getPerformanceLabel } from "@shared/utils/performance";
import { cn } from "@shared/lib/utils";

interface ClassOption {
  id: string;
  class_name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
}

export default function CourseGradeView({ userId }: { userId: string }) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingClasses(true);
      // Find student's teachngo_id
      const { data: ts } = await supabase
        .from("synced_students" as any)
        .select("teachngo_id")
        .eq("linked_user_id", userId)
        .maybeSingle() as any;
      if (!ts?.teachngo_id) { setLoadingClasses(false); return; }

      const { data: enrolls } = await supabase
        .from("class_students")
        .select("class_id, class:classes(id, class_name, status, start_date, end_date)")
        .eq("teachngo_student_id", ts.teachngo_id) as any;

      const list: ClassOption[] = (enrolls || [])
        .map((e: any) => e.class)
        .filter(Boolean)
        // Active first
        .sort((a: any, b: any) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (b.status === "active" && a.status !== "active") return 1;
          return (b.start_date || "").localeCompare(a.start_date || "");
        });
      setClasses(list);
      setSelectedClassId(list[0]?.id ?? null);
      setLoadingClasses(false);
    })();
  }, [userId]);

  const { data, isLoading } = useStudentCourseGrade(userId, selectedClassId);

  if (loadingClasses) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Học viên chưa được gán lớp nào.
        </CardContent>
      </Card>
    );
  }

  const perf = getPerformanceLabel(data?.course_grade ?? null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <GraduationCap className="h-5 w-5 text-primary" />
        <Select value={selectedClassId ?? ""} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Chọn lớp" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.class_name} {c.status === "active" && <span className="text-emerald-600">●</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}

      {data && (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Điểm tổng kết khoá</p>
                  <p className="text-4xl font-extrabold">
                    {data.course_grade != null ? data.course_grade.toFixed(1) : "—"}
                    <span className="text-sm text-muted-foreground font-normal">/100</span>
                  </p>
                  <Badge variant="outline" className={cn("mt-1 text-[10px]", perf.color, perf.bg, "border-0")}>
                    {perf.label}
                  </Badge>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" /> Khoá học</p>
                  <p className="font-medium">
                    {new Date(data.period_start).toLocaleDateString("vi-VN")} — {new Date(data.period_end).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mb-3">
                Công thức: <span className="font-mono">40% Bài thi cuối + 40% Bài tập + 20% Điểm danh</span>
              </p>

              <div className="grid grid-cols-3 gap-3">
                <BreakdownCard
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  label="Bài thi cuối"
                  value={data.final_exam_score != null ? `${data.final_exam_score.toFixed(1)}/100` : "Chưa có"}
                  weight="40%"
                  color="text-primary bg-primary/10"
                />
                <BreakdownCard
                  icon={<BookOpen className="h-4 w-4" />}
                  label="TB bài tập"
                  value={`${data.exercise_avg.toFixed(1)}/100`}
                  weight="40%"
                  color="text-violet-600 bg-violet-100 dark:bg-violet-950/40"
                  hint={`${data.breakdown.exercises_count} bài`}
                />
                <BreakdownCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Điểm danh"
                  value={`${Math.round(data.attendance_rate)}%`}
                  weight="20%"
                  color="text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40"
                  hint={`${data.breakdown.attended_count}/${data.breakdown.total_sessions} buổi`}
                />
              </div>
            </CardContent>
          </Card>

          {data.final_exam_score == null && (
            <p className="text-xs text-muted-foreground text-center">
               Bài thi cuối tự động lấy từ kết quả thi mới nhất trong giai đoạn lớp. Chưa có bài thi nào.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownCard({
  icon, label, value, weight, color, hint,
}: { icon: React.ReactNode; label: string; value: string; weight: string; color: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between mb-1">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", color)}>{icon}</div>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{weight}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
      <p className="text-base font-bold leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
