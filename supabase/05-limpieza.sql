-- Migración 05: que la bitácora no crezca para siempre.
--
-- Cada entrada pesa unos 200 bytes, así que el espacio no es el problema:
-- 50 movimientos diarios durante un año son unos 3 MB de 500 disponibles.
-- El problema es que una tabla que solo crece termina estorbando.
--
-- Tres meses es suficiente: la bitácora sirve para saber qué pasó esta
-- semana, no para auditar el año pasado. Los comentarios y las fichas NO se
-- tocan: ese es el contenido de verdad.

create or replace function fn_limpiar_actividad()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas integer;
begin
  delete from actividad where creado_en < now() - interval '90 days';
  get diagnostics borradas = row_count;
  return borradas;
end $$;

revoke all on function fn_limpiar_actividad() from public;

-- Correrla a mano una vez, para ver cuánto hay:
--   select fn_limpiar_actividad();

-- Y programarla, de madrugada (requiere pg_cron, igual que los recordatorios):
--
-- select cron.schedule(
--   'limpiar-actividad',
--   '30 4 * * *',
--   $$ select fn_limpiar_actividad() $$
-- );
