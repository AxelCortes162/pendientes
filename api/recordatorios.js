// POST /api/recordatorios
// Cabecera: x-secreto: <SECRETO_CRON>
//
// Lo llama pg_cron cada hora (ver supabase/02-push-y-calendario.sql).
//
// Como corre en punto y cada ventana dura una hora exacta, nada se avisa dos
// veces: no hace falta guardar qué ya se mandó.

import { clienteAdmin, deFila, enHorarioDeSilencio, enviarA } from './_comun.js'

const HORA = 3600 * 1000

function ventana(desdeMs, hastaMs) {
  const ahora = Date.now()
  return [new Date(ahora + desdeMs).toISOString(), new Date(ahora + hastaMs).toISOString()]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' })

  const esperado = process.env.SECRETO_CRON
  if (!esperado || req.headers['x-secreto'] !== esperado) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const admin = clienteAdmin()

    // Tres reglas, tres ventanas de una hora
    const [en23h, en24h] = ventana(23 * HORA, 24 * HORA)
    const [en1h, en2h] = ventana(HORA, 2 * HORA)
    const [ahora, en1hJunta] = ventana(0, HORA)

    const [manana, pronto, juntas] = await Promise.all([
      admin
        .from('fichas')
        .select('*')
        .eq('tipo', 'pendiente')
        .neq('estado', 'listo')
        .gte('vence_en', en23h)
        .lt('vence_en', en24h),
      admin
        .from('fichas')
        .select('*')
        .eq('tipo', 'pendiente')
        .neq('estado', 'listo')
        .gte('vence_en', en1h)
        .lt('vence_en', en2h),
      admin
        .from('fichas')
        .select('*')
        .eq('tipo', 'junta')
        .gte('inicia_en', ahora)
        .lt('inicia_en', en1hJunta),
    ])

    const trabajos = [
      ...(manana.data || []).map((f) => ({
        ficha: deFila(f),
        titulo: 'Vence mañana',
      })),
      ...(pronto.data || []).map((f) => ({
        ficha: deFila(f),
        titulo: 'Vence en una hora',
      })),
      ...(juntas.data || []).map((f) => ({
        ficha: deFila(f),
        titulo: 'Junta en menos de una hora',
        aAmbos: true,
      })),
    ]

    if (!trabajos.length) return res.status(200).json({ avisados: 0 })

    // Una sola consulta de preferencias para todos los implicados
    const ids = [
      ...new Set(trabajos.flatMap((t) => [t.ficha.asignadoId, t.ficha.creadorId])),
    ]
    const [{ data: perfiles }, { data: prefs }] = await Promise.all([
      admin.from('perfiles').select('id, zona').in('id', ids),
      admin.from('preferencias_aviso').select('*').in('perfil_id', ids),
    ])

    const zonaDe = Object.fromEntries((perfiles || []).map((p) => [p.id, p.zona]))
    const prefDe = Object.fromEntries((prefs || []).map((p) => [p.perfil_id, p]))

    let avisados = 0

    for (const { ficha, titulo, aAmbos } of trabajos) {
      const destinos = aAmbos
        ? [...new Set([ficha.asignadoId, ficha.creadorId])]
        : [ficha.asignadoId]

      for (const destinoId of destinos) {
        const pref = prefDe[destinoId]
        if (pref?.vencimiento === false) continue
        if (pref?.silencio && enHorarioDeSilencio(zonaDe[destinoId])) continue

        const { enviados } = await enviarA(
          admin,
          destinoId,
          {
            titulo,
            cuerpo: ficha.titulo,
            tag: `recordatorio-${ficha.id}`,
            url: '/',
          },
          // Un recordatorio viejo es peor que ninguno: "vence en una hora"
          // no sirve de nada al día siguiente.
          { ttl: 7200 },
        )
        if (enviados) avisados++
      }
    }

    return res.status(200).json({ avisados, revisados: trabajos.length })
  } catch (e) {
    console.error('recordatorios:', e)
    return res.status(500).json({ error: e.message })
  }
}
