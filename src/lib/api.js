// Todo lo que habla con Supabase vive aquí.
//
// La base de datos usa snake_case y la app camelCase: la traducción se hace
// en este archivo y en ningún otro lado.

import { supabase } from './supabase.js'

/* ---------------------------------------------------------- traducción */

function deFila(f) {
  return {
    id: f.id,
    tipo: f.tipo,
    titulo: f.titulo,
    nota: f.nota || '',
    estado: f.estado,
    prioridad: f.prioridad,
    creadorId: f.creador_id,
    asignadoId: f.asignado_id,
    venceEn: f.vence_en,
    iniciaEn: f.inicia_en,
    terminaEn: f.termina_en,
    iniciadoEn: f.iniciado_en,
    segundosTrabajados: f.segundos_trabajados,
    alCalendario: f.al_calendario,
    version: f.version,
    creadoEn: f.creado_en,
    comentarios: (f.comentarios || [])
      .map((c) => ({
        id: c.id,
        autorId: c.autor_id,
        texto: c.texto,
        creadoEn: c.creado_en,
      }))
      .sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn)),
  }
}

function aFila(d) {
  return {
    tipo: d.tipo,
    titulo: d.titulo,
    nota: d.nota || null,
    estado: d.estado,
    prioridad: d.prioridad,
    creador_id: d.creadorId,
    asignado_id: d.asignadoId,
    vence_en: d.venceEn,
    inicia_en: d.iniciaEn,
    termina_en: d.terminaEn,
    al_calendario: d.alCalendario,
  }
}

/** Supabase devuelve el error en la respuesta, no lo lanza. */
function revisar({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

/* ---------------------------------------------------------------- auth */

export async function sesionActual() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function entrar(correo, contrasena) {
  return revisar(
    await supabase.auth.signInWithPassword({ email: correo, password: contrasena }),
  )
}

export async function registrarse(correo, contrasena, nombre) {
  return revisar(
    await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      // El trigger fn_perfil_nuevo lee este 'nombre' para crear el perfil.
      options: { data: { nombre } },
    }),
  )
}

export async function salir() {
  await supabase.auth.signOut()
}

/* ------------------------------------------------------------- lectura */

/**
 * Red de seguridad: normalmente el perfil lo crea el trigger fn_perfil_nuevo
 * al registrarse. Si por lo que sea no está, se crea aquí y la app no se
 * queda colgada esperando un perfil que nunca llega.
 */
export async function asegurarPerfil(usuario) {
  const existente = revisar(
    await supabase.from('perfiles').select('id').eq('id', usuario.id).maybeSingle(),
  )
  if (existente) return

  const nombre =
    usuario.user_metadata?.nombre?.trim() || usuario.email?.split('@')[0] || 'Sin nombre'

  revisar(await supabase.from('perfiles').insert({ id: usuario.id, nombre }))
}

export async function cargarPerfiles() {
  const filas = revisar(await supabase.from('perfiles').select('id, nombre, iniciales'))
  const mapa = {}
  for (const p of filas) mapa[p.id] = { id: p.id, nombre: p.nombre, iniciales: p.iniciales }
  return mapa
}

export async function cargarFichas() {
  const filas = revisar(
    await supabase
      .from('fichas')
      .select('*, comentarios(id, autor_id, texto, creado_en)')
      .order('creado_en', { ascending: false }),
  )
  return filas.map(deFila)
}

export async function cargarActividad(limite = 40) {
  const filas = revisar(
    await supabase
      .from('actividad')
      .select('id, ficha_id, autor_id, tipo, texto, creado_en')
      .order('creado_en', { ascending: false })
      .limit(limite),
  )
  return filas.map((a) => ({
    id: a.id,
    fichaId: a.ficha_id,
    autorId: a.autor_id,
    tipo: a.tipo,
    texto: a.texto,
    creadoEn: a.creado_en,
  }))
}

/* ------------------------------------------------------------ escritura */

export async function crearFicha(datos) {
  const fila = revisar(await supabase.from('fichas').insert(aFila(datos)).select().single())
  return deFila({ ...fila, comentarios: [] })
}

/**
 * Solo manda el estado: el cronómetro y la bitácora los resuelve
 * Postgres con sus triggers, no el navegador.
 */
export async function cambiarEstado(id, estado) {
  const fila = revisar(
    await supabase
      .from('fichas')
      .update({ estado })
      .eq('id', id)
      .select('*, comentarios(id, autor_id, texto, creado_en)')
      .single(),
  )
  return deFila(fila)
}

export async function agregarComentario(fichaId, autorId, texto) {
  const fila = revisar(
    await supabase
      .from('comentarios')
      .insert({ ficha_id: fichaId, autor_id: autorId, texto })
      .select()
      .single(),
  )
  return { id: fila.id, autorId: fila.autor_id, texto: fila.texto, creadoEn: fila.creado_en }
}

/* ------------------------------------------------------------- realtime */

/**
 * Cuando la otra persona mueve algo, esta app se entera sola.
 * Con dos usuarios no vale la pena aplicar el cambio fila por fila:
 * se vuelve a leer y ya.
 */
export function escucharCambios(alCambiar) {
  const canal = supabase
    .channel('pendientes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fichas' }, alCambiar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, alCambiar)
    .subscribe()

  return () => supabase.removeChannel(canal)
}
