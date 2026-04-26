import { supabase } from "@/integrations/supabase/client";

/**
 * Schema probing — dò cột trong DB mà không cần RPC introspect.
 *
 * Chiến lược:
 *   • Gửi `select <col> from <table> limit 1` qua PostgREST.
 *   • Nếu trả 200 → cột tồn tại.
 *   • Nếu lỗi với code `42703` (undefined_column) → cột KHÔNG tồn tại.
 *   • Lỗi khác (RLS / network) → coi như "unknown" để tránh báo nhầm.
 *
 * Chỉ cần quyền SELECT thông thường — admin chắc chắn có. Không cần
 * function definer / pg_catalog.
 */

export type ColumnStatus = "present" | "missing" | "unknown";

export interface ColumnProbeResult {
  column: string;
  status: ColumnStatus;
  error?: string;
}

export interface TableProbeResult {
  table: string;
  exists: boolean;
  columns: ColumnProbeResult[];
  error?: string;
}

/** Probe 1 cột — return ColumnStatus. */
async function probeColumn(table: string, column: string): Promise<ColumnProbeResult> {
  const { error } = await (supabase as any).from(table).select(column).limit(1);
  if (!error) return { column, status: "present" };

  // PostgREST forward Postgres error codes — 42703 = undefined column.
  const code = (error as any).code as string | undefined;
  const msg = error.message ?? "";

  if (code === "42703" || /column .* does not exist/i.test(msg)) {
    return { column, status: "missing", error: msg };
  }

  // 42P01 = relation does not exist (table missing) — caller catches separately.
  if (code === "42P01") {
    return { column, status: "unknown", error: "relation_missing" };
  }

  return { column, status: "unknown", error: msg };
}

/** Probe toàn bộ cột kỳ vọng của 1 bảng. */
export async function probeTable(table: string, expectedColumns: string[]): Promise<TableProbeResult> {
  // Bước 1: kiểm tra table có tồn tại không bằng `select 1`.
  const { error: tableErr } = await (supabase as any).from(table).select("*").limit(0);
  if (tableErr && ((tableErr as any).code === "42P01" || /does not exist/i.test(tableErr.message))) {
    return {
      table,
      exists: false,
      columns: expectedColumns.map((c) => ({ column: c, status: "unknown" as const, error: "table_missing" })),
      error: tableErr.message,
    };
  }

  // Bước 2: probe song song từng cột.
  const columns = await Promise.all(expectedColumns.map((c) => probeColumn(table, c)));

  return { table, exists: true, columns };
}

/** Spec mapping cột kỳ vọng → mô tả ngữ nghĩa cho UI. */
export interface ExpectedColumnSpec {
  name: string;
  /** Mô tả nghĩa của cột (UI hiển thị tooltip/description). */
  description: string;
  /** Migration file đã tạo cột này (nếu thiếu → user biết phải apply file nào). */
  migration?: string;
  /** Cột nào FE consume — giúp dev biết ảnh hưởng UI nếu thiếu. */
  usedBy?: string[];
}

export interface ExpectedTableSpec {
  table: string;
  description: string;
  columns: ExpectedColumnSpec[];
}

/**
 * Spec các bảng/cột FE đang dựa vào. Khi thêm migration mới hoặc thay
 * shape table, cập nhật ở đây để Schema Health tự cảnh báo.
 */
export const EXPECTED_SCHEMA: ExpectedTableSpec[] = [
  {
    table: "classes",
    description: "Bảng trung tâm cho mọi class — đồng bộ từ external sync + chỉnh sửa tại admin.",
    columns: [
      { name: "id", description: "Khóa chính", usedBy: ["mọi nơi"] },
      { name: "name", description: "Tên hiển thị mới (sau migration backbone)", migration: "2026-04-26-class-detail-backbone.sql", usedBy: ["ClassesListPage", "AdminClassDetailPage"] },
      { name: "class_name", description: "Tên cũ — fallback khi `name` chưa backfill", usedBy: ["ClassesListPage.displayName()"] },
      { name: "class_code", description: "Mã lớp ngắn", migration: "2026-04-26-class-detail-backbone.sql", usedBy: ["ClassesListPage", "ClassInfoCard"] },
      { name: "branch", description: "Cơ sở vật lý", migration: "2026-04-26-class-detail-backbone.sql", usedBy: ["ClassesListPage MetaTag"] },
      { name: "mode", description: "Hình thức (online/offline/hybrid)", migration: "2026-04-26-class-detail-backbone.sql", usedBy: ["ClassesListPage MetaTag"] },
      { name: "level", description: "Cấp độ (free-text hoặc khớp course_levels.name)", usedBy: ["ClassesListPage LevelChip"] },
      { name: "program", description: "Chương trình (key — khớp programs.key)", usedBy: ["ClassesListPage", "getProgramPalette"] },
      { name: "lifecycle_status", description: "Trạng thái lớp (planning/recruiting/ready/in_progress/completed/cancelled)", migration: "2026-04-26-class-lifecycle-enum.sql", usedBy: ["ClassStatusBadge", "AdminClassDetailPage"] },
      { name: "cancellation_reason", description: "Lý do hủy", migration: "2026-04-26-class-detail-backbone.sql", usedBy: ["AdminClassDetailPage"] },
      { name: "status_changed_at", description: "Thời điểm đổi trạng thái lần cuối", migration: "2026-04-26-class-detail-backbone.sql", usedBy: ["StatusTimeline"] },
      { name: "teacher_id", description: "Giáo viên chính (FK auth.users)", usedBy: ["AdminClassDetailPage", "RequestReplacementTeacher"] },
      { name: "teacher_name", description: "Tên GV cache (free-text từ Teach'n Go)", usedBy: ["AdminClassDetailPage"] },
    ],
  },
  {
    table: "class_teachers",
    description: "Multi-teacher per class (lead/co-teacher/observer).",
    columns: [
      { name: "id", description: "Khóa chính" },
      { name: "class_id", description: "FK classes" },
      { name: "teacher_id", description: "FK auth.users" },
      { name: "role", description: "lead | co | observer", migration: "2026-04-26-class-detail-backbone.sql" },
    ],
  },
  {
    table: "class_sessions",
    description: "Buổi học cụ thể của 1 lớp (Stage B).",
    columns: [
      { name: "id", description: "Khóa chính" },
      { name: "class_id", description: "FK classes" },
      { name: "session_date", description: "Ngày dạy" },
      { name: "start_time", description: "Giờ bắt đầu" },
      { name: "end_time", description: "Giờ kết thúc" },
    ],
  },
  {
    table: "class_enrollments",
    description: "Học viên ↔ lớp.",
    columns: [
      { name: "id", description: "Khóa chính", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "class_id", description: "FK classes", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "student_id", description: "FK auth.users", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "status", description: "active | dropped | completed", migration: "2026-04-26-class-detail-backbone.sql" },
    ],
  },
  {
    table: "class_status_history",
    description: "Audit log lifecycle (1 row mỗi lần đổi status).",
    columns: [
      { name: "id", description: "Khóa chính", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "class_id", description: "FK", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "from_status", description: "Trạng thái cũ", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "to_status", description: "Trạng thái mới", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "changed_at", description: "Thời điểm đổi", migration: "2026-04-26-class-detail-backbone.sql" },
    ],
  },
  {
    table: "class_invitations",
    description: "Lời mời GV vào lớp + withdraw + token.",
    columns: [
      { name: "id", description: "Khóa chính", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "class_id", description: "FK", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "teacher_id", description: "FK auth.users", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "status", description: "pending | accepted | declined | withdrawn", migration: "2026-04-26-class-detail-backbone.sql" },
      { name: "token", description: "Token đăng nhập 1 lần để accept/decline", migration: "2026-04-26-class-detail-backbone.sql" },
    ],
  },
  {
    table: "programs",
    description: "Chương trình học (IELTS/WRE/Customized…) — shared 3 app.",
    columns: [
      { name: "id", description: "Khóa chính" },
      { name: "key", description: "Slug — dùng để khớp class.program" },
      { name: "name", description: "Tên hiển thị" },
      { name: "description", description: "Mô tả ngắn" },
      { name: "long_description", description: "Mô tả chi tiết (markdown)", migration: "2026-04-26-courses-module.sql", usedBy: ["CoursesPage"] },
      { name: "outcomes", description: "Danh sách đầu ra (text[])", migration: "2026-04-26-courses-module.sql", usedBy: ["CoursesPage", "ProgramCard"] },
      { name: "color_key", description: "Tên màu Tailwind" },
      { name: "icon_key", description: "Lucide icon key" },
      { name: "sort_order", description: "Thứ tự hiển thị" },
      { name: "status", description: "active | inactive" },
    ],
  },
  {
    table: "program_levels",
    description: "Liên kết programs ↔ course_levels (many-to-many).",
    columns: [
      { name: "id", description: "Khóa chính", migration: "2026-04-26-courses-module.sql" },
      { name: "program_id", description: "FK programs", migration: "2026-04-26-courses-module.sql" },
      { name: "level_id", description: "FK course_levels", migration: "2026-04-26-courses-module.sql" },
      { name: "sort_order", description: "Thứ tự cấp độ trong program", migration: "2026-04-26-courses-module.sql" },
    ],
  },
  {
    table: "course_levels",
    description: "Danh sách cấp độ toàn hệ (A1/A2/B1…).",
    columns: [
      { name: "id", description: "Khóa chính" },
      { name: "name", description: "Tên cấp độ" },
      { name: "sort_order", description: "Thứ tự" },
      { name: "color_key", description: "Tên màu" },
    ],
  },
];

export async function runFullProbe(): Promise<TableProbeResult[]> {
  return Promise.all(
    EXPECTED_SCHEMA.map((t) => probeTable(t.table, t.columns.map((c) => c.name))),
  );
}