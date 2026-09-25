-- 07 · Borrar pendientes
-- Correr en el SQL Editor de Supabase, una sola vez.
--
-- Antes solo podía borrar quien creó la ficha. Ahora que el correo crea
-- pendientes solo, quien los recibe también necesita poder tirarlos: si el
-- modelo leyó mal, el que se queda con la basura en su lista es él.

drop policy if exists "borro lo que creé" on fichas;
drop policy if exists "borro mis fichas" on fichas;

create policy "borro mis fichas" on fichas
  for delete using (auth.uid() in (creador_id, asignado_id));
