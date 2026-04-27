import { Activity, Users, Calendar, Mail, BookOpen, GraduationCap } from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import type { ClassDetail } from "@admin/features/classes/components/ClassInfoCard";

/**
 * Tab "Tổng quan" — KPI cards + quick links từ v_class_full.
 * Áp dụng cho cả admin và teacher (teacher truyền `mode="teacher"` để ẩn
 * card lifecycle / pending invitations).
 */
export function OverviewTab({
  cls,
  mode = "admin",
}: {
  cls: ClassDetail;
  mode?: "admin" | "teacher";
}) {
  const studentCount = cls.active_student_count ?? cls.student_count ?? 0;
  const studentCap = cls.max_students ?? 0;
  const studentPct = studentCap > 0 ? Math.min(100, (studentCount / studentCap) * 100) : null;

  const sessionsTotal = cls.sessions_total ?? 0;
  const sessionsDone = cls.sessions_completed ?? 0;
  const sessionsPlanned = cls.study_plan_total_sessions ?? sessionsTotal;
  const sessionsPct =
    sessionsPlanned > 0 ? Math.min(100, (sessionsDone / sessionsPlanned) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Học viên"
          value={`${studentCount}${studentCap ? ` / ${studentCap}` : ""}`}
          progress={studentPct}
          subtext={
            studentCap
              ? studentPct! >= 100
                ? "Đã đầy lớp"
                : `${Math.round(100 - studentPct!)}% còn trống`
              : undefined
          }
        />
        <KpiCard
          icon={Calendar}
          label="Buổi học"
          value={`${sessionsDone} / ${sessionsPlanned}`}
          progress={sessionsPct}
          subtext={
            (cls.sessions_upcoming ?? 0) > 0
              ? `${cls.sessions_upcoming} buổi sắp tới`
              : "Chưa có buổi sắp tới"
          }
        />
        <KpiCard
          icon={BookOpen}
          label="Study plan"
          value={cls.study_plan_name ?? "Chưa gắn"}
          subtext={
            cls.study_plan_total_sessions
              ? `${cls.study_plan_total_sessions} buổi tổng`
              : "—"
          }
        />
        {mode === "admin" && (
          <KpiCard
            icon={Mail}
            label="Lời mời chờ"
            value={String(cls.pending_invitations ?? 0)}
            subtext={
              (cls.pending_invitations ?? 0) > 0
                ? "Có GV chưa phản hồi"
                : "Không có"
            }
          />
        )}
      </div>

      {/* Course inheritance card */}
      {cls.course_id && cls.course_name && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Khoá học gốc</p>
              <p className="text-sm font-semibold text-primary">{cls.course_name}</p>
              <div className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-3 text-xs">
                {cls.course_price_vnd != null && (
                  <MiniRow label="Giá khoá" value={cls.course_price_vnd.toLocaleString("vi-VN") + "₫"} />
                )}
                {mode === "admin" && cls.price_vnd_override != null && (
                  <MiniRow
                    label="Giá lớp (override)"
                    value={cls.price_vnd_override.toLocaleString("vi-VN") + "₫"}
                    highlight
                  />
                )}
                {mode === "admin" && cls.effective_price_vnd != null && (
                  <MiniRow
                    label="Giá hiệu lực"
                    value={cls.effective_price_vnd.toLocaleString("vi-VN") + "₫"}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Lifecycle banner — admin only */}
      {mode === "admin" && cls.lifecycle_status === "cancelled" && cls.cancellation_reason && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <Activity className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-destructive">Lớp đã huỷ</p>
              <p className="text-muted-foreground">{cls.cancellation_reason}</p>
              {cls.status_changed_at && (
                <p className="text-muted-foreground">
                  {new Date(cls.status_changed_at).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  progress,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  subtext?: string;
  progress?: number | null;
}) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold tabular-nums truncate">{value}</p>
      {progress != null && <Progress value={progress} className="h-1.5" />}
      {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
    </Card>
  );
}

function MiniRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
