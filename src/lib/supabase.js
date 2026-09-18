import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Si no hay claves, la app sigue corriendo con los datos de ejemplo.
 * Así nunca se queda en blanco por un .env que falta.
 */
export const hayBackend = Boolean(url && clave)

export const supabase = hayBackend
  ? createClient(url, clave, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
