// Notificaciones push del lado del navegador.
//
// El envío lo hace el servidor (api/notificar.js); aquí solo se pide permiso,
// se crea la suscripción y se guarda en Supabase.

import { hayBackend, supabase } from './supabase.js'

const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function soportaPush() {
  return (
    hayBackend &&
    Boolean(CLAVE_PUBLICA) &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS solo permite push si la app está en la pantalla de inicio. */
export function esIOSSinInstalar() {
  if (typeof navigator === 'undefined') return false
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalada =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return esIOS && !instalada
}

/** La clave VAPID viaja en base64url; el navegador la quiere en bytes. */
function aBytes(base64url) {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = atob(base64)
  const bytes = new Uint8Array(crudo.length)
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes
}

async function suscripcionActual() {
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro) return null
  return registro.pushManager.getSubscription()
}

/** 'no-soportado' | 'bloqueado' | 'activo' | 'inactivo' */
export async function estadoPush() {
  if (!soportaPush()) return 'no-soportado'
  if (Notification.permission === 'denied') return 'bloqueado'
  return (await suscripcionActual()) ? 'activo' : 'inactivo'
}

export async function activarPush(perfilId) {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw new Error(
      permiso === 'denied'
        ? 'Bloqueaste las notificaciones. Hay que volver a permitirlas desde los ajustes del navegador.'
        : 'No se concedió el permiso.',
    )
  }

  const registro = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let suscripcion = await registro.pushManager.getSubscription()
  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      // Obligatorio: cada push tiene que mostrar algo. Nada en silencio.
      userVisibleOnly: true,
      applicationServerKey: aBytes(CLAVE_PUBLICA),
    })
  }

  const { endpoint, keys } = suscripcion.toJSON()
  const { error } = await supabase
    .from('suscripciones_push')
    .upsert(
      { perfil_id: perfilId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    )

  if (error) throw new Error(error.message)
}

export async function desactivarPush() {
  const suscripcion = await suscripcionActual()
  if (!suscripcion) return
  const { endpoint } = suscripcion
  await suscripcion.unsubscribe()
  await supabase.from('suscripciones_push').delete().eq('endpoint', endpoint)
}

/**
 * Se manda un aviso a uno mismo y devuelve el detalle.
 * A diferencia de avisar(), aquí sí interesa el error: es la herramienta
 * para saber por qué una notificación no llegó.
 */
export async function probarPush() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No hay sesión')

  const respuesta = await fetch('/api/probar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(cuerpo.error || `El servidor respondió ${respuesta.status}`)
  return cuerpo
}

/**
 * Le pide al servidor que avise a la otra persona.
 * Si falla, se traga el error a propósito: que no llegue una notificación
 * nunca debe tumbar la acción que el usuario acaba de hacer.
 */
export async function avisar(fichaId, tipo) {
  if (!hayBackend) return
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fichaId, tipo }),
    })
  } catch {
    // sin ruido
  }
}
