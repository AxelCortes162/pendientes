-- 06 · Fotos en los comentarios y confirmación de juntas
-- Correr en el SQL Editor de Supabase, una sola vez.

-- ------------------------------------------------ 1. confirmar una junta
-- Quien está invitado marca "ahí estaré" y el otro se entera.
alter table fichas add column if not exists visto_en timestamptz;

-- ------------------------------------------------ 2. foto en comentarios
alter table comentarios add column if not exists foto text;

-- Un comentario puede ser solo foto, sin texto.
alter table comentarios alter column texto drop not null;
alter table comentarios drop constraint if exists comentarios_texto_check;
alter table comentarios add constraint comentarios_contenido check (
  (texto is null or char_length(texto) between 1 and 2000)
  and (texto is not null or foto is not null)
);

-- ------------------------------------------------ 3. el bucket de fotos
-- Público: la URL lleva un uuid que nadie adivina, y así la imagen se pinta
-- con un <img src> y ya. Si algún día hay fotos delicadas, hacerlo privado
-- y firmar las URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/heic','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "subo fotos" on storage.objects;
create policy "subo fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos');

drop policy if exists "borro mis fotos" on storage.objects;
create policy "borro mis fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and owner = auth.uid());
