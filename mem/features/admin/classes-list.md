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

**Component dùng chung**: `src/shared/components/admin/ClassStatusBadge.tsx` — exports default `ClassStatusBadge` + `CLASS_STATUS_META`, `CLASS_STATUS_OPTIONS`, type `ClassLifecycleStatus`. Props: `status, size: "sm"|"md", compact?, reason?`. Có 8 status: planning / recruiting / recruiting_replacement / ready / in_progress / completed / postponed / cancelled. Reason render qua Tooltip wrap.

**ClassesListPage**: dùng `ListPageLayout` (sticky filter bar). State persist vào URL params (`q`, `status`, `sort`, `dir`, `view`). Counter chips dùng query riêng (không depend filter) để count luôn ổn định. Click row/card → `/classes/:id` (detail page chưa tồn tại — TODO).
