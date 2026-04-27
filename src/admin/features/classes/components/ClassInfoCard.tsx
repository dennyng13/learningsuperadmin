import { Calendar, MapPin, Users, User, BookOpen, Clock, GraduationCap, Wallet } from "lucide-react";
import ClassStatusBadge from "@shared/components/admin/ClassStatusBadge";
import type { ClassLifecycleStatus } from "@shared/components/admin/ClassStatusBadge";

/* Subset of v_class_full columns referenced by detail page. Sử dụng
 * `any`-like typing vì supabase types.ts (read-only) chưa có cột mới sau
 * migration P4a (course_id, price_vnd_override, course_*, ...). */
export interface ClassDetail {
  id: string;
  // legacy column (vẫn còn trong types.ts)
  class_name?: string | null;
  // các cột mới sau migration
  name?: string | null;
  class_code?: string | null;
  lifecycle_status?: ClassLifecycleStatus | null;
  cancellation_reason?: string | null;
  status_changed_at?: string | null;
  program?: string | null;
  level?: string | null;
  branch?: string | null;
  mode?: string | null;
  room?: string | null;
  schedule?: string | null;
  teacher_name?: string | null;
  teacher_name_legacy?: string | null;
  teacher_id?: string | null;
  teacher_full_name?: string | null;
  teacher_avatar_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  default_start_time?: string | null;
  default_end_time?: string | null;
  student_count?: number | null;
  max_students?: number | null;
  data_source?: string | null;
  study_plan_id?: string | null;
  study_plan_name?: string | null;
  study_plan_total_sessions?: number | null;
  description?: string | null;
  class_type?: string | null;
  leaderboard_enabled?: boolean | null;
  // Course inheritance (from v_class_full)
  course_id?: string | null;
  course_name?: string | null;
  course_slug?: string | null;
  course_color_key?: string | null;
  course_icon_key?: string | null;
  course_price_vnd?: number | null;
  price_vnd_override?: number | null;
  effective_price_vnd?: number | null;
  // Counts (from v_class_full)
  active_student_count?: number | null;
  total_student_count?: number | null;
  sessions_total?: number | null;
  sessions_completed?: number | null;
  sessions_upcoming?: number | null;
  pending_invitations?: number | null;
}

function formatVND(amount?: number | null): string | null {
  if (amount == null) return null;
  return amount.toLocaleString("vi-VN") + "₫";
}

export function ClassInfoCard({
  cls,
  showFinancial = true,
}: {
  cls: ClassDetail;
  /** Hiển thị giá lớp + course price (chỉ admin). Default true. */
  showFinancial?: boolean;
}) {
  const period = formatDateRange(cls.start_date, cls.end_date);
  const time =
    cls.default_start_time && cls.default_end_time
      ? `${cls.default_start_time.slice(0, 5)}–${cls.default_end_time.slice(0, 5)}`
      : null;

  const teacherDisplay = cls.teacher_full_name || cls.teacher_name || cls.teacher_name_legacy;
  const studentCount = cls.active_student_count ?? cls.student_count ?? 0;
  const priceDisplay = formatVND(cls.effective_price_vnd ?? cls.price_vnd_override ?? cls.course_price_vnd);

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <ClassStatusBadge
            status={cls.lifecycle_status}
            reason={cls.cancellation_reason}
            size="md"
          />
          {cls.program && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {cls.program}
              {cls.level && <span className="opacity-70"> · {cls.level}</span>}
            </span>
          )}
          {cls.course_id && cls.course_name && (
            <span
              className="inline-flex items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"
              title="Khoá học gốc"
            >
              <GraduationCap className="h-3 w-3" />
              {cls.course_name}
            </span>
          )}
          {cls.mode && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {cls.mode}
            </span>
          )}
          {cls.data_source && (
            <span className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
              {cls.data_source}
            </span>
          )}
        </div>
      </div>

      {cls.description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {cls.description}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
        <InfoRow icon={Calendar} label="Thời gian" value={period} />
        {time && <InfoRow icon={Clock} label="Khung giờ" value={time} />}
        {cls.schedule && <InfoRow icon={Calendar} label="Lịch" value={cls.schedule} />}
        {teacherDisplay && <InfoRow icon={User} label="GV chính" value={teacherDisplay} />}
        {cls.branch && <InfoRow icon={MapPin} label="Cơ sở" value={cls.branch} />}
        {cls.room && <InfoRow icon={MapPin} label="Phòng" value={cls.room} />}
        <InfoRow
          icon={Users}
          label="Học viên"
          value={`${studentCount}${cls.max_students ? ` / ${cls.max_students}` : ""}`}
        />
        {showFinancial && priceDisplay && (
          <InfoRow
            icon={Wallet}
            label={cls.price_vnd_override != null ? "Giá lớp (override)" : "Giá lớp"}
            value={priceDisplay}
          />
        )}
        {cls.study_plan_name && (
          <InfoRow icon={BookOpen} label="Study plan" value={cls.study_plan_name} />
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "—";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `Từ ${fmt(start)}`;
  return `Đến ${fmt(end!)}`;
}
