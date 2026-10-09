-- MyPlayGallery — cuentas de plataformas conectadas (SPEC-08)
-- Una fila por usuario y plataforma (de momento, solo Steam).
-- El cliente solo puede leer y borrar sus conexiones: las crea la Edge Function
-- correspondiente (con la clave de servicio) después de verificar la cuenta con la plataforma,
-- para que nadie pueda apuntarse la cuenta de otro.

create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('steam')),
  external_id text not null check (char_length(external_id) between 1 and 64),
  display_name text check (char_length(display_name) <= 100),
  avatar_url text check (char_length(avatar_url) <= 500),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  constraint platform_connections_one_per_provider unique (user_id, provider),
  -- Una misma cuenta de Steam solo puede estar conectada a un usuario de la app.
  constraint platform_connections_unique_account unique (provider, external_id)
);

alter table public.platform_connections enable row level security;

create policy "platform_connections_select_own" on public.platform_connections
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "platform_connections_delete_own" on public.platform_connections
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Sin políticas de insert/update: solo la clave de servicio (Edge Functions) puede escribir.
