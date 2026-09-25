// Worker de correo de Cloudflare.
//
// Cloudflare recibe lo que llegue a juntas@tocaaqui.app y ejecuta esto.
// Aquí solo se abre el sobre: se saca el texto, se mira si el correo viene
// firmado, y se le manda todo a la app. Quién puede crear pendientes lo
// decide la app, no este archivo.

import PostalMime from 'postal-mime'

/** Último recurso cuando el correo viene solo en HTML. */
function aTexto(html) {
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

export default {
  async email(message, env) {
    const correo = await PostalMime.parse(message.raw)
    const texto = correo.text?.trim() || aTexto(correo.html)

    if (!texto) return

    // Cloudflare verifica SPF/DKIM/DMARC y deja el resultado en esta
    // cabecera. Sin un "pass" no se sabe quién mandó el correo: el "De"
    // se falsifica en dos minutos.
    const firma = message.headers.get('authentication-results') || ''
    const autenticado = /\b(spf|dkim)=pass\b/i.test(firma)

    const respuesta = await fetch(env.URL_PENDIENTES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correo-secreto': env.CORREO_SECRETO,
      },
      body: JSON.stringify({
        de: correo.from?.address || message.from,
        asunto: correo.subject || '',
        texto,
        autenticado,
      }),
    })

    // Que se vea en `wrangler tail` cuando algo falle.
    if (!respuesta.ok) {
      console.error('la app respondió', respuesta.status, await respuesta.text())
    } else {
      console.log('listo', await respuesta.text())
    }
  },
}
