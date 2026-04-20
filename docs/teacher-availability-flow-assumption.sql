-- Assumption schema for shared Teacher availability + class opening flow
-- Review before applying in the shared DB.

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

-- Optional if class_sessions does not exist yet:
-- create table public.class_sessions (
--   id uuid primary key default gen_random_uuid(),
--   class_id uuid not null references public.teachngo_classes(id) on delete cascade,
--   teacher_id uuid references public.teachers(id) on delete set null,
--   session_date date not null,
--   start_time time,
--   end_time time,
--   room text,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
