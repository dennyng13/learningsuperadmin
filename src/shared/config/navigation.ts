import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Award, Users, School,
  CalendarDays, UserSearch, Settings, ShieldCheck, BarChart3,
  BookOpen, Flag, GraduationCap, CalendarCheck, MapPin,
  FileSignature, Wallet, BookTemplate, Library, Activity,
  ListTodo, ClipboardList, Send, Building2, Wrench,
  Banknote, FolderOpen, Globe, BookOpenCheck,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  end?: boolean;
  order: number;
  /** Group label — 7-section Admin IA + system (super_admin) */
  group:
    | "hub"
    | "people"
    | "study"
    | "center"
    | "teaching"
    | "financial"
    | "documents"
    | "system";
  /** Only show for super_admin */
  superAdminOnly?: boolean;
  /** Extra paths that should also keep this item visually "active" in the sidebar. */
  aliasPaths?: string[];
}

/* ═══════════════════════════════════════════
   ADMIN PORTAL NAVIGATION — 7-section IA (Day 7 restructure)

   Architecture: Super Admin Portal điều khiển 3 surfaces:
     · IELTS Practice (student-facing app)
     · Teacher's Hub (teacher-facing app)
     · Admin Portal (this app)
   Cả 3 dùng chung Supabase backend.

   Sidebar groups follow user Admin Portal IA vision:
     1. hub        — Trang chủ + Việc của tôi
     2. people     — Học viên / Giáo viên / Hợp đồng / Yêu cầu ký
     3. study      — Học liệu / Khóa học / Plans / Lớp / Lịch / Điểm danh
     4. center     — Phòng học / Cơ sở / Bảo trì
     5. teaching   — Hiệu suất giảng dạy
     6. financial  — Doanh thu / Chi phí (lương)
     7. documents  — Tài liệu
     8. system     — (super_admin) Phân quyền / Feature flags / Settings

   Lưu ý chuyển vùng (Day 7 IA refactor):
   - Permissions giữ trong system (super_admin gating).
   - Library aliasPaths không còn `/study-plans` (Plans giờ là item riêng).
   - Trang Import (/tests/import) vẫn không xuất hiện ở sidebar — vào qua nút
     "Import" trong header trang Ngân hàng đề.
   ═══════════════════════════════════════════ */
export const adminNavItems: NavItem[] = [
  // ─── 1. Hub + Tasks ───
  { id: "dashboard", label: "Trang chủ", icon: LayoutDashboard, route: "/", end: true, group: "hub", order: 0 },
  { id: "my-tasks",  label: "Việc của tôi", icon: ListTodo,     route: "/tasks",                  group: "hub", order: 1 },

  // ─── 2. My People ───
  { id: "users",        label: "Học viên",         icon: Users,         route: "/users",     group: "people", order: 10 },
  { id: "teachers",     label: "Giáo viên",        icon: GraduationCap, route: "/teachers",  group: "people", order: 11 },
  { id: "contracts",    label: "Hợp đồng",         icon: FileSignature, route: "/contracts", group: "people", order: 12 },
  { id: "signatures",   label: "Yêu cầu ký kết",   icon: ClipboardList, route: "/signatures", group: "people", order: 13 },

  // ─── 3. Study Management ───
  { id: "programs",     label: "Programs",          icon: Globe,         route: "/courses/programs", group: "study", order: 20 },
  { id: "courses",      label: "Khóa học",          icon: GraduationCap, route: "/courses",          group: "study", order: 21 },
  { id: "library",      label: "Học liệu",          icon: Library,       route: "/library",          group: "study", order: 22,
    aliasPaths: ["/tests", "/flashcards", "/practice"] },
  { id: "study-plans",  label: "Kế hoạch học",      icon: BookOpen,      route: "/study-plans",      group: "study", order: 23 },
  { id: "my-plans",     label: "Plans của tôi",     icon: BookOpenCheck, route: "/my-plans",         group: "study", order: 24 },
  { id: "classes",      label: "Lớp học",           icon: School,        route: "/classes/list",     group: "study", order: 25,
    aliasPaths: ["/classes"] },
  { id: "class-invitations", label: "Lời mời lớp", icon: Send,          route: "/classes/invitations", group: "study", order: 26 },
  { id: "schedule",     label: "Lịch học",          icon: CalendarDays,  route: "/schedule",         group: "study", order: 27 },
  { id: "placement",    label: "Sắp lớp",           icon: UserSearch,    route: "/placement",        group: "study", order: 28 },
  { id: "attendance",   label: "Theo dõi điểm danh", icon: CalendarCheck, route: "/attendance",      group: "study", order: 29,
    aliasPaths: ["/attendance/monitor"] },
  { id: "availability-drafts", label: "Duyệt lịch rảnh", icon: CalendarCheck, route: "/availability-drafts", group: "study", order: 30 },
  { id: "band-descriptors", label: "Band Descriptor", icon: BookOpen,    route: "/band-descriptors", group: "study", order: 31 },
  { id: "feedback-templates", label: "Mẫu nhận xét", icon: BookTemplate, route: "/feedback-templates", group: "study", order: 32 },
  { id: "badges",       label: "Huy hiệu",          icon: Award,         route: "/badges",           group: "study", order: 33 },

  // ─── 4. Center Management ───
  { id: "rooms",        label: "Phòng học",         icon: MapPin,        route: "/rooms",       group: "center", order: 40 },
  { id: "facility",     label: "Cơ sở vật chất",    icon: Building2,     route: "/facility",    group: "center", order: 41 },
  { id: "maintenance",  label: "Bảo trì",           icon: Wrench,        route: "/maintenance", group: "center", order: 42 },

  // ─── 5. Teaching Management ───
  { id: "teaching-performance", label: "Hiệu suất giảng dạy", icon: BarChart3, route: "/teachers/performance", group: "teaching", order: 50 },

  // ─── 6. Financial Management ───
  { id: "revenue",      label: "Doanh thu",         icon: Banknote,      route: "/revenue",     group: "financial", order: 60 },
  { id: "compensation", label: "Lương / Thưởng",    icon: Wallet,        route: "/compensation", group: "financial", order: 61 },

  // ─── 7. Documents Management ───
  { id: "documents",    label: "Tài liệu",          icon: FolderOpen,    route: "/documents",   group: "documents", order: 70 },

  // ─── 8. System (super_admin) ───
  { id: "permissions",   label: "Phân quyền",      icon: ShieldCheck, route: "/permissions",   group: "system", superAdminOnly: true, order: 80 },
  { id: "feature-flags", label: "Feature Flags",   icon: Flag,        route: "/feature-flags", group: "system", superAdminOnly: true, order: 81 },
  { id: "schema-health", label: "Schema Health",   icon: Activity,    route: "/schema-health", group: "system", superAdminOnly: true, order: 82 },
  { id: "settings",      label: "Cài đặt",         icon: Settings,    route: "/settings",      group: "system", superAdminOnly: true, order: 83 },
];

/* ═══════════════════════════════════════════
   TOP-LEVEL ROUTES — không hiển thị nút "Quay lại" trong PageHeader.
   Hiện chỉ có dashboard `/` được coi là top-level. MỌI route khác —
   kể cả các entry-point trong sidebar như `/library`, `/users`,
   `/classes/list` — đều hiện nút back để user dễ quay lại
   dashboard hoặc trang trước đó (qua `navigate(-1)`).
   ═══════════════════════════════════════════ */
export const TOP_LEVEL_ADMIN_ROUTES: ReadonlySet<string> = new Set(["/"]);

/** True nếu pathname trùng KHỚP CHÍNH XÁC một top-level route. */
export function isTopLevelAdminRoute(pathname: string): boolean {
  // Bỏ trailing slash (trừ root "/").
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return TOP_LEVEL_ADMIN_ROUTES.has(p);
}
