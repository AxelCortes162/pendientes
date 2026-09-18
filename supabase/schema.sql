-- Esquema de Pendientes para Supabase (Postgres).
-- Se pega tal cual en el SQL Editor del proyecto y se ejecuta una vez.

-- ---------------------------------------------------------------- tipos

create type tipo_ficha      as enum ('pendiente', 'junta');
create type estado_ficha    as enum ('pendiente', 'proceso', 'revision', 'listo');
create type prioridad_ficha as enum ('baja', 'normal', 'alta');
create type tipo_evento     as enum ('nueva', 'inicio', 'revision', 'listo', 'comentario');

-- ------------------------------------------------------------- perfiles
-- auth.users lo maneja Supabase; aquí solo va lo que la app necesita mostrar.

create table perfiles (
  id         uuid primary key references auth.users on delete cascade,
  nombre     text not null check (char_length(nombre) between 1 and 60),
  iniciales  text generated always as (upper(left(nombre, 2))) stored,
  zona       text not null default 'America/Mexico_City',
  creado_en  timestamptz not null default now()
);

-- Al registrarse alguien, se le crea el perfil solo.
create or replace function fn_perfil_nuevo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger tg_perfil_nuevo
  after insert on auth.users
  for each row execute function fn_perfil_nuevo();

-- --------------------------------------------------------------- fichas
-- Una sola tabla para pendientes y juntas: cambian los campos de fecha,
-- no la naturaleza de la cosa.

create table fichas (
  id                  uuid primary key default gen_random_uuid(),
  tipo                tipo_ficha not null default 'pendiente',
  titulo              text not null check (char_length(titulo) between 1 and 200),
  nota                text,
  estado              estado_ficha not null default 'pendiente',
  prioridad           prioridad_ficha not null default 'normal',

  creador_id          uuid not null references perfiles(id) on delete cascade,
  asignado_id         uuid not null references perfiles(id) on delete cascade,

  vence_en            timestamptz,   -- pendientes
  inicia_en           timestamptz,   -- juntas
  termina_en          timestamptz,

  iniciado_en         timestamptz,   -- cuándo arrancó el cronómetro actual
  segundos_trabajados integer not null default 0 check (segundos_trabajados >= 0),

  al_calendario       boolean not null default true,
  version             integer not null default 0,  -- SEQUENCE del .ics

  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),

  -- Una junta necesita hora; un pendiente, a lo mucho, fecha límite.
  constraint junta_con_hora check (tipo <> 'junta' or inicia_en is not null),
  constraint fin_despues_de_inicio check (termina_en is null or termina_en > inicia_en)
);

create index on fichas (asignado_id, estado);
create index on fichas (creador_id, estado);
create index on fichas (vence_en) where vence_en is not null;

-- ---------------------------------------------------------- comentarios

create table comentarios (
  id        uuid primary key default gen_random_uuid(),
  ficha_id  uuid not null references fichas(id) on delete cascade,
  autor_id  uuid not null references perfiles(id) on delete cascade,
  texto     text not null check (char_length(texto) between 1 and 2000),
  creado_en timestamptz not null default now()
);

create index on comentarios (ficha_id, creado_en);

-- ------------------------------------------------------------- bitácora

create table actividad (
  id        uuid primary key default gen_random_uuid(),
  ficha_id  uuid not null references fichas(id) on delete cascade,
  autor_id  uuid not null references perfiles(id) on delete cascade,
  tipo      tipo_evento not null,
  texto     text not null,
  creado_en timestamptz not null default now()
);

create index on actividad (creado_en desc);

-- ----------------------------------------------- push y calendario

create table suscripciones_push (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references perfiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  creado_en   timestamptz not null default now()
);

-- La URL secreta con la que cada quien se suscribe a su calendario.
create table tokens_calendario (
  perfil_id uuid primary key references perfiles(id) on delete cascade,
  token     text not null unique default encode(gen_random_bytes(24), 'hex'),
  creado_en timestamptz not null default now()
);

-- Qué avisos quiere recibir cada quien.
create table preferencias_aviso (
  perfil_id   uuid primary key references perfiles(id) on delete cascade,
  asignacion  boolean not null default true,
  comentario  boolean not null default true,
  vencimiento boolean not null default true,
  silencio    boolean not null default false,  -- no molestar 20:00–8:00
  resumen     boolean not null default true    -- resumen diario 8:30
);

-- ------------------------------------------------------------ triggers

-- El cronómetro arranca y para solo. Nadie anota horas a mano.
create or replace function fn_cronometro()
returns trigger language plpgsql as $$
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'proceso' then
      new.iniciado_en := now();
    elsif old.estado = 'proceso' and old.iniciado_en is not null then
      new.segundos_trabajados := old.segundos_trabajados
        + greatest(0, extract(epoch from (now() - old.iniciado_en))::integer);
      new.iniciado_en := null;
    end if;
  end if;

  -- Cada edición sube la versión: así el calendario REEMPLAZA el evento
  -- en vez de duplicarlo.
  new.version := old.version + 1;
  new.actualizado_en := now();
  return new;
end $$;

create trigger tg_cronometro
  before update on fichas
  for each row execute function fn_cronometro();

-- Cada perfil nuevo estrena su token de calendario y sus preferencias.
create or replace function fn_ajustes_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into tokens_calendario (perfil_id) values (new.id) on conflict do nothing;
  insert into preferencias_aviso (perfil_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger tg_ajustes_perfil
  after insert on perfiles
  for each row execute function fn_ajustes_perfil();

-- Todo cambio de estado deja rastro en la bitácora.
--
-- SECURITY DEFINER a propósito: la bitácora la escribe el sistema, no la
-- persona. Sin esto el trigger chocaría con las políticas de `actividad`, que
-- no permiten escribir, y tumbaría la operación entera.
create or replace function fn_bitacora_estado()
returns trigger language plpgsql security definer set search_path = public as $$
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

create trigger tg_bitacora_estado
  after update on fichas
  for each row execute function fn_bitacora_estado();

create or replace function fn_bitacora_comentario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  select titulo into t from fichas where id = new.ficha_id;
  insert into actividad (ficha_id, autor_id, tipo, texto)
  values (new.ficha_id, new.autor_id, 'comentario', 'comentó en «' || t || '»');
  return new;
end $$;

create trigger tg_bitacora_comentario
  after insert on comentarios
  for each row execute function fn_bitacora_comentario();

-- ------------------------------------------------------------------ RLS
-- La regla de oro: ves una ficha si la creaste o si te la asignaron.
-- Se aplica en la base de datos, así que aunque el front se equivoque,
-- nadie ve lo que no le toca.

alter table perfiles            enable row level security;
alter table fichas              enable row level security;
alter table comentarios         enable row level security;
alter table actividad           enable row level security;
alter table suscripciones_push  enable row level security;
alter table tokens_calendario   enable row level security;
alter table preferencias_aviso  enable row level security;

create policy "perfiles visibles" on perfiles
  for select using (auth.uid() is not null);

create policy "edito mi perfil" on perfiles
  for update using (auth.uid() = id);

-- Solo tu propia fila, y solo si falta: es la red de seguridad por si el
-- trigger no alcanzó a crear el perfil al registrarte.
create policy "creo mi perfil" on perfiles
  for insert with check (auth.uid() = id);

create policy "veo mis fichas" on fichas
  for select using (auth.uid() in (creador_id, asignado_id));

create policy "creo fichas a mi nombre" on fichas
  for insert with check (auth.uid() = creador_id);

create policy "edito mis fichas" on fichas
  for update using (auth.uid() in (creador_id, asignado_id));

create policy "borro lo que creé" on fichas
  for delete using (auth.uid() = creador_id);

-- ¿Soy parte de esta ficha? SECURITY DEFINER para que la consulta a `fichas`
-- no vuelva a pasar por RLS dentro de otra política: anidado así, el EXISTS
-- no resuelve como uno espera y termina rechazando inserts válidos.
-- No filtra nada: solo responde sí o no.
create or replace function fn_participo_en(ficha uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from fichas f
    where f.id = ficha
      and (f.creador_id = auth.uid() or f.asignado_id = auth.uid())
  );
$$;

revoke all on function fn_participo_en(uuid) from public;
grant execute on function fn_participo_en(uuid) to authenticated;

create policy "veo comentarios de mis fichas" on comentarios
  for select using (fn_participo_en(ficha_id));

create policy "comento en mis fichas" on comentarios
  for insert with check (auth.uid() = autor_id and fn_participo_en(ficha_id));

create policy "borro mis comentarios" on comentarios
  for delete using (auth.uid() = autor_id);

-- `actividad` se lee pero no se escribe: las entradas solo las pone el
-- trigger, así que nadie puede inventar historial.
create policy "veo la bitácora de mis fichas" on actividad
  for select using (fn_participo_en(ficha_id));

create policy "manejo mis suscripciones" on suscripciones_push
  for all using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);

create policy "veo mi token de calendario" on tokens_calendario
  for select using (auth.uid() = perfil_id);

create policy "manejo mis avisos" on preferencias_aviso
  for all using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);

-- ------------------------------------------------ realtime y recordatorios

-- Para que los comentarios y los cambios de estado lleguen al instante.
alter publication supabase_realtime add table fichas;
alter publication supabase_realtime add table comentarios;

-- Recordatorios: una función que corre cada hora y decide a quién avisar.
-- (La función edge 'recordatorios' se despliega aparte; ver README.)
--
--   select cron.schedule(
--     'recordatorios',
--     '0 * * * *',
--     $$ select net.http_post(
--          url     := 'https://<tu-proyecto>.supabase.co/functions/v1/recordatorios',
--          headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
--        ) $$
--   );
