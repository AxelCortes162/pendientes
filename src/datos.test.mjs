// node src/datos.test.mjs
//
// Lo que se rompe callado: una junta sin hora (Postgres la rechaza), o un
// pendiente asignado a quien no era.

import assert from 'node:assert/strict'
import { aFicha, aISO, buscarPersona, cerroEn, proximoDia, yaPaso } from './datos.js'

const YO = 'yo-1'
const OTRO = 'otro-2'
const base = { titulo: 'Exportar iconos', nota: '', tipo: 'pendiente', paraId: null, fecha: null, hora: null }

/* ---------- aISO ---------- */
assert.equal(aISO(null, '10:00'), null, 'sin día no hay fecha')
assert.equal(aISO('no-es-fecha', '10:00'), null, 'basura no pasa')
assert.equal(new Date(aISO('2026-09-24', '10:00')).getHours(), 10, 'hora local')
assert.equal(new Date(aISO('2026-09-24', null)).getHours(), 18, 'hora por defecto')

/* ---------- aFicha ---------- */
const simple = aFicha(base, YO)
assert.equal(simple.tipo, 'pendiente')
assert.equal(simple.asignadoId, YO)
assert.equal(simple.creadorId, YO)
assert.equal(simple.venceEn, null, 'sin fecha no vence')

assert.equal(aFicha({ ...base, paraId: OTRO }, YO).asignadoId, OTRO)
assert.equal(
  aFicha({ ...base, paraId: null }, YO).asignadoId,
  YO,
  'si el modelo no atinó a nadie, me lo quedo',
)

const junta = aFicha({ ...base, tipo: 'junta', fecha: '2026-09-24', hora: '10:00' }, YO)
assert.equal(junta.tipo, 'junta')
assert.ok(junta.iniciaEn && junta.terminaEn, 'la junta necesita inicio y fin')
assert.equal(junta.venceEn, null)
assert.equal(
  (new Date(junta.terminaEn) - new Date(junta.iniciaEn)) / 60000,
  60,
  'una hora por defecto',
)

// Sin fecha, una "junta" no puede existir: Postgres la rechazaría.
const juntaSinFecha = aFicha({ ...base, tipo: 'junta' }, YO)
assert.equal(juntaSinFecha.tipo, 'pendiente')
assert.equal(juntaSinFecha.iniciaEn, null)

assert.equal(aFicha({ ...base, titulo: '  Con espacios  ' }, YO).titulo, 'Con espacios')
assert.equal(aFicha({ ...base, titulo: 'x'.repeat(300) }, YO).titulo.length, 200)

/* ---------- juntas que ya pasaron ---------- */
const ayer = new Date(Date.now() - 86400000).toISOString()
const manana = new Date(Date.now() + 86400000).toISOString()
assert.equal(yaPaso({ tipo: 'junta', terminaEn: ayer }), true)
assert.equal(yaPaso({ tipo: 'junta', terminaEn: manana }), false)
assert.equal(yaPaso({ tipo: 'junta', iniciaEn: ayer, terminaEn: null }), true)
assert.equal(yaPaso({ tipo: 'junta' }), false, 'sin fechas no pasó nada')
assert.equal(yaPaso({ tipo: 'pendiente', venceEn: ayer }), false, 'un pendiente vencido sigue vivo')
assert.equal(cerroEn({ tipo: 'junta', terminaEn: ayer }), ayer)
assert.equal(cerroEn({ tipo: 'pendiente', actualizadoEn: ayer }), ayer)

/* ---------- la zona horaria del servidor no debe mover la hora ---------- */
// Vercel corre en UTC: sin el desfase, "las 10" se volverían las 4 a.m.
assert.equal(aISO('2026-09-24', '10:00', '18:00', '-06:00'), '2026-09-24T16:00:00.000Z')
assert.equal(
  aFicha({ ...base, tipo: 'junta', fecha: '2026-09-24', hora: '10:00' }, YO, '-06:00')
    .iniciaEn,
  '2026-09-24T16:00:00.000Z',
)
assert.equal(
  aFicha({ ...base, fecha: '2026-09-24' }, YO, '-06:00').venceEn,
  '2026-09-25T00:00:00.000Z',
  'la hora límite por defecto son las 18:00 de México',
)

/* ---------- el día de la semana lo calcula el código, no el modelo ------- */
// 2026-09-29 es martes.
const MARTES = '2026-09-29'
assert.equal(proximoDia('miércoles', MARTES), '2026-09-30', 'mañana mismo')
assert.equal(proximoDia('miercoles', MARTES), '2026-09-30', 'sin acento también')
assert.equal(proximoDia('VIERNES', MARTES), '2026-10-02')
assert.equal(proximoDia('lunes', MARTES), '2026-10-05', 'cruza la semana')
assert.equal(proximoDia('martes', MARTES), '2026-10-06', 'el mismo día es el de la otra semana')
assert.equal(proximoDia('hoy', MARTES), MARTES)
assert.equal(proximoDia('mañana', MARTES), '2026-09-30')
assert.equal(proximoDia('', MARTES), null)
assert.equal(proximoDia('el jueves que viene', MARTES), null, 'lo que no entiende, no lo inventa')
// Cruzar de mes y de año no debe correr nada.
assert.equal(proximoDia('viernes', '2026-12-31'), '2027-01-01')

/* ---------- el nombre del modelo contra la gente real ---------- */
const EQUIPO = [
  { id: 'a', nombre: 'Axel' },
  { id: 'm', nombre: 'Francisco Makareno' },
]
assert.equal(buscarPersona('Axel', EQUIPO)?.id, 'a')
assert.equal(buscarPersona('Francisco Makareno', EQUIPO)?.id, 'm')
assert.equal(buscarPersona('Makareno', EQUIPO)?.id, 'm', 'solo el apellido')
assert.equal(buscarPersona('francisco', EQUIPO)?.id, 'm', 'sin mayúscula')
assert.equal(buscarPersona('Fco. Makareno', EQUIPO)?.id, 'm', 'nombre a medias')
assert.equal(buscarPersona('Daniel', EQUIPO), null, 'alguien que no existe no empata')
assert.equal(buscarPersona('', EQUIPO), null)
assert.equal(buscarPersona('Axel', []), null)

console.log('todo bien')
