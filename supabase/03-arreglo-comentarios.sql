-- Migración 03: arregla el 403 al comentar.
--
-- Las políticas de comentarios y actividad comprobaban la pertenencia con un
-- EXISTS sobre `fichas`. Esa consulta anidada vuelve a pasar por las políticas
-- de `fichas`, y dentro del contexto de otra política no siempre resuelve como
-- uno espera: el resultado era un 403 al insertar.
--
-- La forma recomendada en Supabase es sacar la comprobación a una función
-- SECURITY DEFINER: corre con los permisos de quien la creó, así que lee
-- `fichas` sin RLS, pero solo responde sí o no a una pregunta concreta.
-- No filtra nada: nunca devuelve datos de la ficha.

create or replace function fn_participo_en(ficha uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from fichas f
    where f.id = ficha
      and (f.creador_id = auth.uid() or f.asignado_id = auth.uid())
  );
$$;

revoke all on function fn_participo_en(uuid) from public;
grant execute on function fn_participo_en(uuid) to authenticated;

-- ------------------------------------------------------- comentarios

drop policy if exists "veo comentarios de mis fichas" on comentarios;
create policy "veo comentarios de mis fichas" on comentarios
  for select using (fn_participo_en(ficha_id));

drop policy if exists "comento en mis fichas" on comentarios;
create policy "comento en mis fichas" on comentarios
  for insert with check (
    auth.uid() = autor_id and fn_participo_en(ficha_id)
  );

-- Poder borrar lo que uno mismo escribió
drop policy if exists "borro mis comentarios" on comentarios;
create policy "borro mis comentarios" on comentarios
  for delete using (auth.uid() = autor_id);

-- --------------------------------------------------------- actividad

drop policy if exists "veo la bitácora de mis fichas" on actividad;
create policy "veo la bitácora de mis fichas" on actividad
  for select using (fn_participo_en(ficha_id));

-- ------------------------------------------------------ comprobación
-- Para ver cómo quedaron:
--
-- select polname,
--        pg_get_expr(polqual, polrelid)      as usando,
--        pg_get_expr(polwithcheck, polrelid) as comprobando
-- from pg_policy
-- where polrelid in ('comentarios'::regclass, 'actividad'::regclass);
