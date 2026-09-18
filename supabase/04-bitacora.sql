-- Migración 04: la bitácora no podía escribirse.
--
-- Los triggers que llenan `actividad` corrían con los permisos de quien hacía
-- la acción. Como `actividad` tiene RLS con política de lectura y ninguna de
-- escritura, Postgres rechazaba el insert del trigger y con él toda la
-- operación: comentar devolvía 403.
--
-- La bitácora la escribe el sistema, no la persona, así que las funciones van
-- SECURITY DEFINER. Y a propósito NO se agrega una política de insert sobre
-- `actividad`: nadie debe poder inventar entradas en el historial a mano.

create or replace function fn_bitacora_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verbo text;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  verbo := case new.estado
    when 'proceso'   then 'empezó'
    when 'revision'  then 'mandó a revisión'
    when 'listo'     then 'aprobó'
    else 'reabrió'
  end;

  insert into actividad (ficha_id, autor_id, tipo, texto)
  values (
    new.id,
    coalesce(auth.uid(), new.asignado_id),
    case new.estado
      when 'proceso'  then 'inicio'::tipo_evento
      when 'revision' then 'revision'::tipo_evento
      when 'listo'    then 'listo'::tipo_evento
      else 'nueva'::tipo_evento
    end,
    verbo || ' «' || new.titulo || '»'
  );
  return new;
end $$;

create or replace function fn_bitacora_comentario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  select titulo into t from fichas where id = new.ficha_id;

  insert into actividad (ficha_id, autor_id, tipo, texto)
  values (new.ficha_id, new.autor_id, 'comentario', 'comentó en «' || coalesce(t, '') || '»');

  return new;
end $$;

-- SECURITY DEFINER no cambia auth.uid(): sigue leyendo el JWT de la petición,
-- así que la bitácora conserva quién hizo qué.
