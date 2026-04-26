---
name: Admin Classes List Page
description: /classes/list — danh sách lớp với filter lifecycle_status, counter chips, table+grid view, URL-synced filters.
type: feature
---
**Routes**:
- `/classes` → `ClassManagementPage` (hub vận hành cũ — sync, auto-link, level manager).
- `/classes/list` → `ClassesListPage` (NEW — danh sách + filter chính).
- Sidebar entry `classes` trỏ `/classes/list` với alias `/classes`.

**Schema giả định** (sau migration của user): `teachngo_classes` thêm `name`, `class_code`, `lifecycle_status` (enum class_lifecycle_status), `cancellation_reason`, `status_changed_at`, `branch`, `mode`, `student_count`. Hooks dùng `(supabase as any)` vì `types.ts` (read-only) chưa regen.

**Component dùng chung**: `src/shared/components/admin/ClassStatusBadge.tsx` — exports default `ClassStatusBadge` + `CLASS_STATUS_META`, `CLASS_STATUS_OPTIONS`, type `ClassLifecycleStatus`. Props: `status, size: "sm"|"md", compact?, reason?`. Reason render qua Tooltip wrap.

**Status labels (latest)**:
- planning = "Lên kế hoạch" · recruiting = "Đợi giáo viên" · recruiting_replacement = "Giáo viên thay thế"
- ready = "Sẵn sàng" · in_progress = "Đang học" · completed = "Kết thúc"
- postponed = "Tạm hoãn" · cancelled = "Đã huỷ" · archived = "Đã lưu trữ" (NEW — slate, icon Archive)

**Archive flow**: Hook `useArchiveClass` (`src/admin/features/classes/hooks/useArchiveClass.ts`) — set `lifecycle_status='archived'` (+ reason → cancellation_reason col) hoặc restore về `planning`. Trên list: dropdown menu (`MoreHorizontal`) trong row table và góc phải card grid. Default filter dùng `DEFAULT_VISIBLE_STATUSES = CLASS_STATUS_OPTIONS - archived` để ẩn archived khỏi "Tất cả" — admin click chip "Đã lưu trữ" để xem/restore. AlertDialog xác nhận có Textarea reason. Migration `20260426180108_add_archived_lifecycle_status.sql`.

**ClassesListPage**: dùng `ListPageLayout` (sticky filter bar). State persist vào URL params (`q`, `status`, `sort`, `dir`, `view`). Counter chips dùng query riêng (không depend filter) để count luôn ổn định. Chip "Tất cả" đếm trừ archived. Click row/card → `/classes/:id` (detail page chưa tồn tại — TODO add Archive button trong header detail khi có).

**AdminClassDetailPage** (`/classes/:id`): trang chi tiết 8 tabs.
- File: `src/admin/features/classes/pages/AdminClassDetailPage.tsx` + `components/ClassInfoCard.tsx` + `components/detail-tabs/{index,PlaceholderTab,AnnouncementsTab,HistoryTab,SettingsTab}.tsx`.
- Header actions: Status `Select` (đổi sang `cancelled` mở dialog reason ≥5 ký tự; sang `archived` dùng `useArchiveClass`); refresh; dropdown More (Lưu trữ/Khôi phục, Email/Excel placeholder, Xoá lớp với confirm gõ tên).
- Tabs THẬT (có backend): Announcements (CRUD `class_announcements` + pin/edit/delete), History (timeline đơn dựng từ `status_changed_at`), Settings (form update teachngo_classes qua `(supabase as any)`).
- Tabs PLACEHOLDER (`BackendPendingTab`): Sessions/Students/Plan Progress/Activity/Leaderboard — mỗi tab có checklist backend cần. Khi schema thật được provision (`class_sessions`, `class_enrollments`, `class_status_history`, view `class_leaderboard`...) chỉ swap nội dung component tab tương ứng.
- LƯU Ý ROUTE: spec yêu cầu `/admin/classes/:id` nhưng `LegacyAdminRedirect` strip prefix `/admin/` → route thực tế đăng ký là `classes/:id` (URL hiển thị `/classes/:id`). Bookmark `/admin/classes/<id>` vẫn work qua redirect.
