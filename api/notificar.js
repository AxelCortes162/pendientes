// POST /api/notificar   { fichaId, tipo }
// Cabecera: Authorization: Bearer <access_token de Supabase>
//
// Avisa a la otra persona de la ficha. Quien llama tiene que ser parte de
// ella: el token se verifica contra Supabase, no se cree lo que venga en el
// cuerpo de la petición.

import { clienteAdmin, deFila, enHorarioDeSilencio, enviarA } from './_comun.js'

const MENSAJES = {
  nueva: (quien, f) => ({
    titulo: `${quien} te asignó un pendiente`,
    cuerpo: f.titulo,
  }),
  inicio: (quien, f) => ({
    titulo: `${quien} ya empezó`,
    cuerpo: f.titulo,
  }),
  revision: (quien, f) => ({
    titulo: `${quien} terminó, te toca revisar`,
    cuerpo: f.titulo,
  }),
  listo: (quien, f) => ({
    titulo: `${quien} aprobó tu trabajo`,
    cuerpo: f.titulo,
  }),
  cambios: (quien, f) => ({
    titulo: `${quien} pidió cambios`,
    cuerpo: f.titulo,
  }),
  comentario: (quien, f) => ({
    titulo: `${quien} comentó`,
    cuerpo: f.titulo,
  }),
}

// Qué avisos se pueden apagar. Los que no están aquí son del flujo central
// y siempre se mandan: si no, la app deja de ser confiable.
const PREFERENCIA = { nueva: 'asignacion', comentario: 'comentario' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' })
  }

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Falta el token' })

    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { fichaId, tipo } = cuerpo
    if (!fichaId || !MENSAJES[tipo]) {
      return res.status(400).json({ error: 'fichaId o tipo inválidos' })
    }

    const admin = clienteAdmin()

    // Quién manda el aviso, según el token (no según lo que diga el cuerpo)
    const { data: auth, error: errAuth } = await admin.auth.getUser(token)
    if (errAuth || !auth?.user) return res.status(401).json({ error: 'Token inválido' })
    const autorId = auth.user.id

    const { data: fila, error: errFicha } = await admin
      .from('fichas')
      .select('*')
      .eq('id', fichaId)
      .maybeSingle()

    if (errFicha) throw new Error(errFicha.message)
    if (!fila) return res.status(404).json({ error: 'Ficha no encontrada' })

    const ficha = deFila(fila)

    // Solo quien es parte de la ficha puede disparar su aviso
    if (autorId !== ficha.creadorId && autorId !== ficha.asignadoId) {
      return res.status(403).json({ error: 'No es tu ficha' })
    }

    const destinoId = autorId === ficha.asignadoId ? ficha.creadorId : ficha.asignadoId
    if (destinoId === autorId) {
      return res.status(200).json({ enviados: 0, motivo: 'es tu propia ficha' })
    }

    const { data: perfiles } = await admin
      .from('perfiles')
      .select('id, nombre, zona')
      .in('id', [autorId, destinoId])

    const autor = perfiles?.find((p) => p.id === autorId)
    const destino = perfiles?.find((p) => p.id === destinoId)

    const { data: prefs } = await admin
      .from('preferencias_aviso')
      .select('*')
      .eq('perfil_id', destinoId)
      .maybeSingle()

    const llave = PREFERENCIA[tipo]
    if (llave && prefs && prefs[llave] === false) {
      return res.status(200).json({ enviados: 0, motivo: 'apagado por preferencia' })
    }

    if (prefs?.silencio && enHorarioDeSilencio(destino?.zona)) {
      // Se acumulan: el resumen de la mañana los recoge
      return res.status(200).json({ enviados: 0, motivo: 'horario de silencio' })
    }

    const { titulo, cuerpo: texto } = MENSAJES[tipo](autor?.nombre || 'Alguien', ficha)

    const resultado = await enviarA(admin, destinoId, {
      titulo,
      cuerpo: texto,
      tag: `ficha-${ficha.id}`,
      url: '/',
    })

    return res.status(200).json(resultado)
  } catch (e) {
    console.error('notificar:', e)
    return res.status(500).json({ error: e.message })
  }
}
