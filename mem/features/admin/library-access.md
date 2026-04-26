---
name: Library Hub Access Control
description: Per-admin-user gate for /tests, /flashcards, /study-plans via user_module_access table.
type: feature
---
**Bảng**: `public.user_module_access` (user_id, module_key, enabled). RLS: select cho admin/super_admin, write chỉ super_admin. Migration: `supabase/migrations/20260426170000_user_module_access.sql`.

**Module keys** (`src/shared/hooks/useUserModuleAccess.ts → ADMIN_MODULE_KEYS`): `admin-tests`, `admin-flashcards`, `admin-study-plans`.

**Quy tắc**:
- super_admin luôn bypass (return true).
- admin: row.enabled nếu có; default `true` khi chưa có row (back-compat — admin hiện hữu KHÔNG bị mất quyền sau migration).
- Role khác: false.

**Hooks**:
- `useMyModuleAccess()` → `{ canAccess(moduleKey), loading }` cho user hiện tại.
- `useUserModuleAccessMatrix()` → `{ rows, isEnabled(uid,key), setEnabled(uid,key,enabled) }` cho UI matrix.

**Guard**: `ModuleAccessRoute` (`src/admin/guards/`) — wrap route, redirect `/library` + toast khi từ chối. Đã wrap: `/tests*`, `/practice/:id/stats`, `/flashcards`, `/study-plans*` trong `AdminRoutes.tsx`.

**UI quản trị**: Tab "Quản lý học liệu" trong `/permissions` (`AdminLibraryAccessPanel`) — list tất cả admin/super_admin user (join user_roles + profiles), 3 toggle. Super admin row khoá ON.

**LibraryHubPage**: filter `SECTIONS` theo `canAccess(s.moduleKey)` — admin không có quyền sẽ không thấy card; nếu mất hết → empty state.
