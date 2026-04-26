import { Calendar, BarChart3, Activity, Trophy, ClipboardList } from "lucide-react";
import { BackendPendingTab } from "./PlaceholderTab";

export { AnnouncementsTab } from "./AnnouncementsTab";
export { HistoryTab } from "./HistoryTab";
export { SettingsTab } from "./SettingsTab";
export { StudentsTab } from "./StudentsTab";

/* ─── 5 tabs còn chờ backend ─── */

export function SessionsTab(_: { classId: string }) {
  return (
    <BackendPendingTab
      icon={Calendar}
      title="Buổi học"
      description="Sẽ hiển thị danh sách buổi học, attendance, ghi chú từng buổi và tệp đính kèm khi backend sẵn sàng."
      checklist={[
        "Bảng class_sessions (class_id, session_no, date, time, room, teacher_id, status, notes)",
        "Bảng class_session_attendance (session_id, student_id, status)",
        "RPC: generate_class_sessions(class_id, schedule, dates)",
      ]}
    />
  );
}

export function PlanProgressTab({ studyPlanId }: { classId: string; studyPlanId: string | null }) {
  if (!studyPlanId) {
    return (
      <BackendPendingTab
        icon={ClipboardList}
        title="Tiến độ kế hoạch"
        description="Lớp hiện chưa được gắn study plan nào. Vào tab Cấu hình để gán study plan, sau đó mở lại tab này để xem tiến độ on-track / behind / ahead."
      />
    );
  }
  return (
    <BackendPendingTab
      icon={BarChart3}
      title="Tiến độ kế hoạch"
      description={`Tab này sẽ hiển thị progress của study plan #${studyPlanId.slice(0, 8)} so với lịch học thực tế.`}
      checklist={[
        "Logic calcPlanProgress(plan, sessions) đã có trong @shared/utils/studyPlanProgress",
        "Cần class_sessions để map session_no → ngày thực tế",
      ]}
    />
  );
}

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
