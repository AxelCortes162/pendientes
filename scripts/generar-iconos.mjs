// Genera los PNG del ícono a partir del mismo dibujo que public/icono.svg.
//
//   node scripts/generar-iconos.mjs
//
// Se corre a mano cuando cambie el ícono; no es parte del build.

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const TINTA = '#171614'
const PAPEL = '#F7F6F2'
const ACENTO = '#B4550A'

/**
 * El dibujo, centrado en un lienzo de 512.
 * `escala` < 1 lo encoge para dejar la zona segura que piden los íconos
 * maskable de Android (el sistema recorta hasta un 20 % de cada borde).
 */
function dibujo(escala = 1) {
  const d = (512 * (1 - escala)) / 2
  return `
  <g transform="translate(${d} ${d}) scale(${escala})">
    <g stroke="${PAPEL}" stroke-width="26" stroke-linecap="round" fill="none">
      <path d="M150 190h212"/>
      <path d="M150 262h212" opacity="0.55"/>
      <path d="M150 334h124" opacity="0.3"/>
    </g>
    <circle cx="352" cy="334" r="54" fill="${ACENTO}"/>
    <path d="M330 334l16 16 30-32" stroke="${PAPEL}" stroke-width="20"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>`
}

/** `radio` 0 = cuadrado a sangre; iOS y Android ponen ellos la esquina redonda. */
function svg({ radio = 114, escala = 1 } = {}) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${radio}" fill="${TINTA}"/>
  ${dibujo(escala)}
</svg>`)
}

const salidas = [
  // iOS redondea el ícono por su cuenta: si además lo mandamos redondeado,
  // se le comen las esquinas. Va a sangre.
  { archivo: 'apple-touch-icon.png', tam: 180, opciones: { radio: 0 } },
  { archivo: 'icono-192.png', tam: 192, opciones: {} },
  { archivo: 'icono-512.png', tam: 512, opciones: {} },
  // Android recorta hasta un 20 % de cada lado en los íconos maskable.
  { archivo: 'icono-maskable-512.png', tam: 512, opciones: { radio: 0, escala: 0.7 } },
]

await mkdir('public', { recursive: true })

for (const { archivo, tam, opciones } of salidas) {
  await sharp(svg(opciones)).resize(tam, tam).png().toFile(`public/${archivo}`)
  console.log(`✓ public/${archivo}  ${tam}×${tam}`)
}
