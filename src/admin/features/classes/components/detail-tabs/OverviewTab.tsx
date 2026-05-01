import { Activity, Users, Calendar, Mail, BookOpen, GraduationCap, Wallet, Banknote, type LucideIcon } from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import type { ClassDetail } from "@admin/features/classes/components/ClassInfoCard";
import { formatDateTimeDDMMYYYY } from "@shared/utils/dateFormat";

function formatVNDCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "T₫";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "Tr₫";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K₫";
  return n.toString() + "₫";
}

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

  /* Doanh thu dự kiến = active enrollments × effective_price_vnd. */
  const effectivePrice = cls.effective_price_vnd ?? cls.course_price_vnd ?? 0;
  const expectedRevenue = effectivePrice * studentCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Học viên"
          value={`${studentCount}${studentCap ? ` / ${studentCap}` : ""}`}
          progress={studentPct}
          tone="blue"
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
          tone="emerald"
          subtext={
            (cls.sessions_upcoming ?? 0) > 0
              ? `${cls.sessions_upcoming} buổi sắp tới`
              : "Chưa có buổi sắp tới"
          }
        />
        {mode === "admin" ? (
          <KpiCard
            icon={Wallet}
            label="Doanh thu dự kiến"
            value={expectedRevenue > 0 ? formatVNDCompact(expectedRevenue) : "—"}
            tone="amber"
            subtext={
              effectivePrice > 0
                ? `${formatVNDCompact(effectivePrice)} × ${studentCount} HV`
                : "Chưa có giá khoá"
            }
          />
        ) : (
          <KpiCard
            icon={BookOpen}
            label="Study plan"
            value={cls.study_plan_name ?? "Chưa gắn"}
            tone="violet"
            subtext={cls.study_plan_total_sessions ? `${cls.study_plan_total_sessions} buổi tổng` : "—"}
          />
        )}
        {mode === "admin" && (
          <KpiCard
            icon={Mail}
            label="Lời mời chờ"
            value={String(cls.pending_invitations ?? 0)}
            tone={(cls.pending_invitations ?? 0) > 0 ? "rose" : "slate"}
            subtext={
              (cls.pending_invitations ?? 0) > 0
                ? "Có GV chưa phản hồi"
                : "Không có"
            }
          />
        )}
      </div>

      {/* Secondary row — chỉ admin: study plan + payroll placeholder */}
      {mode === "admin" && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={BookOpen}
            label="Study plan"
            value={cls.study_plan_name ?? "Chưa gắn"}
            tone="violet"
            subtext={cls.study_plan_total_sessions ? `${cls.study_plan_total_sessions} buổi tổng` : "—"}
          />
          <KpiCard
            icon={Banknote}
            label="Payroll dự kiến"
            value="—"
            tone="slate"
            subtext="Chờ module Payroll"
          />
        </div>
      )}

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
                  {formatDateTimeDDMMYYYY(cls.status_changed_at)}
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
  tone = "slate",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  progress?: number | null;
  tone?: "blue" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
  const toneClasses: Record<string, { bg: string; icon: string; ring: string }> = {
    blue:    { bg: "bg-blue-500/10",    icon: "text-blue-600 dark:text-blue-400",       ring: "ring-blue-500/20" },
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
    amber:   { bg: "bg-amber-500/10",   icon: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20" },
    violet:  { bg: "bg-violet-500/10",  icon: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20" },
    rose:    { bg: "bg-rose-500/10",    icon: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20" },
    slate:   { bg: "bg-muted",          icon: "text-muted-foreground",                  ring: "ring-border" },
  };
  const t = toneClasses[tone] ?? toneClasses.slate;
  return (
    <Card className="p-4 space-y-2.5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${t.bg} ${t.ring}`}>
          <Icon className={`h-3.5 w-3.5 ${t.icon}`} />
        </span>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums truncate">{value}</p>
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
