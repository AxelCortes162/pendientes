// node src/datos.test.mjs
//
// Lo que se rompe callado: una junta sin hora (Postgres la rechaza), o un
// pendiente asignado a quien no era.

import assert from 'node:assert/strict'
import { aFicha, aISO, cerroEn, yaPaso } from './datos.js'

const YO = 'yo-1'
const OTRO = 'otro-2'
const base = { titulo: 'Exportar iconos', nota: '', tipo: 'pendiente', para: 'yo', fecha: null, hora: null }

/* ---------- aISO ---------- */
assert.equal(aISO(null, '10:00'), null, 'sin día no hay fecha')
assert.equal(aISO('no-es-fecha', '10:00'), null, 'basura no pasa')
assert.equal(new Date(aISO('2026-09-24', '10:00')).getHours(), 10, 'hora local')
assert.equal(new Date(aISO('2026-09-24', null)).getHours(), 18, 'hora por defecto')

/* ---------- aFicha ---------- */
const simple = aFicha(base, YO, OTRO)
assert.equal(simple.tipo, 'pendiente')
assert.equal(simple.asignadoId, YO)
assert.equal(simple.creadorId, YO)
assert.equal(simple.venceEn, null, 'sin fecha no vence')

assert.equal(aFicha({ ...base, para: 'otro' }, YO, OTRO).asignadoId, OTRO)
assert.equal(
  aFicha({ ...base, para: 'otro' }, YO, null).asignadoId,
  YO,
  'si no hay otra persona, me lo quedo',
)

const junta = aFicha({ ...base, tipo: 'junta', fecha: '2026-09-24', hora: '10:00' }, YO, OTRO)
assert.equal(junta.tipo, 'junta')
assert.ok(junta.iniciaEn && junta.terminaEn, 'la junta necesita inicio y fin')
assert.equal(junta.venceEn, null)
assert.equal(
  (new Date(junta.terminaEn) - new Date(junta.iniciaEn)) / 60000,
  60,
  'una hora por defecto',
)

// Sin fecha, una "junta" no puede existir: Postgres la rechazaría.
const juntaSinFecha = aFicha({ ...base, tipo: 'junta' }, YO, OTRO)
assert.equal(juntaSinFecha.tipo, 'pendiente')
assert.equal(juntaSinFecha.iniciaEn, null)

assert.equal(aFicha({ ...base, titulo: '  Con espacios  ' }, YO, OTRO).titulo, 'Con espacios')
assert.equal(aFicha({ ...base, titulo: 'x'.repeat(300) }, YO, OTRO).titulo.length, 200)

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
  aFicha({ ...base, tipo: 'junta', fecha: '2026-09-24', hora: '10:00' }, YO, OTRO, '-06:00')
    .iniciaEn,
  '2026-09-24T16:00:00.000Z',
)
assert.equal(
  aFicha({ ...base, fecha: '2026-09-24' }, YO, OTRO, '-06:00').venceEn,
  '2026-09-25T00:00:00.000Z',
  'la hora límite por defecto son las 18:00 de México',
)

console.log('todo bien')
