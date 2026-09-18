// Piezas compartidas por las funciones de servidor.
//
// Los archivos que empiezan con guion bajo no se publican como endpoint.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const URL_SUPABASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const LLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY

const VAPID_PUBLICA = process.env.VITE_VAPID_PUBLIC_KEY
const VAPID_PRIVADA = process.env.VAPID_PRIVATE_KEY
const VAPID_CONTACTO = process.env.VAPID_CONTACTO || 'mailto:pendientes@example.com'

/**
 * Cliente con la llave de servicio: se salta las políticas RLS.
 * Solo vive aquí, en el servidor. Nunca se manda al navegador.
 */
export function clienteAdmin() {
  if (!URL_SUPABASE || !LLAVE_SERVICIO) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(URL_SUPABASE, LLAVE_SERVICIO, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function configurarWebPush() {
  if (!VAPID_PUBLICA || !VAPID_PRIVADA) {
    throw new Error('Faltan las llaves VAPID')
  }
  webpush.setVapidDetails(VAPID_CONTACTO, VAPID_PUBLICA, VAPID_PRIVADA)
  return webpush
}

/** Fila de la base (snake_case) al objeto que usa el resto del código. */
export function deFila(f) {
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
    segundosTrabajados: f.segundos_trabajados,
    alCalendario: f.al_calendario,
    version: f.version,
    creadoEn: f.creado_en,
  }
}

/**
 * ¿Está dentro del horario de "no molestar"?
 * Se calcula en la zona horaria de quien recibe, no en la del servidor,
 * que en Vercel corre en UTC.
 */
export function enHorarioDeSilencio(zona = 'America/Mexico_City') {
  try {
    const hora = Number(
      new Intl.DateTimeFormat('es-MX', {
        timeZone: zona,
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    )
    return hora >= 20 || hora < 8
  } catch {
    return false
  }
}

/**
 * Manda un aviso a todos los dispositivos de una persona.
 * Las suscripciones muertas (404/410) se borran: pasa cuando alguien
 * desinstala la app o limpia los datos del navegador.
 */
export async function enviarA(admin, perfilId, carga) {
  const { data: suscripciones, error } = await admin
    .from('suscripciones_push')
    .select('id, endpoint, p256dh, auth')
    .eq('perfil_id', perfilId)

  if (error) throw new Error(error.message)
  if (!suscripciones?.length) {
    return { suscripciones: 0, enviados: 0, limpiados: 0, errores: [] }
  }

  const push = configurarWebPush()
  const cuerpo = JSON.stringify(carga)
  let enviados = 0
  const muertas = []
  const errores = []

  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await push.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          cuerpo,
        )
        enviados++
      } catch (e) {
        // 404/410 = el navegador ya no existe: se limpia sin ruido.
        // Cualquier otro código sí importa (401/403 suele ser VAPID mal puesta).
        if (e.statusCode === 404 || e.statusCode === 410) {
          muertas.push(s.id)
        } else {
          errores.push({
            codigo: e.statusCode || null,
            mensaje: String(e.body || e.message || e).slice(0, 200),
            servicio: new URL(s.endpoint).host,
          })
        }
      }
    }),
  )

  if (muertas.length) {
    await admin.from('suscripciones_push').delete().in('id', muertas)
  }

  return {
    suscripciones: suscripciones.length,
    enviados,
    limpiados: muertas.length,
    errores,
  }
}
