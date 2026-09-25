// POST /api/importar   { texto }
// Cabecera: Authorization: Bearer <access_token de Supabase>
//
// Lee las notas de una junta y devuelve los pendientes que encontró.
// NO guarda nada: quien pidió la lectura decide cuáles se crean. La puerta
// automática es /api/correo; esta es la de a mano.

import { clienteAdmin } from './_comun.js'
import { Anthropic, LIMITE, leerPendientes } from './_lectura.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' })
  }

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Falta el token' })

    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : ''
    if (!texto) return res.status(400).json({ error: 'No mandaste texto' })
    if (texto.length > LIMITE) {
      return res.status(400).json({ error: 'El texto es demasiado largo' })
    }

    // Solo alguien con cuenta puede gastar llamadas a la API
    const admin = clienteAdmin()
    const { data: auth, error: errAuth } = await admin.auth.getUser(token)
    if (errAuth || !auth?.user) return res.status(401).json({ error: 'Token inválido' })

    const { data: perfiles } = await admin.from('perfiles').select('id, nombre')
    const yo = perfiles?.find((p) => p.id === auth.user.id)
    const otro = perfiles?.find((p) => p.id !== auth.user.id)

    const pendientes = await leerPendientes(texto, {
      yo: yo?.nombre,
      otro: otro?.nombre,
    })

    return res.status(200).json({ pendientes })
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error('importar (API):', e.status, e.message)
      return res.status(502).json({ error: `La lectura falló (${e.status})` })
    }
    console.error('importar:', e)
    return res.status(500).json({ error: e.message })
  }
}
