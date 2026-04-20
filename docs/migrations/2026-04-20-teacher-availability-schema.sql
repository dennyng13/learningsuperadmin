create table if not exists public.teacher_capabilities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  level_keys text[] default '{}',
  program_keys text[] default '{}',
  can_teach_online boolean default true,
  can_teach_offline boolean default true,
  max_hours_per_week integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id)
);

create table if not exists public.teacher_availability_rules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  effective_from date not null,
  effective_to date,
  mode text default 'hybrid' check (mode in ('online','offline','hybrid')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.teacher_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  exception_date date not null,
  action text not null check (action in ('available','unavailable')),
  start_time time not null,
  end_time time not null,
  mode text default 'hybrid' check (mode in ('online','offline','hybrid')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.teacher_availability_drafts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  effective_from date not null,
  availability_rules jsonb not null default '[]'::jsonb,
  availability_exceptions jsonb not null default '[]'::jsonb,
  validation_summary jsonb,
  status text not null default 'pending' check (status in ('pending','needs_changes','approved','rejected','applied')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.teacher_capabilities;
alter publication supabase_realtime add table public.teacher_availability_rules;
alter publication supabase_realtime add table public.teacher_availability_exceptions;
alter publication supabase_realtime add table public.teacher_availability_drafts;

create index if not exists idx_teacher_availability_rules_teacher_effective on public.teacher_availability_rules(teacher_id, effective_from);
create index if not exists idx_teacher_availability_exceptions_teacher_date on public.teacher_availability_exceptions(teacher_id, exception_date);
create index if not exists idx_teacher_availability_drafts_teacher_status on public.teacher_availability_drafts(teacher_id, status);

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

create policy "Admins and teachers can view teacher capabilities"
on public.teacher_capabilities for select to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can insert teacher capabilities"
on public.teacher_capabilities for insert to authenticated
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can update teacher capabilities"
on public.teacher_capabilities for update to authenticated
using (public.can_access_teacher_availability(teacher_id))
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can delete teacher capabilities"
on public.teacher_capabilities for delete to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can view availability rules"
on public.teacher_availability_rules for select to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can insert availability rules"
on public.teacher_availability_rules for insert to authenticated
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can update availability rules"
on public.teacher_availability_rules for update to authenticated
using (public.can_access_teacher_availability(teacher_id))
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can delete availability rules"
on public.teacher_availability_rules for delete to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can view availability exceptions"
on public.teacher_availability_exceptions for select to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can insert availability exceptions"
on public.teacher_availability_exceptions for insert to authenticated
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can update availability exceptions"
on public.teacher_availability_exceptions for update to authenticated
using (public.can_access_teacher_availability(teacher_id))
with check (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can delete availability exceptions"
on public.teacher_availability_exceptions for delete to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Admins and teachers can view availability drafts"
on public.teacher_availability_drafts for select to authenticated
using (public.can_access_teacher_availability(teacher_id));

create policy "Teachers can create pending availability drafts"
on public.teacher_availability_drafts for insert to authenticated
with check (public.current_teacher_id() = teacher_id and status = 'pending');

create policy "Admins can create availability drafts"
on public.teacher_availability_drafts for insert to authenticated
with check (public.is_admin_user() and public.can_access_teacher_availability(teacher_id));

create policy "Teachers can revise own pending drafts"
on public.teacher_availability_drafts for update to authenticated
using (public.current_teacher_id() = teacher_id and status in ('pending', 'needs_changes'))
with check (public.current_teacher_id() = teacher_id and status = 'pending');

create policy "Admins can review availability drafts"
on public.teacher_availability_drafts for update to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "Teachers can delete own pending drafts"
on public.teacher_availability_drafts for delete to authenticated
using (public.current_teacher_id() = teacher_id and status in ('pending', 'needs_changes'));

create policy "Admins can delete availability drafts"
on public.teacher_availability_drafts for delete to authenticated
using (public.is_admin_user());