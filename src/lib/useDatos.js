// Una sola puerta a los datos, con dos fuentes detrás:
//   - Supabase, cuando hay claves en .env.local
//   - datos de ejemplo en memoria, cuando no las hay
//
// Las pantallas no se enteran de cuál está activa.

import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from './api.js'
import { avisar } from './push.js'
import { hayBackend } from './supabase.js'
import { FICHAS_INICIALES, PERSONAS } from '../datos.js'

const ACTIVIDAD_DEMO = [
  {
    id: 'a1',
    tipo: 'comentario',
    autorId: 'daniel',
    texto: 'comentó en «Rediseñar el banner de la home»',
    creadoEn: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: 'a2',
    tipo: 'revision',
    autorId: 'axel',
    texto: 'mandó a revisión «Exportar iconos del sistema a SVG»',
    creadoEn: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
  {
    id: 'a3',
    tipo: 'inicio',
    autorId: 'axel',
    texto: 'empezó «Rediseñar el banner de la home»',
    creadoEn: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
  },
]

const VERBO = {
  pendiente: 'reabrió',
  proceso: 'empezó',
  revision: 'mandó a revisión',
  listo: 'aprobó',
}

const TIPO_EVENTO = {
  pendiente: 'nueva',
  proceso: 'inicio',
  revision: 'revision',
  listo: 'listo',
}

export function useDatos(miId, usuario) {
  const [personas, setPersonas] = useState(hayBackend ? {} : PERSONAS)
  const [fichas, setFichas] = useState(hayBackend ? [] : FICHAS_INICIALES)
  const [actividad, setActividad] = useState(hayBackend ? [] : ACTIVIDAD_DEMO)
  const [listo, setListo] = useState(!hayBackend)
  const [error, setError] = useState(null)

  // Evita que una recarga tardía pise a otra más reciente
  const recargando = useRef(false)

  // El objeto de sesión cambia solo al renovarse el token. Guardarlo en una
  // ref evita que el canal de realtime se reconecte cada vez que eso pasa.
  const usuarioRef = useRef(usuario)
  usuarioRef.current = usuario

  // Para consultar el estado anterior de una ficha sin volver a suscribirse
  const fichasRef = useRef(fichas)
  fichasRef.current = fichas

  const recargar = useCallback(async () => {
    if (!hayBackend || !miId || recargando.current) return
    recargando.current = true
    try {
      if (usuarioRef.current) await api.asegurarPerfil(usuarioRef.current)
      const [p, f, a] = await Promise.all([
        api.cargarPerfiles(),
        api.cargarFichas(),
        api.cargarActividad(),
      ])
      setPersonas(p)
      setFichas(f)
      setActividad(a)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      recargando.current = false
      setListo(true)
    }
  }, [miId])

  useEffect(() => {
    if (!hayBackend || !miId) return
    recargar()
    // Cuando la otra persona mueve algo, esto se entera solo.
    return api.escucharCambios(() => recargar())
  }, [miId, recargar])

  /* --------------------------------------------------------- acciones */

  const apuntarDemo = useCallback(
    (tipo, texto) => {
      setActividad((prev) => [
        { id: `a${Date.now()}`, tipo, autorId: miId, texto, creadoEn: new Date().toISOString() },
        ...prev,
      ])
    },
    [miId],
  )

  const cambiarEstado = useCallback(
    async (id, estado) => {
      if (hayBackend) {
        try {
          const anterior = fichasRef.current.find((f) => f.id === id)
          const actualizada = await api.cambiarEstado(id, estado)
          setFichas((prev) => prev.map((f) => (f.id === id ? actualizada : f)))

          // Volver de revisión a proceso no es "empezar": es pedir cambios
          const tipo =
            estado === 'proceso' && anterior?.estado === 'revision'
              ? 'cambios'
              : TIPO_EVENTO[estado]
          avisar(id, tipo)

          recargar() // trae la bitácora que escribió el trigger
        } catch (e) {
          setError(e.message)
        }
        return
      }

      // Modo demo: lo que en Supabase hace el trigger, aquí se hace a mano.
      let titulo = ''
      setFichas((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f
          titulo = f.titulo
          const sig = { ...f, estado, version: (f.version || 0) + 1 }
          if (estado === 'proceso') {
            sig.iniciadoEn = new Date().toISOString()
          } else if (f.estado === 'proceso' && f.iniciadoEn) {
            sig.segundosTrabajados =
              (f.segundosTrabajados || 0) +
              Math.floor((Date.now() - new Date(f.iniciadoEn).getTime()) / 1000)
            sig.iniciadoEn = null
          }
          return sig
        }),
      )
      apuntarDemo(TIPO_EVENTO[estado], `${VERBO[estado]} «${titulo}»`)
    },
    [apuntarDemo, recargar],
  )

  /** Se va y no vuelve: los comentarios se borran con ella (cascada). */
  const borrar = useCallback(
    async (id) => {
      setFichas((prev) => prev.filter((f) => f.id !== id))
      if (!hayBackend) return
      try {
        await api.borrarFicha(id)
      } catch (e) {
        setError(e.message)
        recargar() // si no se borró, que vuelva a aparecer
      }
    },
    [recargar],
  )

  /** "Ahí estaré": solo para juntas. */
  const confirmar = useCallback(
    async (id) => {
      if (hayBackend) {
        try {
          const actualizada = await api.confirmarJunta(id)
          setFichas((prev) => prev.map((f) => (f.id === id ? actualizada : f)))
          avisar(id, 'visto')
        } catch (e) {
          setError(e.message)
        }
        return
      }
      setFichas((prev) =>
        prev.map((f) => (f.id === id ? { ...f, vistoEn: new Date().toISOString() } : f)),
      )
    },
    [],
  )

  const comentar = useCallback(
    async (fichaId, texto, archivo = null) => {
      if (hayBackend) {
        try {
          const foto = archivo ? await api.subirFoto(archivo) : null
          const nuevo = await api.agregarComentario(fichaId, miId, texto, foto)
          setFichas((prev) =>
            prev.map((f) =>
              f.id === fichaId ? { ...f, comentarios: [...f.comentarios, nuevo] } : f,
            ),
          )
          avisar(fichaId, 'comentario')
          recargar()
        } catch (e) {
          setError(e.message)
        }
        return
      }

      let titulo = ''
      setFichas((prev) =>
        prev.map((f) => {
          if (f.id !== fichaId) return f
          titulo = f.titulo
          return {
            ...f,
            comentarios: [
              ...f.comentarios,
              {
                id: `c${Date.now()}`,
                autorId: miId,
                texto,
                foto: archivo ? URL.createObjectURL(archivo) : null,
                creadoEn: new Date().toISOString(),
              },
            ],
          }
        }),
      )
      apuntarDemo('comentario', `comentó en «${titulo}»`)
    },
    [miId, apuntarDemo, recargar],
  )

  const crear = useCallback(
    async (datos) => {
      if (hayBackend) {
        try {
          const nueva = await api.crearFicha(datos)
          setFichas((prev) => [nueva, ...prev])
          avisar(nueva.id, 'nueva')
          recargar()
        } catch (e) {
          setError(e.message)
        }
        return
      }

      setFichas((prev) => [
        {
          ...datos,
          id: `f${Date.now()}`,
          iniciadoEn: null,
          segundosTrabajados: 0,
          creadoEn: new Date().toISOString(),
          comentarios: [],
          version: 0,
        },
        ...prev,
      ])
      apuntarDemo('nueva', `creó «${datos.titulo}»`)
    },
    [apuntarDemo, recargar],
  )

  return {
    listo,
    error,
    personas,
    fichas,
    actividad,
    borrar,
    cambiarEstado,
    comentar,
    confirmar,
    crear,
  }
}
