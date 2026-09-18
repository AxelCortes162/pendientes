import { createReadStream } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const aqui = dirname(fileURLToPath(import.meta.url))

/**
 * En desarrollo, Vite trata cualquier .js como un módulo a transformar, así
 * que public/sw.js nunca llega al navegador: cae en el HTML de la app y el
 * registro del service worker falla con un error confuso.
 *
 * En `npm run build` no pasa: ahí public/ se copia tal cual.
 */
function servirServiceWorker() {
  return {
    name: 'servir-sw-en-desarrollo',
    apply: 'serve',
    configureServer(servidor) {
      servidor.middlewares.use((req, res, siguiente) => {
        if (req.url?.split('?')[0] !== '/sw.js') return siguiente()
        res.setHeader('Content-Type', 'text/javascript')
        res.setHeader('Cache-Control', 'no-cache')
        createReadStream(resolve(aqui, 'public/sw.js')).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), servirServiceWorker()],
})
