// POST /api/probar
// Cabecera: Authorization: Bearer <access_token de Supabase>
//
// Se manda una notificación a sí mismo y devuelve el detalle de lo que pasó.
// Existe para no tener que adivinar por qué no llegó un aviso: dice cuántos
// dispositivos hay suscritos, cuántos envíos salieron y, si algo falló, con
// qué código respondió el servicio de push.

import { clienteAdmin, enviarA } from './_comun.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' })

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Falta el token' })

    const admin = clienteAdmin()
    const { data: auth, error } = await admin.auth.getUser(token)
    if (error || !auth?.user) return res.status(401).json({ error: 'Token inválido' })

    const resultado = await enviarA(admin, auth.user.id, {
      titulo: 'Prueba',
      cuerpo: 'Si ves esto, las notificaciones ya funcionan.',
      tag: 'prueba',
      url: '/',
    })

    return res.status(200).json(resultado)
  } catch (e) {
    console.error('probar:', e)
    return res.status(500).json({ error: e.message })
  }
}
