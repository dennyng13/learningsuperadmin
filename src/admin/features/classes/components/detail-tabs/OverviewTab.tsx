import { Activity, Users, Calendar, Mail, BookOpen, GraduationCap, Wallet, Banknote, Loader2, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import type { ClassDetail } from "@admin/features/classes/components/ClassInfoCard";
import { formatDateTimeDDMMYYYY, formatDateDDMMYYYY } from "@shared/utils/dateFormat";
import {
  ClassHealthSnapshot,
  NextSessionCard,
  AttendanceHeatmap,
  PerformanceChart,
  RosterPreview,
  PinnedAnnouncement,
  RisksPanel,
} from "./overview";

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

      {/* ═══ NEW: Class Health Snapshot (mockup pattern) ═══ */}
      {mode === "admin" && <ClassHealthSnapshot />}

      {/* ═══ NEW: Next Session Card (mockup pattern) ═══ */}
      {mode === "admin" && <NextSessionCard />}

      {/* ═══ Main content grid (2-col layout per mockup) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Curriculum strip — visual timeline of buổi học per mockup
         pages-class-detail "Lộ trình 18 buổi" track. Status-colored dots,
         next session has pulse. Click → navigate /classes/:id?tab=sessions. */}
          <CurriculumStrip classId={cls.id} totalPlanned={cls.study_plan_total_sessions ?? 0} />

          {/* ═══ NEW: Attendance Heatmap (mockup pattern) ═══ */}
          <AttendanceHeatmap classId={cls.id} />

          {/* ═══ NEW: Performance Chart (mockup pattern) ═══ */}
          <PerformanceChart />
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-4">
          {/* ═══ NEW: Roster Preview (mockup pattern) ═══ */}
          <RosterPreview onViewAll={() => {}} onSelectStudent={() => {}} />

          {/* ═══ NEW: Pinned Announcement (mockup pattern) ═══ */}
          <PinnedAnnouncement />

          {/* ═══ NEW: Risks Panel (mockup pattern) ═══ */}
          <RisksPanel />
        </div>
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

/* ─── Curriculum strip — visual session timeline (mockup pattern) ─── */

interface SessionDot {
  id: string;
  session_number: number | null;
  session_date: string;
  status: string;
  start_time: string;
  end_time: string;
}

function CurriculumStrip({ classId, totalPlanned }: { classId: string; totalPlanned: number }) {
  const sessionsQ = useQuery({
    queryKey: ["overview-sessions-strip", classId],
    enabled: !!classId,
    queryFn: async (): Promise<SessionDot[]> => {
      const { data, error } = await (supabase as any)
        .from("class_sessions")
        .select("id, session_number, session_date, status, start_time, end_time")
        .eq("class_id", classId)
        .order("session_number", { ascending: true })
        .order("session_date", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as SessionDot[];
    },
    staleTime: 60_000,
  });

  const sessions = sessionsQ.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  /* Compute next session (first non-done with date >= today, or first
     planned). Used for pulse highlight. */
  const nextSessionId = sessions.find(
    (s) => s.status !== "done" && s.status !== "cancelled" && s.session_date >= today,
  )?.id;

  const doneCount = sessions.filter((s) => s.status === "done").length;
  const totalEffective = totalPlanned > 0 ? totalPlanned : sessions.length;
  const remaining = Math.max(0, totalEffective - doneCount);

  if (sessionsQ.isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang tải lộ trình...
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-4 border-dashed">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          Chưa có buổi học nào được tạo.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-sm font-bold inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-teal-600" />
            Lộ trình {totalEffective} buổi
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Đã hoàn thành <strong className="text-emerald-600">{doneCount}</strong> ·
            Còn <strong className="text-foreground">{remaining}</strong>
          </p>
        </div>
      </div>

      {/* Track */}
      <div className="flex flex-wrap gap-1.5">
        {sessions.map((s) => {
          const isNext = s.id === nextSessionId;
          const isDone = s.status === "done";
          const isCancelled = s.status === "cancelled";
          const isFuture = !isDone && !isCancelled && s.session_date > today;
          const cellColor = isCancelled
            ? "bg-rose-100 text-rose-700 border-rose-300 line-through"
            : isDone
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : isNext
                ? "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-200"
                : isFuture
                  ? "bg-white text-muted-foreground border-muted-foreground/30"
                  : "bg-amber-50 text-amber-700 border-amber-200";
          return (
            <span
              key={s.id}
              className={cn(
                "relative inline-flex items-center justify-center min-w-[32px] h-7 px-1.5 rounded-md border-[1.5px] text-[10px] font-display font-bold tabular-nums transition-all",
                cellColor,
              )}
              title={`Buổi ${s.session_number ?? "?"} · ${formatDateDDMMYYYY(s.session_date)} · ${s.status}`}
            >
              {s.session_number ?? "?"}
              {isNext && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-dashed text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />
          Đã học
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-rose-500 border border-rose-600" />
          Sắp tới
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-200" />
          Đang chờ
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-white border border-muted-foreground/30" />
          Tương lai
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-rose-100 border border-rose-300" />
          Huỷ
        </span>
      </div>
    </Card>
  );
}
