import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, FileText, Award, Users, School,
  CalendarDays, UserSearch, Settings, ShieldCheck, BarChart3,
  BookOpen, ClipboardList, Flag, GraduationCap, CalendarCheck,
  FileSignature, CalendarClock, Banknote, FileBadge,
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
  { id: "tests",        label: "Ngân hàng đề",      icon: FileText,        route: "/tests",                      group: "academic", order: 1 },
  { id: "flashcards",   label: "Flashcard",         icon: BookOpen,        route: "/flashcards",                 group: "academic", order: 2 },
  { id: "study-plans",  label: "Study Plans",       icon: ClipboardList,   route: "/study-plans",                group: "academic", order: 3 },
  { id: "badges",       label: "Huy hiệu",          icon: Award,           route: "/badges",                     group: "academic", order: 4 },

  // ─── Lớp & Lịch ───
  { id: "schedule",     label: "Lịch học",          icon: CalendarDays,    route: "/schedule",                   group: "classes",  order: 10 },
  { id: "classes",      label: "Lớp học",           icon: School,          route: "/classes",                    group: "classes",  order: 11 },
  { id: "placement",    label: "Sắp lớp",           icon: UserSearch,      route: "/placement",                  group: "classes",  order: 12 },
  { id: "attendance",   label: "Điểm danh",         icon: CalendarCheck,   route: "/attendance",                 group: "classes",  order: 13 },
  { id: "availability-drafts", label: "Duyệt lịch rảnh", icon: CalendarCheck, route: "/availability-drafts",     group: "classes",  order: 14 },

  // ─── Người dùng ───
  { id: "users",        label: "Học viên",          icon: Users,           route: "/users",                      group: "users",    order: 20 },
  { id: "teachers",     label: "Giáo viên",         icon: GraduationCap,   route: "/teachers",                   group: "users",    order: 21 },
  { id: "permissions",  label: "Phân quyền",        icon: ShieldCheck,     route: "/modules",                    group: "users",    superAdminOnly: true, order: 22 },

  // ─── Hành chính ───
  { id: "contracts",    label: "Hợp đồng",          icon: FileSignature,   route: "/contracts",                  group: "hr",       order: 30 },
  { id: "contract-templates", label: "Mẫu hợp đồng", icon: FileBadge,      route: "/contracts/templates",        group: "hr",       superAdminOnly: true, order: 30.5 },
  { id: "timesheet",    label: "Bảng công",         icon: CalendarClock,   route: "/timesheet",                  group: "hr",       order: 31 },
  { id: "payroll",      label: "Bảng lương",        icon: Banknote,        route: "/payroll",                    group: "hr",       order: 32 },

  // ─── Hệ thống (super_admin) ───
  { id: "feature-flags", label: "Feature Flags",    icon: Flag,            route: "/feature-flags",  group: "system", superAdminOnly: true, order: 41 },
  { id: "settings",     label: "Cài đặt",           icon: Settings,        route: "/settings",       group: "system", superAdminOnly: true, order: 42 },
];
