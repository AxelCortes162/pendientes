// Abrir el sobre: de un POST de SendGrid Inbound Parse sacar quién escribió,
// qué decía, y si el correo venía firmado.
//
// SendGrid manda multipart/form-data, que Vercel no parsea solo. De ahí
// busboy: es la pieza aburrida de leer el formulario, nada más.

import Busboy from 'busboy'

/** Los campos del formulario, sin archivos adjuntos (no nos sirven). */
function leerFormulario(req) {
  return new Promise((resolve, reject) => {
    const campos = {}
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 1 } })

    bb.on('field', (nombre, valor) => {
      campos[nombre] = valor
    })
    // Hay que consumir los adjuntos aunque se tiren, o el stream se atora.
    bb.on('file', (_n, flujo) => flujo.resume())
    bb.on('close', () => resolve(campos))
    bb.on('error', reject)

    req.pipe(bb)
  })
}

/** "Francisco Makareno <fran@ejemplo.com>" -> "fran@ejemplo.com" */
export function correoDe(texto) {
  const entre = String(texto || '').match(/<([^>]+)>/)
  const crudo = entre ? entre[1] : texto
  const uno = String(crudo || '').trim().split(/[\s,;]+/).filter(Boolean).pop()
  return uno && uno.includes('@') ? uno.toLowerCase() : ''
}

/** HTML a texto, para los correos que no traen versión de texto plano. */
export function aTexto(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * ¿El correo es de quien dice ser?
 *
 * SendGrid verifica SPF y DKIM y reporta el resultado. El "De" de un correo
 * se falsifica en dos minutos, así que sin al menos uno en "pass" no se abre.
 * SPF llega como "pass"; dkim como "{@gmail.com : pass}".
 */
export function vieneFirmado({ SPF, dkim }) {
  return /\bpass\b/i.test(String(SPF || '')) || /\bpass\b/i.test(String(dkim || ''))
}

/**
 * @returns { de, asunto, texto, autenticado } venga como venga el POST:
 *          formulario de SendGrid o JSON (para probar con curl).
 */
export async function abrirSobre(req) {
  const tipo = String(req.headers['content-type'] || '')

  if (tipo.includes('multipart/form-data')) {
    const c = await leerFormulario(req)
    return {
      de: correoDe(c.from),
      asunto: (c.subject || '').trim(),
      texto: (c.text || '').trim() || aTexto(c.html),
      autenticado: vieneFirmado(c),
    }
  }

  // Vercel ya parsea el JSON; corriendo esto a mano no, así que se lee crudo.
  let c = req.body
  if (typeof c === 'string') c = JSON.parse(c)
  if (!c) {
    const trozos = []
    for await (const t of req) trozos.push(t)
    const crudo = Buffer.concat(trozos).toString('utf8').trim()
    c = crudo ? JSON.parse(crudo) : {}
  }

  return {
    de: correoDe(c.de || c.from),
    asunto: String(c.asunto || c.subject || '').trim(),
    texto: String(c.texto || c.text || '').trim(),
    autenticado: c.autenticado === true,
  }
}
