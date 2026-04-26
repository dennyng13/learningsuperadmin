---
name: Class detail schema
description: Backbone tables/RPC cho trang /admin/classes/:id (status history, enrollments, invitations, replacement teacher RPC).
type: feature
---
**Migrations**: `docs/migrations/2026-04-26-class-lifecycle-enum.sql` (chạy TRƯỚC) + `docs/migrations/2026-04-26-class-detail-backbone.sql`.

**Enum** `class_lifecycle_status`: planning, recruiting, recruiting_replacement, ready, in_progress, completed, postponed, cancelled, archived. ALTER TYPE ADD VALUE phải commit trước khi RPC/trigger cast literal (PG limitation) → tách 2 file.

**Tables mới**:
- `class_status_history`: audit log lifecycle. Insert ONLY qua trigger `tg_log_class_status_change` (BEFORE INSERT/UPDATE OF lifecycle_status, cancellation_reason ON teachngo_classes). RLS: SELECT cho admin + teacher của lớp; KHÔNG có policy INSERT/UPDATE từ client.
- `class_enrollments(class_id, student_id, status, enrolled_at, dropped_at, drop_reason)`: status ∈ active/paused/transferred/dropped/completed.
- `class_invitations(class_id, teacher_id, status, message, withdrawal_note, invited_by, invited_at, responded_at, expires_at)`: status ∈ pending/accepted/declined/withdrawn/expired. Unique partial index `(class_id, teacher_id) WHERE status='pending'` → 1 lời mời pending tại 1 thời điểm. Teacher tự update accept/decline qua RLS UPDATE policy.

**RPC**:
- `request_replacement_teacher(p_class_id, p_reason, p_teacher_ids[])` (SECURITY DEFINER, admin-only, reason ≥5 ký tự). Trong 1 tx: withdraw pending invitations, DELETE class_teachers, set lifecycle='recruiting_replacement' + teacher_id/name=NULL + cancellation_reason=p_reason (trigger pick lên ghi history). Trả `{success, class_id, invitations_created, new_status}`. KHÔNG tự gửi email — FE gọi tiếp `send-class-invitations` edge function.
- `get_class_status_history(p_class_id)` SECURITY DEFINER trả TABLE đã sort changed_at DESC, có RLS check inline.

**Edge function** `supabase/functions/send-class-invitations/index.ts`: STUB hiện chỉ log + trả `{ok:true, stub:true}`. Khi hạ tầng email Lovable Cloud bật → swap sang `enqueue_email` RPC.

**Lưu ý FE**: 
- types.ts read-only chưa regen → vẫn dùng `(supabase as any).from("class_invitations")` etc cho đến khi Cloud regen.
- HistoryTab giờ có thể swap khỏi placeholder → query `get_class_status_history` RPC.
- Trigger tự ghi history → KHÔNG manual insert từ FE.
