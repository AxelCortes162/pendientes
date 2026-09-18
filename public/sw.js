// Service worker: solo notificaciones push.
//
// A propósito NO cachea nada. Un caché mal invalidado deja a la gente viendo
// una versión vieja de la app sin entender por qué, y aquí no hace falta:
// el contenido siempre viene de Supabase.

self.addEventListener('install', () => {
  // Que la versión nueva tome el control sin esperar a que cierren la app
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim())
})

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : '' }
  }

  const titulo = datos.titulo || 'Pendientes'

  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || '',
      icon: '/icono-192.png',
      badge: '/icono-192.png',
      // Con el mismo tag, un aviso nuevo de la misma ficha reemplaza al
      // anterior en vez de apilarse.
      tag: datos.tag || 'pendientes',
      renotify: Boolean(datos.tag),
      data: { url: datos.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = evento.notification.data?.url || '/'

  evento.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((ventanas) => {
        // Si la app ya está abierta, la enfoca en vez de abrir otra
        for (const ventana of ventanas) {
          if ('focus' in ventana) {
            if ('navigate' in ventana) ventana.navigate(destino).catch(() => {})
            return ventana.focus()
          }
        }
        return self.clients.openWindow(destino)
      }),
  )
})
