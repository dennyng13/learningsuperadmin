import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, FileText, Award, Users, School,
  CalendarDays, UserSearch, Settings, ShieldCheck, BarChart3,
  BookOpen, ClipboardList, Flag, GraduationCap, CalendarCheck,
  FileSignature, FileBadge, Wallet, BookTemplate, Library, Activity,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  end?: boolean;
  order: number;
  /** Group label */
  group: "academic" | "classes" | "users" | "hr" | "system";
  /** Only show for super_admin */
  superAdminOnly?: boolean;
  /** Extra paths that should also keep this item visually "active" in the sidebar. */
  aliasPaths?: string[];
}

/* ═══════════════════════════════════════════
   ADMIN PORTAL NAVIGATION
   Đây là Admin Portal thuần — điều khiển 2 app:
   - IELTS Practice (học viên)
   - Teacher's Hub (giáo viên)
   Cả 3 app chia sẻ chung 1 Supabase project.
   Nav được nhóm theo 5 domain:
     · academic — nội dung học thuật (đề/flashcard/study plan/huy hiệu)
     · classes  — vận hành lớp & lịch (lịch/lớp/sắp lớp/điểm danh/duyệt lịch)
     · users    — quản lý con người (học viên/giáo viên)
     · hr       — nhân sự (hợp đồng/bảng công/bảng lương)
     · system   — cấu hình hệ thống (super-admin)
   Lưu ý: trang Import (/tests/import) không xuất hiện ở sidebar nữa —
   truy cập qua nút "Import" trong header trang Ngân hàng đề.
   ═══════════════════════════════════════════ */
export const adminNavItems: NavItem[] = [
  // ─── Tổng quan (luôn nằm đầu, cùng group academic để hiện trên cùng) ───
  { id: "dashboard",    label: "Dashboard",         icon: LayoutDashboard, route: "/",                end: true, group: "academic", order: 0 },

  // ─── Học thuật ───
  { id: "library",      label: "Quản lý học liệu",  icon: Library,         route: "/library",                    group: "academic", order: 1,
    aliasPaths: ["/tests", "/flashcards", "/study-plans", "/practice"] },
  { id: "courses",      label: "Quản lý khóa học",  icon: GraduationCap,   route: "/courses",                    group: "academic", order: 2 },
  { id: "badges",       label: "Huy hiệu",          icon: Award,           route: "/badges",                     group: "academic", order: 4 },
  { id: "band-descriptors", label: "Band Descriptor", icon: BookOpen,      route: "/band-descriptors",           group: "academic", order: 5 },
  { id: "feedback-templates", label: "Mẫu nhận xét", icon: BookTemplate,   route: "/feedback-templates",         group: "academic", order: 6 },

  // ─── Lớp & Lịch ───
  { id: "schedule",     label: "Lịch học",          icon: CalendarDays,    route: "/schedule",                   group: "classes",  order: 10 },
  { id: "classes",      label: "Lớp học",           icon: School,          route: "/classes/list",               group: "classes",  order: 11,
    aliasPaths: ["/classes"] },
  { id: "placement",    label: "Sắp lớp",           icon: UserSearch,      route: "/placement",                  group: "classes",  order: 12 },
  { id: "attendance",   label: "Theo dõi điểm danh", icon: CalendarCheck,   route: "/attendance",                 group: "classes",  order: 13,
    aliasPaths: ["/attendance/monitor"] },
  { id: "availability-drafts", label: "Duyệt lịch rảnh", icon: CalendarCheck, route: "/availability-drafts",     group: "classes",  order: 14 },

  // ─── Người dùng ───
  { id: "users",        label: "Học viên",          icon: Users,           route: "/users",                      group: "users",    order: 20 },
  { id: "teachers",     label: "Giáo viên",         icon: GraduationCap,   route: "/teachers",                   group: "users",    order: 21 },
  { id: "permissions",  label: "Phân quyền",        icon: ShieldCheck,     route: "/permissions",                group: "users",    superAdminOnly: true, order: 22 },

  // ─── Hành chính ───
  { id: "contracts",    label: "Hợp đồng",          icon: FileSignature,   route: "/contracts",                  group: "hr",       order: 30 },
  { id: "contract-templates", label: "Mẫu hợp đồng", icon: FileBadge,      route: "/contracts/templates",        group: "hr",       superAdminOnly: true, order: 30.5 },
  { id: "compensation", label: "Lương / Thưởng",    icon: Wallet,          route: "/compensation",               group: "hr",       order: 31 },

  // ─── Hệ thống (super_admin) ───
  { id: "feature-flags", label: "Feature Flags",    icon: Flag,            route: "/feature-flags",  group: "system", superAdminOnly: true, order: 41 },
  { id: "schema-health", label: "Schema Health",    icon: Activity,        route: "/schema-health",  group: "system", superAdminOnly: true, order: 41.5 },
  { id: "settings",     label: "Cài đặt",           icon: Settings,        route: "/settings",       group: "system", superAdminOnly: true, order: 42 },
];

/* ═══════════════════════════════════════════
   TOP-LEVEL ROUTES — không hiển thị nút "Quay lại" trong PageHeader.
   Hiện chỉ có dashboard `/` được coi là top-level. MỌI route khác —
   kể cả các entry-point trong sidebar như `/library`, `/tests`,
   `/users`, `/classes/list` — đều hiện nút back để user dễ quay lại
   dashboard hoặc trang trước đó (qua `navigate(-1)`).
   ═══════════════════════════════════════════ */
export const TOP_LEVEL_ADMIN_ROUTES: ReadonlySet<string> = new Set(["/"]);

/** True nếu pathname trùng KHỚP CHÍNH XÁC một top-level route. */
export function isTopLevelAdminRoute(pathname: string): boolean {
  // Bỏ trailing slash (trừ root "/").
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return TOP_LEVEL_ADMIN_ROUTES.has(p);
}
