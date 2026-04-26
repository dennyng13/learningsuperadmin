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
