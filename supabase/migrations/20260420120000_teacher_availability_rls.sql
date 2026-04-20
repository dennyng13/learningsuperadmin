create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role::text in ('admin', 'super_admin')
  );
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.teachers
  where linked_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_teacher_availability(_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user() or public.current_teacher_id() = _teacher_id;
$$;

alter table public.teacher_capabilities enable row level security;
alter table public.teacher_availability_rules enable row level security;
alter table public.teacher_availability_exceptions enable row level security;
alter table public.teacher_availability_drafts enable row level security;

drop policy if exists "Admins and teachers can view teacher capabilities" on public.teacher_capabilities;
drop policy if exists "Admins and teachers can insert teacher capabilities" on public.teacher_capabilities;
drop policy if exists "Admins and teachers can update teacher capabilities" on public.teacher_capabilities;
drop policy if exists "Admins can delete teacher capabilities" on public.teacher_capabilities;

create policy "Admins and teachers can view teacher capabilities"
on public.teacher_capabilities
for select
to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can insert teacher capabilities"
on public.teacher_capabilities
for insert
to authenticated
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can update teacher capabilities"
on public.teacher_capabilities
for update
to authenticated
using (public.can_access_teacher_availability(teacher_id))
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins can delete teacher capabilities"
on public.teacher_capabilities
for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "Admins and teachers can view availability rules" on public.teacher_availability_rules;
drop policy if exists "Admins and teachers can insert availability rules" on public.teacher_availability_rules;
drop policy if exists "Admins and teachers can update availability rules" on public.teacher_availability_rules;
drop policy if exists "Admins and teachers can delete availability rules" on public.teacher_availability_rules;

create policy "Admins and teachers can view availability rules"
on public.teacher_availability_rules
for select
to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can insert availability rules"
on public.teacher_availability_rules
for insert
to authenticated
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can update availability rules"
on public.teacher_availability_rules
for update
to authenticated
using (public.can_access_teacher_availability(teacher_id))
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can delete availability rules"
on public.teacher_availability_rules
for delete
to authenticated
using (public.can_access_teacher_availability(teacher_id));

drop policy if exists "Admins and teachers can view availability exceptions" on public.teacher_availability_exceptions;
drop policy if exists "Admins and teachers can insert availability exceptions" on public.teacher_availability_exceptions;
drop policy if exists "Admins and teachers can update availability exceptions" on public.teacher_availability_exceptions;
drop policy if exists "Admins and teachers can delete availability exceptions" on public.teacher_availability_exceptions;

create policy "Admins and teachers can view availability exceptions"
on public.teacher_availability_exceptions
for select
to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can insert availability exceptions"
on public.teacher_availability_exceptions
for insert
to authenticated
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can update availability exceptions"
on public.teacher_availability_exceptions
for update
to authenticated
using (public.can_access_teacher_availability(teacher_id))
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can delete availability exceptions"
on public.teacher_availability_exceptions
for delete
to authenticated
using (public.can_access_teacher_availability(teacher_id));

drop policy if exists "Admins and teachers can view availability drafts" on public.teacher_availability_drafts;
drop policy if exists "Teachers can create pending availability drafts" on public.teacher_availability_drafts;
drop policy if exists "Admins can create availability drafts" on public.teacher_availability_drafts;
drop policy if exists "Teachers can revise own pending drafts" on public.teacher_availability_drafts;
drop policy if exists "Admins can review availability drafts" on public.teacher_availability_drafts;
drop policy if exists "Teachers can delete own pending drafts" on public.teacher_availability_drafts;
drop policy if exists "Admins can delete availability drafts" on public.teacher_availability_drafts;

create policy "Admins and teachers can view availability drafts"
on public.teacher_availability_drafts
for select
to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Teachers can create pending availability drafts"
on public.teacher_availability_drafts
for insert
to authenticated
with check (
  public.current_teacher_id() = teacher_id
  and status = 'pending'
);

create policy "Admins can create availability drafts"
on public.teacher_availability_drafts
for insert
to authenticated
with check (
  public.is_admin_user()
  and public.can_access_teacher_availability(teacher_id)
);

create policy "Teachers can revise own pending drafts"
on public.teacher_availability_drafts
for update
to authenticated
using (
  public.current_teacher_id() = teacher_id
  and status in ('pending', 'needs_changes')
)
with check (
  public.current_teacher_id() = teacher_id
  and status = 'pending'
);

create policy "Admins can review availability drafts"
on public.teacher_availability_drafts
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "Teachers can delete own pending drafts"
on public.teacher_availability_drafts
for delete
to authenticated
using (
  public.current_teacher_id() = teacher_id
  and status in ('pending', 'needs_changes')
);

create policy "Admins can delete availability drafts"
on public.teacher_availability_drafts
for delete
to authenticated
using (public.is_admin_user());
