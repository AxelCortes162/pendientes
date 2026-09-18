// GET /api/calendario?t=<token>
//
// Devuelve el calendario de una persona en formato iCalendar. Es la URL a la
// que se suscribe el teléfono una sola vez; de ahí en adelante se actualiza
// solo.
//
// El token va en la URL porque así funcionan los calendarios suscritos: la
// app de Calendario no manda cabeceras de autenticación. Por eso el token es
// largo y aleatorio, y se puede rotar borrando la fila de tokens_calendario.

import { clienteAdmin, deFila } from './_comun.js'
import { construirCalendario } from '../src/lib/ics.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Solo GET')
  }

  try {
    const token = req.query?.t
    if (!token || typeof token !== 'string' || token.length < 20) {
      return res.status(400).send('Token inválido')
    }

    const admin = clienteAdmin()

    const { data: fila } = await admin
      .from('tokens_calendario')
      .select('perfil_id')
      .eq('token', token)
      .maybeSingle()

    if (!fila) return res.status(404).send('Calendario no encontrado')

    const perfilId = fila.perfil_id

    const { data: perfil } = await admin
      .from('perfiles')
      .select('nombre')
      .eq('id', perfilId)
      .maybeSingle()

    // Lo que me toca a mí, más las juntas que yo convoqué: una junta es de
    // los dos, un pendiente es de quien lo trabaja.
    const { data: filas, error } = await admin
      .from('fichas')
      .select('*')
      .eq('al_calendario', true)
      .or(`asignado_id.eq.${perfilId},and(tipo.eq.junta,creador_id.eq.${perfilId})`)

    if (error) throw new Error(error.message)

    const texto = construirCalendario(
      (filas || []).map(deFila),
      perfil?.nombre ? `Pendientes de ${perfil.nombre}` : 'Pendientes',
    )

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline; filename="pendientes.ics"')
    // Apple respeta este caché; Google lo ignora y va a su propio ritmo.
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(200).send(texto)
  } catch (e) {
    console.error('calendario:', e)
    return res.status(500).send('Error generando el calendario')
  }
}
