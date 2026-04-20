import type { LucideIcon } from "lucide-react";
import {
  Home, GraduationCap, Dumbbell, ClipboardList, BookOpen, BarChart3,
  LayoutDashboard, FileText, Upload, Award, Users, School,
  CalendarDays, UserSearch, Settings, ShieldCheck,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  end?: boolean;
  moduleKey?: string;
  showInBottomNav?: boolean;
  showInTopNav?: boolean;
  showInHub?: boolean;
  order: number;
  /** Only for admin: group label */
  group?: "main" | "system";
  /** Only show for super_admin */
  superAdminOnly?: boolean;
}

/* ═══════════════════════════════════════════
   MEMBER PORTAL
   ═══════════════════════════════════════════ */
export const memberNavItems: NavItem[] = [
  { id: "home", label: "Trang chủ", icon: Home, route: "/", end: true, showInBottomNav: true, showInTopNav: true, order: 0 },
  { id: "practice", label: "Luyện tập", icon: Dumbbell, route: "/practice", showInBottomNav: true, showInTopNav: true, moduleKey: "practice", order: 1 },
  { id: "vocab", label: "Từ vựng", icon: BookOpen, route: "/vocabulary", showInBottomNav: true, showInTopNav: true, moduleKey: "vocabulary", order: 2 },
  { id: "plan", label: "Lớp của tôi", icon: School, route: "/study-plan", showInBottomNav: true, showInTopNav: true, moduleKey: "study-plan", order: 3 },
  { id: "study", label: "Chinh phục", icon: GraduationCap, route: "/mock-tests", showInBottomNav: false, showInTopNav: true, order: 4 },
  { id: "improve", label: "Cải thiện", icon: BarChart3, route: "/improve", showInBottomNav: false, showInTopNav: true, order: 5 },
  { id: "error-journal", label: "Sổ lỗi", icon: ClipboardList, route: "/error-journal", showInBottomNav: false, showInTopNav: false, showInHub: true, moduleKey: "error-journal", order: 6 },
];

/* ═══════════════════════════════════════════
   ADMIN PORTAL — "Đề thi" and "Bài tập" are unified under "Ngân hàng đề"
   ═══════════════════════════════════════════ */
export const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/admin", end: true, group: "main", order: 0 },
  { id: "schedule", label: "Lịch học", icon: CalendarDays, route: "/admin/schedule", group: "main", order: 1 },
  { id: "tests", label: "Ngân hàng đề", icon: FileText, route: "/admin/tests", group: "main", order: 2 },
  { id: "import", label: "Import", icon: Upload, route: "/admin/import", group: "main", order: 2 },
  { id: "flashcards", label: "Flashcard", icon: BookOpen, route: "/admin/flashcards", group: "main", order: 3 },
  { id: "badges", label: "Huy hiệu", icon: Award, route: "/admin/badges", group: "main", order: 5 },
  { id: "users", label: "Người dùng", icon: Users, route: "/admin/users", group: "main", order: 6 },
  { id: "classes", label: "Lớp học", icon: School, route: "/admin/classes", group: "main", order: 7 },
  { id: "study-plans", label: "Study Plans", icon: ClipboardList, route: "/admin/study-plans", group: "main", order: 8 },
  { id: "placement", label: "Sắp lớp", icon: UserSearch, route: "/admin/placement", group: "main", order: 9 },
  { id: "teacher-perf", label: "Hiệu suất GV", icon: BarChart3, route: "/admin/teacher-performance", group: "main", order: 10 },
  { id: "attendance", label: "Điểm danh", icon: CalendarDays, route: "/admin/teachngo-attendance", group: "main", order: 11 },
  // Teacher Portal đã tách sang Teacher's Hub — bỏ link nội bộ.
  { id: "permissions", label: "Phân quyền", icon: ShieldCheck, route: "/admin/modules", group: "system", superAdminOnly: true, order: 13 },
  { id: "settings", label: "Cài đặt", icon: Settings, route: "/admin/settings", group: "system", superAdminOnly: true, order: 14 },
];

// Teacher Portal navigation đã được tách sang project Teacher's Hub.
