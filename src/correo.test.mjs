// node src/correo.test.mjs
//
// Abrir el sobre de SendGrid. Lo que importa aquí es el cerrojo: un correo
// sin firma no debe pasar por bueno.

import assert from 'node:assert/strict'
import { aTexto, correoDe, vieneFirmado } from '../api/_correo-entrante.js'

/* ---------- de quién viene ---------- */
assert.equal(correoDe('Francisco Makareno <fran@ejemplo.com>'), 'fran@ejemplo.com')
assert.equal(correoDe('fran@ejemplo.com'), 'fran@ejemplo.com')
assert.equal(correoDe('  FRAN@Ejemplo.COM  '), 'fran@ejemplo.com', 'sin mayúsculas ni espacios')
assert.equal(correoDe('"Makareno, Francisco" <fran@ejemplo.com>'), 'fran@ejemplo.com')
assert.equal(correoDe(''), '')
assert.equal(correoDe('sin arroba'), '')
assert.equal(correoDe(undefined), '')

/* ---------- ¿viene firmado? ---------- */
// Si esto se equivoca, cualquiera puede escribir "De: tu jefe" y llenarte la
// lista de pendientes.
assert.equal(vieneFirmado({ SPF: 'pass' }), true)
assert.equal(vieneFirmado({ dkim: '{@gmail.com : pass}' }), true)
assert.equal(vieneFirmado({ SPF: 'fail', dkim: '{@x.com : pass}' }), true, 'basta con uno')
assert.equal(vieneFirmado({ SPF: 'fail', dkim: '{@x.com : fail}' }), false)
assert.equal(vieneFirmado({ SPF: 'softfail' }), false, 'softfail no es pass')
assert.equal(vieneFirmado({ SPF: 'none' }), false)
assert.equal(vieneFirmado({}), false, 'sin datos, no pasa')
assert.equal(vieneFirmado({ SPF: 'passable' }), false, 'no es coincidencia de pedazos')

/* ---------- correos que solo traen HTML ---------- */
assert.equal(aTexto('<p>Hola</p><p>Adiós</p>'), 'Hola\nAdiós')
assert.equal(aTexto('<div>Uno<br>Dos</div>'), 'Uno\nDos')
assert.equal(aTexto('<style>p{color:red}</style><p>Solo esto</p>'), 'Solo esto')
assert.equal(aTexto('Junta &amp; caf&eacute;'.replace('&eacute;', 'é')), 'Junta & café')
assert.equal(aTexto(''), '')

console.log('todo bien')
