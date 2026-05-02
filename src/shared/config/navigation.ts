import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Award, Users, School,
  CalendarDays, UserSearch, Settings, ShieldCheck, BarChart3,
  BookOpen, Flag, GraduationCap, CalendarCheck, MapPin,
  FileSignature, Wallet, BookTemplate, Library, Activity,
  ListTodo, ClipboardSignature, Send, Building2, Wrench,
  Banknote, FolderOpen, Globe, BookOpenCheck, Receipt,
  PlusSquare, BookCopy, Telescope, MessagesSquare, ReceiptText,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  end?: boolean;
  order: number;
  /** Group label — 7-section Admin IA + system (super_admin) + review bucket */
  group:
    | "hub"
    | "people"
    | "study"
    | "center"
    | "teaching"
    | "financial"
    | "documents"
    | "system"
    | "review";
  /** Optional sub-header within a group ("Programs and Courses", "Classes
   *  management", etc). Items với cùng `subheader` được nhóm lại dưới label
   *  nhỏ trong sidebar. */
  subheader?: string;
  /** True for items đang trong "Đang xem xét" — vẫn functional nhưng UI muted
   *  + hiển thị ở section bottom riêng. */
  underReview?: boolean;
  /** Only show for super_admin */
  superAdminOnly?: boolean;
  /** Extra paths that should also keep this item visually "active" in the sidebar. */
  aliasPaths?: string[];
}

/* ═══════════════════════════════════════════
   ADMIN PORTAL NAVIGATION — Day 7 IA full overhaul

   User Admin Portal IA (3-portal architecture):
     1. Hub + My Tasks
     2. My People         (Students + Teachers)
     3. Study Management  (Programs/Courses + Classes)
     4. Center Management (Facility + Maintenance)
     5. Teaching Mgmt     (Performance)
     6. Financial Mgmt    (Revenue + Expenses)
     7. Documents Mgmt
   + system  (super_admin tooling)
   + review  ("Đang xem xét" — modules dư, không xoá để admin review)

   Per user direction "những module nào dư thì không xoá mà tạm để ở dưới":
   modules ngoài IA scope (Library hub + tests/flashcards/badges, Placement,
   Attendance, Availability drafts, MyPlans, Rooms, Band, Feedback templates)
   được mark `underReview: true` và render ở section bottom với muted styling.
   ═══════════════════════════════════════════ */
export const adminNavItems: NavItem[] = [
  // ═══ 1. Hub + My Tasks ═══
  { id: "dashboard", label: "Trang chủ", icon: LayoutDashboard, route: "/", end: true, group: "hub", order: 0 },
  { id: "my-tasks",  label: "Việc của tôi", icon: ListTodo,     route: "/tasks",   group: "hub", order: 1 },

  // ═══ 2. My People ═══
  { id: "users",            label: "Học viên",       icon: Users,          route: "/users",          group: "people", order: 10, subheader: "Học viên" },
  { id: "users-invoices",   label: "Hóa đơn",        icon: Receipt,        route: "/users/invoices", group: "people", order: 11, subheader: "Học viên" },
  { id: "teachers",         label: "Giáo viên",      icon: GraduationCap,  route: "/teachers",       group: "people", order: 20, subheader: "Giáo viên" },
  { id: "teachers-contracts", label: "Hợp đồng",     icon: FileSignature,  route: "/contracts",      group: "people", order: 21, subheader: "Giáo viên" },
  { id: "teachers-signatures", label: "Yêu cầu ký kết", icon: ClipboardSignature, route: "/teachers/signatures", group: "people", order: 22, subheader: "Giáo viên" },

  // ═══ 3. Study Management ═══
  { id: "programs",     label: "Programs",        icon: Globe,         route: "/courses/programs", group: "study", order: 30, subheader: "Programs & Courses" },
  { id: "study-plans",  label: "Kế hoạch học",    icon: BookOpen,      route: "/study-plans",      group: "study", order: 31, subheader: "Programs & Courses" },
  { id: "courses",      label: "Khóa học",        icon: GraduationCap, route: "/courses",          group: "study", order: 32, subheader: "Programs & Courses" },
  { id: "classes",      label: "Danh sách lớp",   icon: School,        route: "/classes/list",     group: "study", order: 40, subheader: "Lớp học",
    aliasPaths: ["/classes"] },
  { id: "schedule",     label: "Lịch giáo viên",  icon: CalendarDays,  route: "/schedule",         group: "study", order: 41, subheader: "Lớp học" },
  { id: "classes-new",  label: "Tạo lớp mới",     icon: PlusSquare,    route: "/classes/new",      group: "study", order: 42, subheader: "Lớp học" },
  { id: "class-invitations", label: "Lời mời lớp", icon: Send,         route: "/classes/invitations", group: "study", order: 43, subheader: "Lớp học",
    aliasPaths: ["/invitations"] },

  // ═══ 4. Center Management ═══
  { id: "facility",            label: "Cơ sở vật chất", icon: Building2, route: "/facility",            group: "center", order: 50, subheader: "Cơ sở" },
  { id: "facility-materials",  label: "Học liệu",       icon: BookCopy,  route: "/facility/materials",  group: "center", order: 51, subheader: "Cơ sở" },
  { id: "maintenance",         label: "Sổ bảo trì",     icon: Wrench,    route: "/maintenance",         group: "center", order: 60 },

  // ═══ 5. Teaching Management ═══
  { id: "performance",          label: "Tổng quan",       icon: BarChart3,     route: "/performance",              group: "teaching", order: 70, subheader: "Hiệu suất giảng dạy" },
  { id: "performance-kpis",     label: "KPIs",            icon: BarChart3,     route: "/performance/kpis",         group: "teaching", order: 71, subheader: "Hiệu suất giảng dạy" },
  { id: "performance-observations", label: "Dự giờ",      icon: Telescope,     route: "/performance/observations", group: "teaching", order: 72, subheader: "Hiệu suất giảng dạy" },
  { id: "performance-feedback", label: "Phản hồi HV",     icon: MessagesSquare, route: "/performance/feedback",    group: "teaching", order: 73, subheader: "Hiệu suất giảng dạy" },

  // ═══ 6. Financial Management ═══
  { id: "revenue-tuition", label: "Thu học phí",  icon: Banknote,      route: "/revenue/tuition", group: "financial", order: 80, subheader: "Doanh thu" },
  { id: "compensation",    label: "Bảng lương",   icon: Wallet,        route: "/compensation",    group: "financial", order: 81, subheader: "Chi phí" },
  { id: "expenses",        label: "Chi phí khác", icon: ReceiptText,   route: "/expenses",        group: "financial", order: 82, subheader: "Chi phí" },

  // ═══ 7. Documents Management ═══
  { id: "documents",  label: "Tài liệu",  icon: FolderOpen,  route: "/documents",  group: "documents", order: 90 },

  // ═══ Đang xem xét (modules dư — preserved per user, muted styling) ═══
  { id: "library",            label: "Học liệu (digital)", icon: Library,       route: "/library",            group: "review", underReview: true, order: 200,
    aliasPaths: ["/tests", "/flashcards", "/practice"] },
  { id: "my-plans",           label: "Plans của tôi",      icon: BookOpenCheck, route: "/my-plans",           group: "review", underReview: true, order: 201 },
  { id: "placement",          label: "Sắp lớp",            icon: UserSearch,    route: "/placement",          group: "review", underReview: true, order: 202 },
  { id: "attendance",         label: "Theo dõi điểm danh", icon: CalendarCheck, route: "/attendance",         group: "review", underReview: true, order: 203,
    aliasPaths: ["/attendance/monitor"] },
  { id: "availability-drafts", label: "Duyệt lịch rảnh",   icon: CalendarCheck, route: "/availability-drafts", group: "review", underReview: true, order: 204 },
  { id: "rooms",              label: "Phòng học (legacy)", icon: MapPin,        route: "/rooms",              group: "review", underReview: true, order: 205 },
  { id: "band-descriptors",   label: "Band Descriptor",    icon: BookOpen,      route: "/band-descriptors",   group: "review", underReview: true, order: 206 },
  { id: "feedback-templates", label: "Mẫu nhận xét",       icon: BookTemplate,  route: "/feedback-templates", group: "review", underReview: true, order: 207 },
  { id: "badges",             label: "Huy hiệu",           icon: Award,         route: "/badges",             group: "review", underReview: true, order: 208 },

  // ═══ System (super_admin only) ═══
  { id: "permissions",   label: "Phân quyền",      icon: ShieldCheck, route: "/permissions",   group: "system", superAdminOnly: true, order: 300 },
  { id: "feature-flags", label: "Feature Flags",   icon: Flag,        route: "/feature-flags", group: "system", superAdminOnly: true, order: 301 },
  { id: "schema-health", label: "Schema Health",   icon: Activity,    route: "/schema-health", group: "system", superAdminOnly: true, order: 302 },
  { id: "settings",      label: "Cài đặt",         icon: Settings,    route: "/settings",      group: "system", superAdminOnly: true, order: 303 },
];

/* ═══════════════════════════════════════════
   TOP-LEVEL ROUTES — không hiển thị nút "Quay lại" trong PageHeader.
   Hiện chỉ có dashboard `/` được coi là top-level.
   ═══════════════════════════════════════════ */
export const TOP_LEVEL_ADMIN_ROUTES: ReadonlySet<string> = new Set(["/"]);

/** True nếu pathname trùng KHỚP CHÍNH XÁC một top-level route. */
export function isTopLevelAdminRoute(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return TOP_LEVEL_ADMIN_ROUTES.has(p);
}
