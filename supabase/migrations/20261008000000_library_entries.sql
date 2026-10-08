-- MyPlayGallery — biblioteca personal (SPEC-02)
-- Una única tabla de datos personales, aislada por usuario con Auth + RLS.
-- El juego es una referencia externa a IGDB (external_id); sus metadatos no se guardan.

create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  external_id integer not null check (external_id > 0),
  platform_id integer not null check (platform_id > 0),
  platform_name text not null check (char_length(platform_name) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'playing', 'completed', 'abandoned')),
  score numeric(3, 1) check (score >= 0 and score <= 10 and mod(score * 2, 1) = 0),
  platinum boolean not null default false,
  hundred_percent boolean not null default false,
  hours_played numeric(6, 1) check (hours_played >= 0),
  started_on date,
  finished_on date,
  review text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_entries_dates_check
    check (finished_on is null or started_on is null or finished_on >= started_on),
  constraint library_entries_unique_entry unique (user_id, external_id, platform_id)
);

create index library_entries_user_status_idx on public.library_entries (user_id, status);
create index library_entries_user_platform_idx on public.library_entries (user_id, platform_id);
create index library_entries_user_updated_idx on public.library_entries (user_id, updated_at desc);

-- updated_at se mantiene en el servidor
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger library_entries_set_updated_at
  before update on public.library_entries
  for each row execute function public.set_updated_at();

-- RLS: cada usuario solo accede a sus propias entradas
alter table public.library_entries enable row level security;

create policy "library_entries_select_own" on public.library_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "library_entries_insert_own" on public.library_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "library_entries_update_own" on public.library_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "library_entries_delete_own" on public.library_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);
