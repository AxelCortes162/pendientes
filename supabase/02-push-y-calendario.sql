-- Migración 02: lo que hace falta para notificaciones push y calendario suscrito.
-- Se pega en el SQL Editor y se corre una vez. schema.sql ya la incluye,
-- este archivo es solo para bases que ya existían.

-- ---------------------------------------------- filas por persona
-- Cada quien necesita su token de calendario y su fila de preferencias.
-- Antes se creaban a mano; ahora salen solas al crearse el perfil.

create or replace function fn_ajustes_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into tokens_calendario (perfil_id) values (new.id) on conflict do nothing;
  insert into preferencias_aviso (perfil_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists tg_ajustes_perfil on perfiles;
create trigger tg_ajustes_perfil
  after insert on perfiles
  for each row execute function fn_ajustes_perfil();

-- Para los perfiles que ya existen
insert into tokens_calendario (perfil_id) select id from perfiles on conflict do nothing;
insert into preferencias_aviso (perfil_id) select id from perfiles on conflict do nothing;

-- ------------------------------------------------------ políticas

-- Poder cambiar tus propios avisos aunque la fila ya exista
drop policy if exists "manejo mis avisos" on preferencias_aviso;
create policy "manejo mis avisos" on preferencias_aviso
  for all using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);

-- El token de calendario se lee, nunca se escribe desde el navegador
drop policy if exists "veo mi token de calendario" on tokens_calendario;
create policy "veo mi token de calendario" on tokens_calendario
  for select using (auth.uid() = perfil_id);

-- ------------------------------------------- recordatorios por hora
-- Llama al endpoint /api/recordatorios del sitio publicado.
-- Antes de correrlo: sustituye <TU-SITIO> y <TU-SECRETO>, y activa las
-- extensiones en Database → Extensions (pg_cron y pg_net).
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--   'recordatorios',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://<TU-SITIO>.vercel.app/api/recordatorios',
--     headers := jsonb_build_object(
--                  'Content-Type', 'application/json',
--                  'x-secreto', '<TU-SECRETO>'
--                ),
--     body    := '{}'::jsonb
--   )
--   $$
-- );
--
-- Para verla o quitarla:
--   select * from cron.job;
--   select cron.unschedule('recordatorios');
