-- MyPlayGallery — límite de peticiones por usuario a la función igdb-proxy (T-01, SPEC-04)
-- Un contador por usuario y ventana de tiempo. Lo usa solo la Edge Function con la clave de servicio:
-- la tabla tiene RLS sin políticas y la función no se puede ejecutar desde el navegador.

create table public.api_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket timestamptz not null,
  hits integer not null default 0,
  primary key (user_id, bucket)
);

alter table public.api_rate_limits enable row level security;

-- Suma una petición en la ventana actual y devuelve si sigue dentro del límite.
-- De vez en cuando (1 de cada 100 llamadas) borra las ventanas de hace más de un día.
create function public.hit_rate_limit(p_user uuid, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.api_rate_limits as l (user_id, bucket, hits)
  values (p_user, v_bucket, 1)
  on conflict (user_id, bucket) do update set hits = l.hits + 1
  returning l.hits into v_hits;

  if random() < 0.01 then
    delete from public.api_rate_limits where bucket < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(uuid, integer, integer) to service_role;
