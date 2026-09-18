import { createContext, useContext } from 'react'

// Quiénes son las personas de este espacio de trabajo.
// En modo demo salen de datos.js; con Supabase, de la tabla perfiles.

const Contexto = createContext({})

export function PersonasProvider({ personas, children }) {
  return <Contexto.Provider value={personas}>{children}</Contexto.Provider>
}

/** Mapa { id: { id, nombre, iniciales } } */
export function usePersonas() {
  return useContext(Contexto)
}

/** La otra persona del espacio, la que no soy yo. */
export function useOtro(miId) {
  const personas = usePersonas()
  return Object.values(personas).find((p) => p.id !== miId)
}
