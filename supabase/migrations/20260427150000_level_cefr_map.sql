-- level_cefr_map: 1 course_level → N CEFR
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cefr_level') then
    create type public.cefr_level as enum ('A1','A2','B1','B2','C1','C2');
  end if;
end $$;

create table if not exists public.level_cefr_map (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.course_levels(id) on delete cascade,
  cefr public.cefr_level not null,
  created_at timestamptz not null default now(),
  unique (level_id, cefr)
);
create index if not exists idx_level_cefr_map_level on public.level_cefr_map(level_id);

alter table public.level_cefr_map enable row level security;

drop policy if exists "level_cefr_map readable" on public.level_cefr_map;
create policy "level_cefr_map readable"
  on public.level_cefr_map for select to authenticated using (true);

drop policy if exists "level_cefr_map admin write" on public.level_cefr_map;
create policy "level_cefr_map admin write"
  on public.level_cefr_map for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
