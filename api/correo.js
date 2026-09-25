// POST /api/correo   { de, asunto, texto, autenticado }
// Cabecera: x-correo-secreto: <CORREO_SECRETO>
//
// La puerta automática: llegan las notas de una junta por correo, se leen y
// los pendientes se crean solos, cada uno a nombre de quien le toca.
//
// Quien llama es el Worker de Cloudflare (carpeta correo/), no un navegador.
// Por eso la puerta se cierra con tres cerrojos:
//   1. el secreto compartido,
//   2. el remitente tiene que ser una de las dos cuentas de la app,
//   3. el correo tiene que venir con SPF o DKIM válido (lo verifica el Worker).

import { clienteAdmin, enviarA } from './_comun.js'
import { Anthropic, LIMITE, leerPendientes } from './_lectura.js'
import { aFicha } from '../src/datos.js'

// CDMX ya no cambia de horario, así que un desfase fijo alcanza.
// ponytail: si algún día hay gente en otra zona, guardarla en `perfiles.zona`.
const ZONA = '-06:00'

/** Busca de quién es ese correo entre las cuentas de la app. */
async function perfilDelCorreo(admin, correo) {
  const limpio = String(correo || '').trim().toLowerCase()
  if (!limpio) return null

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw new Error(error.message)

  const usuario = data.users.find((u) => u.email?.toLowerCase() === limpio)
  return usuario?.id || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' })
  }

  const secreto = process.env.CORREO_SECRETO
  if (!secreto) {
    console.error('correo: falta CORREO_SECRETO')
    return res.status(500).json({ error: 'Sin configurar' })
  }
  if (req.headers['x-correo-secreto'] !== secreto) {
    return res.status(401).json({ error: 'No' })
  }

  try {
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { de, asunto = '', autenticado } = cuerpo
    const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : ''

    // El "De" de un correo se falsifica en dos minutos. Sin SPF ni DKIM
    // válidos no hay manera de saber quién lo mandó, así que no se abre.
    if (autenticado !== true) {
      return res.status(403).json({ error: 'Correo sin verificar' })
    }
    if (!texto) return res.status(400).json({ error: 'Correo vacío' })

    const admin = clienteAdmin()
    const autorId = await perfilDelCorreo(admin, de)
    if (!autorId) {
      // Un desconocido no puede llenarle la lista a nadie.
      console.warn('correo: remitente desconocido', de)
      return res.status(200).json({ creados: 0, motivo: 'remitente desconocido' })
    }

    const { data: perfiles } = await admin.from('perfiles').select('id, nombre')
    const yo = perfiles?.find((p) => p.id === autorId)
    const otro = perfiles?.find((p) => p.id !== autorId)

    const pendientes = await leerPendientes(texto.slice(0, LIMITE), {
      yo: yo?.nombre,
      otro: otro?.nombre,
    })
    if (pendientes.length === 0) {
      return res.status(200).json({ creados: 0, motivo: 'no encontré pendientes' })
    }

    const titulo = asunto.trim().slice(0, 120)
    const filas = pendientes.map((item) => {
      const f = aFicha(item, autorId, otro?.id, ZONA)
      return {
        tipo: f.tipo,
        titulo: f.titulo,
        // Queda de dónde salió: si el modelo se equivocó, se ve la fuente.
        nota: [f.nota, titulo && `De la junta: ${titulo}`].filter(Boolean).join('\n\n') || null,
        estado: 'pendiente',
        prioridad: 'normal',
        creador_id: f.creadorId,
        asignado_id: f.asignadoId,
        vence_en: f.venceEn,
        inicia_en: f.iniciaEn,
        termina_en: f.terminaEn,
        al_calendario: true,
      }
    })

    const { data: creadas, error } = await admin.from('fichas').insert(filas).select('asignado_id')
    if (error) throw new Error(error.message)

    // Un solo aviso por persona, no uno por pendiente.
    const porPersona = {}
    for (const f of creadas) porPersona[f.asignado_id] = (porPersona[f.asignado_id] || 0) + 1

    for (const [perfilId, cuantos] of Object.entries(porPersona)) {
      await enviarA(admin, perfilId, {
        titulo: cuantos === 1 ? 'Un pendiente nuevo de una junta' : `${cuantos} pendientes de una junta`,
        cuerpo: titulo || 'Revisa tu lista',
        tag: 'correo',
        url: '/',
      }).catch((e) => console.error('correo (push):', e.message))
    }

    return res.status(200).json({ creados: creadas.length })
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error('correo (API):', e.status, e.message)
      return res.status(502).json({ error: `La lectura falló (${e.status})` })
    }
    console.error('correo:', e)
    return res.status(500).json({ error: e.message })
  }
}
