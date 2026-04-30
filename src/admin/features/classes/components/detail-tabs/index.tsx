import { Activity, Trophy } from "lucide-react";
import { BackendPendingTab } from "./PlaceholderTab";

export { AnnouncementsTab } from "./AnnouncementsTab";
export { SettingsTab } from "./SettingsTab";
export { StudentsTab } from "./StudentsTab";
export { SessionsTab } from "./SessionsTab";
export { OverviewTab } from "./OverviewTab";
export { RevenueTab } from "./RevenueTab";
export { PayrollTab } from "./PayrollTab";
export { LifecycleTab } from "./LifecycleTab";
export { PlanProgressTab } from "./PlanProgressTab";

/* ─── 2 tabs còn chờ backend ─── */

export function ActivityTab(_: { classId: string }) {
  return (
    <BackendPendingTab
      icon={Activity}
      title="Hoạt động học viên"
      description="Feed hoạt động 7 ngày: bài thi nộp, practice hoàn thành, vocab session. Đang chờ backend tổng hợp activity_log theo class."
      checklist={[
        "Bảng class_enrollments để map student → class",
        "View class_activity_feed (join activity_log + assessments)",
      ]}
    />
  );
}

export function LeaderboardTab(_: { classId: string }) {
  return (
    <BackendPendingTab
      icon={Trophy}
      title="Bảng xếp hạng"
      description="Xếp hạng học viên trong lớp theo điểm trung bình + thời gian học. Cần view rollup từ activity_log."
      checklist={[
        "View class_leaderboard (student_id, total_score, total_minutes, rank)",
        "Toggle leaderboard_enabled trong tab Cấu hình",
      ]}
    />
  );
}
