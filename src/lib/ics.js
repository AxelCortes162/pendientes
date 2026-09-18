// Generación de calendario en formato iCalendar (RFC 5545).
//
// Dos usos:
//   descargarICS(ficha)  -> un archivo suelto, para el botón "Agregar al calendario"
//   construirCalendario() -> el texto completo que sirve el endpoint de suscripción
//
// Siempre VEVENT, nunca VTODO: Google Calendar ignora los VTODO.

const DOMINIO = 'pendientes.app'

/** 2026-09-22T16:00:00Z -> 20260922T160000Z */
function fechaUTC(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Evento de día completo: 20260922 (sin hora) */
function fechaSola(iso) {
  const d = new Date(iso)
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  )
}

/** Las comas, los punto y coma y los saltos de línea van escapados. */
function escapar(texto = '') {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Ninguna línea puede pasar de 75 octetos: se parte con un espacio al inicio. */
function plegar(linea) {
  if (linea.length <= 75) return linea
  const partes = [linea.slice(0, 75)]
  let resto = linea.slice(75)
  while (resto.length > 74) {
    partes.push(' ' + resto.slice(0, 74))
    resto = resto.slice(74)
  }
  if (resto) partes.push(' ' + resto)
  return partes.join('\r\n')
}

/**
 * Un VEVENT por ficha.
 * El UID se deriva del id, así que al cambiar la hora el calendario
 * REEMPLAZA el evento en vez de duplicarlo.
 */
export function eventoDe(ficha, minutosAntes = 10) {
  if (!ficha.alCalendario) return null

  const lineas = ['BEGIN:VEVENT', `UID:ficha-${ficha.id}@${DOMINIO}`, `DTSTAMP:${fechaUTC(new Date().toISOString())}`]

  // El aviso relativo (-PT10M) solo tiene sentido si el evento tiene hora.
  // En un pendiente de día completo, "10 min antes" sería medianoche, así que
  // la alarma se ancla a la hora límite real.
  let alarma = null

  if (ficha.tipo === 'junta' && ficha.iniciaEn) {
    lineas.push(`DTSTART:${fechaUTC(ficha.iniciaEn)}`)
    lineas.push(`DTEND:${fechaUTC(ficha.terminaEn || ficha.iniciaEn)}`)
    alarma = `TRIGGER:-PT${minutosAntes}M`
  } else if (ficha.venceEn) {
    // Un pendiente no ocupa una franja: se marca como día completo.
    lineas.push(`DTSTART;VALUE=DATE:${fechaSola(ficha.venceEn)}`)
    const aviso = new Date(new Date(ficha.venceEn).getTime() - minutosAntes * 60000)
    alarma = `TRIGGER;VALUE=DATE-TIME:${fechaUTC(aviso.toISOString())}`
  } else {
    return null // sin fecha no hay nada que poner en el calendario
  }

  lineas.push(`SUMMARY:${escapar(ficha.tipo === 'junta' ? ficha.titulo : `Entrega: ${ficha.titulo}`)}`)
  if (ficha.nota) lineas.push(`DESCRIPTION:${escapar(ficha.nota)}`)

  // SEQUENCE sube con cada edición para que el calendario acepte el cambio.
  lineas.push(`SEQUENCE:${ficha.version || 0}`)
  lineas.push(`STATUS:${ficha.estado === 'listo' ? 'CANCELLED' : 'CONFIRMED'}`)

  if (minutosAntes > 0 && alarma) {
    lineas.push(
      'BEGIN:VALARM',
      alarma,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapar(ficha.titulo)}`,
      'END:VALARM',
    )
  }

  lineas.push('END:VEVENT')
  return lineas
}

export function construirCalendario(fichas, nombre = 'Pendientes') {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${DOMINIO}//Pendientes//ES`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapar(nombre)}`,
    // Cada cuánto vuelve a pedir el archivo. Apple lo respeta; Google no.
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ]

  for (const ficha of fichas) {
    const evento = eventoDe(ficha)
    if (evento) lineas.push(...evento)
  }

  lineas.push('END:VCALENDAR')
  return lineas.map(plegar).join('\r\n')
}

/** Botón "Agregar al calendario": descarga un .ics de una sola ficha. */
export function descargarICS(ficha) {
  const texto = construirCalendario([ficha], ficha.titulo)
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ficha.titulo.replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'pendiente'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
