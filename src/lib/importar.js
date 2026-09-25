// Lectura de notas de junta: el servidor las interpreta, aquí solo se piden.

import { hayBackend, supabase } from './supabase.js'

export async function leerNotas(texto) {
  if (!hayBackend) throw new Error('Necesitas iniciar sesión para leer notas')

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No hay sesión')

  const respuesta = await fetch('/api/importar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ texto }),
  })

  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(cuerpo.error || `El servidor respondió ${respuesta.status}`)
  return cuerpo.pendientes || []
}
