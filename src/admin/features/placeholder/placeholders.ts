/**
 * Day 7 IA placeholder route registry.
 *
 * Single source of truth for all "coming soon" admin pages added during the
 * sidebar overhaul. AdminRoutes maps these into <Route> elements pointing at
 * <PlaceholderPage> with the metadata below.
 *
 * Removing an entry here also removes it from the route table. When the real
 * page ships, replace the entry usage in AdminRoutes with the actual import.
 *
 * Keep in sync with PLACEHOLDER_TRACKING.md at repo root.
 */

import type { LucideIcon } from "lucide-react";
import {
  ListTodo, Receipt, ClipboardSignature, Send,
  Building2, Wrench, BookCopy,
  BarChart3, Telescope, MessagesSquare,
  Banknote, ReceiptText, FolderOpen,
} from "lucide-react";

export interface PlaceholderRouteSpec {
  /** Path relative to root (no leading "/"). */
  path: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  description?: string;
  scope?: string[];
  /** Estimated ship date or quarter — surfaced in the placeholder UI. */
  eta?: string;
}

export const PLACEHOLDER_ROUTES: PlaceholderRouteSpec[] = [
  // ─── 1.2 Hub + Tasks ───
  {
    path: "tasks",
    title: "Việc của tôi",
    subtitle: "My Tasks",
    icon: ListTodo,
    description:
      "Trung tâm tác vụ cá nhân của admin: phê duyệt yêu cầu, ký kết hợp đồng, " +
      "review điểm danh, follow-up incident.",
    scope: [
      "Inbox tác vụ với status filter (mới / đang xử lý / đã xong)",
      "Deep-link vào trang gốc của task (vd. invitation request, contract review)",
      "SLA timer + auto-escalate khi quá hạn",
    ],
  },

  // ─── 2.1.1 Student Invoices ───
  {
    path: "users/invoices",
    title: "Hóa đơn học viên",
    subtitle: "Student Invoices",
    icon: Receipt,
    description:
      "Quản lý hóa đơn học phí, công nợ, thanh toán cho học viên. Tích hợp với " +
      "module Doanh thu (6.1).",
    scope: [
      "Danh sách hóa đơn theo học viên / lớp / kỳ",
      "Generate hóa đơn từ class enrollment + course price",
      "Track payment status (pending / paid / overdue)",
      "Export PDF + email send",
    ],
  },

  // ─── 2.2.3 Teacher Signatures ───
  {
    path: "teachers/signatures",
    title: "Yêu cầu ký kết",
    subtitle: "Signature requests",
    icon: ClipboardSignature,
    description:
      "Theo dõi các yêu cầu ký kết hợp đồng / phụ lục đang chờ chữ ký từ giáo viên.",
    scope: [
      "List pending signature requests per teacher",
      "Resend reminder + cancel request",
      "Audit log mọi action ký kết",
    ],
  },

  // ─── 3.2.4 Class Invitations alias ───
  // Note: real page is at /classes/invitations (existing). /invitations alias
  // redirects there — managed in AdminRoutes, not as a placeholder page.

  // ─── 4.1 Facility hub ───
  {
    path: "facility",
    title: "Cơ sở vật chất",
    subtitle: "Facility management",
    icon: Building2,
    description:
      "Tổng quan tất cả các cơ sở: phòng học, học liệu vật lý, thiết bị. Liên kết với " +
      "danh sách phòng (/rooms) và sổ bảo trì.",
    scope: [
      "Tổng quan phòng + capacity + occupancy",
      "Danh sách thiết bị / học liệu vật lý",
      "Booking conflicts + maintenance flag",
    ],
  },

  // ─── 4.1.2 Facility Materials ───
  {
    path: "facility/materials",
    title: "Học liệu vật lý",
    subtitle: "Physical learning materials",
    icon: BookCopy,
    description:
      "Quản lý sách, giáo trình, in ấn vật lý của trung tâm. Khác với /library (digital " +
      "tests / flashcards / practice).",
    scope: [
      "Inventory tracker (số lượng / sẵn sàng / mượn / mất)",
      "Borrow/return ledger gắn với học viên + giáo viên",
      "Cảnh báo low-stock + reorder",
    ],
  },

  // ─── 4.2 Maintenance Log ───
  {
    path: "maintenance",
    title: "Sổ bảo trì",
    subtitle: "Maintenance log",
    icon: Wrench,
    description:
      "Nhật ký bảo trì cơ sở: hỏng hóc, sửa chữa, định kỳ vệ sinh.",
    scope: [
      "Log incident + assign technician + status timeline",
      "Recurring maintenance schedule",
      "Cost tracking → Expenses (6.2.2)",
    ],
  },

  // ─── 5.1 Performance hub ───
  {
    path: "performance",
    title: "Quản lý hiệu suất giảng dạy",
    subtitle: "Performance management",
    icon: BarChart3,
    description:
      "Trang chủ module Quản lý hiệu suất: KPI, dự giờ, feedback học viên.",
    scope: [
      "Dashboard tổng quan KPI giáo viên (NPS, attendance, avg score)",
      "Drill-down per teacher hoặc per class",
      "So sánh kỳ trước / cùng kỳ năm trước",
    ],
  },

  // ─── 5.1.1 Performance KPIs ───
  {
    path: "performance/kpis",
    title: "KPIs giáo viên",
    subtitle: "Teacher KPIs",
    icon: BarChart3,
    description:
      "Bảng KPI chi tiết theo giáo viên: chuyên cần, NPS, completion rate, " +
      "average score học viên.",
    scope: [
      "Custom KPI definitions (per program / role)",
      "Auto-compute từ class_sessions + enrollments + feedback",
      "Cảnh báo KPI dưới ngưỡng → My Tasks",
    ],
  },

  // ─── 5.1.2 Teacher Observations ───
  {
    path: "performance/observations",
    title: "Dự giờ giáo viên",
    subtitle: "Teacher observations",
    icon: Telescope,
    description:
      "Lập kế hoạch dự giờ, biên bản dự giờ, phản hồi cho giáo viên.",
    scope: [
      "Schedule observation + assign observer (peer / lead)",
      "Rubric-based scoring + qualitative notes",
      "Report về teacher profile + KPI link",
    ],
  },

  // ─── 5.1.3 Student Feedback (performance) ───
  {
    path: "performance/feedback",
    title: "Phản hồi học viên",
    subtitle: "Student feedback",
    icon: MessagesSquare,
    description:
      "Tổng hợp phản hồi học viên về giáo viên: NPS, đánh giá định kỳ, complaint.",
    scope: [
      "Survey schedule + auto-distribute",
      "Sentiment analysis + tag clouds",
      "Drill-down to free-text comments",
    ],
  },

  // ─── 6.1.1 Revenue Tuition ───
  {
    path: "revenue/tuition",
    title: "Doanh thu học phí",
    subtitle: "Tuition revenue",
    icon: Banknote,
    description:
      "Tổng quan thu học phí, công nợ, doanh thu theo lớp / khóa / kỳ.",
    scope: [
      "Doanh thu theo program / branch / kỳ",
      "Aging report cho công nợ",
      "Forecast doanh thu kỳ tới (dựa trên enrollment + giảm trừ)",
    ],
  },

  // ─── 6.2.2 Other Expenses ───
  {
    path: "expenses",
    title: "Chi phí khác",
    subtitle: "Other expenses",
    icon: ReceiptText,
    description:
      "Quản lý chi phí ngoài lương: bảo trì, in ấn, marketing, dịch vụ khác.",
    scope: [
      "Phân loại theo category + center / branch",
      "Liên kết Maintenance log + Materials",
      "Báo cáo chi phí theo kỳ",
    ],
  },

  // ─── 7.1 Documents Management ───
  {
    path: "documents",
    title: "Tài liệu",
    subtitle: "Documents management",
    icon: FolderOpen,
    description:
      "Tổng kho tài liệu trung tâm: hợp đồng, biên bản, file scan, policy. Khác với " +
      "module Hợp đồng (chỉ contracts ký số).",
    scope: [
      "Folder hierarchy + tagging",
      "Search full-text + filter theo người upload / loại",
      "Permission per document (view / download / share link)",
    ],
  },
];
