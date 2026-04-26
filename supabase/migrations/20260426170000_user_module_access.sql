-- ─────────────────────────────────────────────────────────────────
-- user_module_access: per-admin-user module gate
--
-- Tách biệt với module_access (theo role, dùng cho student/teacher portal).
-- Bảng này cấp quyền cho TỪNG admin user vào các module ADMIN cụ thể —
-- ban đầu là "admin-tests", "admin-flashcards", "admin-study-plans".
--
-- Quy tắc:
--   • super_admin luôn bypass (check ở app layer).
--   • admin: nếu KHÔNG có row → mặc định ENABLED (back-compat: admin
--     hiện hữu không bị mất quyền sau migration). Có row → theo enabled.
--   • Chỉ super_admin được ghi bảng này.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.user_module_access (
  user_id     uuid not null references auth.users(id) on delete cascade,
  module_key  text not null,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  primary key (user_id, module_key)
);

alter table public.user_module_access enable row level security;

-- Mọi admin/super_admin đọc được (để render matrix UI).
drop policy if exists "user_module_access_select" on public.user_module_access;
create policy "user_module_access_select"
  on public.user_module_access
  for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

-- Chỉ super_admin được insert/update/delete.
drop policy if exists "user_module_access_write_super_admin" on public.user_module_access;
create policy "user_module_access_write_super_admin"
  on public.user_module_access
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create index if not exists idx_user_module_access_user
  on public.user_module_access(user_id);
