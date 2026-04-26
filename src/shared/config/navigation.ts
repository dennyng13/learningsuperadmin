import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, FileText, Upload, Award, Users, School,
  CalendarDays, UserSearch, Settings, ShieldCheck, BarChart3,
  BookOpen, ClipboardList, Flag, GraduationCap, CalendarCheck,
  FileSignature, CalendarClock,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  end?: boolean;
  order: number;
  /** Group label */
  group: "main" | "hr" | "system";
  /** Only show for super_admin */
  superAdminOnly?: boolean;
}

/* ═══════════════════════════════════════════
   ADMIN PORTAL NAVIGATION
   Đây là Admin Portal thuần — điều khiển 2 app:
   - IELTS Practice (học viên)
   - Teacher's Hub (giáo viên)
   Cả 3 app chia sẻ chung 1 Supabase project.
   ═══════════════════════════════════════════ */
export const adminNavItems: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard, route: "/",                   end: true, group: "main",   order: 0 },
  { id: "schedule",     label: "Lịch học",     icon: CalendarDays,    route: "/schedule",                      group: "main",   order: 1 },
  { id: "tests",        label: "Ngân hàng đề", icon: FileText,        route: "/tests",                         group: "main",   order: 2 },
  { id: "import",       label: "Import",       icon: Upload,          route: "/tests/import",                  group: "main",   order: 3 },
  { id: "flashcards",   label: "Flashcard",    icon: BookOpen,        route: "/flashcards",                    group: "main",   order: 4 },
  { id: "badges",       label: "Huy hiệu",     icon: Award,           route: "/badges",                        group: "main",   order: 5 },
  { id: "users",        label: "Người dùng",   icon: Users,           route: "/users",                         group: "main",   order: 6 },
  { id: "teachers",     label: "Quản lý giáo viên", icon: GraduationCap,   route: "/teachers",                      group: "main",   order: 7 },
  { id: "classes",      label: "Lớp học",      icon: School,          route: "/classes",                       group: "main",   order: 8 },
  { id: "availability-drafts", label: "Duyệt lịch rảnh", icon: CalendarCheck, route: "/availability-drafts",     group: "main",   order: 8.5 },
  { id: "study-plans",  label: "Study Plans",  icon: ClipboardList,   route: "/study-plans",                   group: "main",   order: 9 },
  { id: "placement",    label: "Sắp lớp",      icon: UserSearch,      route: "/placement",                     group: "main",   order: 10 },
  { id: "attendance",   label: "Điểm danh",    icon: CalendarDays,    route: "/attendance",                    group: "main",   order: 11 },
  { id: "contracts",    label: "Hợp đồng",     icon: FileSignature,   route: "/contracts",                     group: "hr",     order: 12 },
  { id: "timesheet",    label: "Bảng công",    icon: CalendarClock,   route: "/timesheet",                     group: "hr",     order: 13 },

  { id: "permissions",  label: "Phân quyền",    icon: ShieldCheck,    route: "/modules",        group: "system", superAdminOnly: true, order: 20 },
  { id: "feature-flags", label: "Feature Flags", icon: Flag,           route: "/feature-flags",  group: "system", superAdminOnly: true, order: 21 },
  { id: "settings",     label: "Cài đặt",       icon: Settings,        route: "/settings",       group: "system", superAdminOnly: true, order: 22 },
];
