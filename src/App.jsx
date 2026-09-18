import { useEffect, useMemo, useState } from 'react'
import { BarraInferior } from './ui.jsx'
import { hayBackend, supabase } from './lib/supabase.js'
import * as api from './lib/api.js'
import { useDatos } from './lib/useDatos.js'
import { PersonasProvider } from './lib/personas.jsx'
import Login from './pantallas/Login.jsx'
import MisPendientes from './pantallas/MisPendientes.jsx'
import Detalle from './pantallas/Detalle.jsx'
import Equipo from './pantallas/Equipo.jsx'
import Actividad from './pantallas/Actividad.jsx'
import Nuevo from './pantallas/Nuevo.jsx'

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [revisandoSesion, setRevisandoSesion] = useState(hayBackend)
  const [demoId, setDemoId] = useState('axel')

  const [vista, setVista] = useState('mios')
  const [fichaId, setFichaId] = useState(null)
  const [avisos, setAvisos] = useState({
    asignacion: true,
    comentario: true,
    vencimiento: true,
    silencio: false,
  })
  const [aviso, setAviso] = useState(null)
  const [ahora, setAhora] = useState(Date.now())

  // Sesión: al abrir, y cada vez que alguien entra o sale
  useEffect(() => {
    if (!hayBackend) return
    api.sesionActual().then((s) => {
      setSesion(s)
      setRevisandoSesion(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const miId = hayBackend ? sesion?.user?.id : demoId
  const { listo, error, personas, fichas, actividad, cambiarEstado, comentar, crear } =
    useDatos(miId, hayBackend ? sesion?.user : null)

  // Las preferencias de aviso viven en la base: así valen en cualquier
  // dispositivo donde entres, no solo en este.
  useEffect(() => {
    if (!hayBackend || !miId) return
    api
      .cargarPreferencias()
      .then((p) => {
        if (!p) return
        setAvisos({
          asignacion: p.asignacion,
          comentario: p.comentario,
          vencimiento: p.vencimiento,
          silencio: p.silencio,
        })
      })
      .catch(() => {})
  }, [miId])

  function cambiarAviso(llave, valor) {
    setAvisos((prev) => ({ ...prev, [llave]: valor }))
    if (hayBackend && miId) {
      api.guardarPreferencia(miId, llave, valor).catch(() => {
        // Si no se pudo guardar, se revierte para no mentirle al usuario
        setAvisos((prev) => ({ ...prev, [llave]: !valor }))
      })
    }
  }

  // El cronómetro de "en proceso" se refresca solo
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // El aviso flotante se va solo a los 3 segundos
  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(id)
  }, [aviso])

  const yo = personas[miId]
  const otro = useMemo(
    () => Object.values(personas).find((p) => p.id !== miId),
    [personas, miId],
  )
  const ficha = fichas.find((f) => f.id === fichaId)
  const mias = useMemo(() => fichas.filter((f) => f.asignadoId === miId), [fichas, miId])

  /** A quién le toca enterarse de lo que acabo de hacer. */
  function avisarA(objetivo) {
    if (!objetivo) return
    const destinoId =
      miId === objetivo.asignadoId ? objetivo.creadorId : objetivo.asignadoId
    if (destinoId && destinoId !== miId && personas[destinoId]) {
      setAviso(`Notificación enviada a ${personas[destinoId].nombre}`)
    }
  }

  function alCambiarEstado(id, estado) {
    avisarA(fichas.find((f) => f.id === id))
    cambiarEstado(id, estado)
  }

  function alComentar(id, texto) {
    avisarA(fichas.find((f) => f.id === id))
    comentar(id, texto)
  }

  function alCrear(datos) {
    crear(datos)
    if (datos.asignadoId !== miId && personas[datos.asignadoId]) {
      setAviso(`Notificación enviada a ${personas[datos.asignadoId].nombre}`)
    }
    setVista(datos.asignadoId === miId ? 'mios' : 'equipo')
  }

  function abrir(id) {
    setFichaId(id)
    setVista('detalle')
  }

  const Marco = ({ children }) => (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-papel">
      {children}
    </div>
  )

  if (revisandoSesion) {
    return <Marco />
  }

  if (hayBackend && !sesion) {
    return (
      <Marco>
        <Login />
      </Marco>
    )
  }

  if (!listo || !yo) {
    return (
      <Marco>
        <div className="flex h-full items-center justify-center">
          <p className="text-[13px] text-gris-claro">
            {error ? `No se pudieron cargar los datos: ${error}` : 'Cargando…'}
          </p>
        </div>
      </Marco>
    )
  }

  const conNav = ['mios', 'equipo', 'actividad'].includes(vista)

  return (
    <PersonasProvider personas={personas}>
      <Marco>
        {vista === 'mios' && (
          <MisPendientes
            fichas={mias}
            yo={yo}
            ahora={ahora}
            onAbrir={abrir}
            onNuevo={() => setVista('nuevo')}
          />
        )}

        {vista === 'equipo' && (
          <Equipo
            fichas={fichas}
            yo={yo}
            ahora={ahora}
            onAbrir={abrir}
            onCambiarEstado={alCambiarEstado}
            onNuevo={() => setVista('nuevo')}
          />
        )}

        {vista === 'actividad' && (
          <Actividad
            actividad={actividad}
            yo={yo}
            avisos={avisos}
            onCambiarAviso={cambiarAviso}
            onSalir={hayBackend ? () => api.salir() : null}
          />
        )}

        {vista === 'detalle' && ficha && (
          <Detalle
            ficha={ficha}
            yo={yo}
            ahora={ahora}
            onVolver={() => setVista('mios')}
            onCambiarEstado={alCambiarEstado}
            onComentar={alComentar}
          />
        )}

        {vista === 'nuevo' && (
          <Nuevo yo={yo} onCancelar={() => setVista('mios')} onCrear={alCrear} />
        )}

        {conNav && (
          <BarraInferior vista={vista} irA={setVista} hayAvisos={actividad.length > 0} />
        )}

        {aviso && (
          <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-5">
            <p className="rounded-full bg-tinta px-4 py-2.5 text-[13px] font-medium text-papel shadow-lg">
              {aviso}
            </p>
          </div>
        )}

        {/* Sin Supabase configurado, la app corre con datos de ejemplo
            y esta barra sirve para ver las dos caras. */}
        {!hayBackend && otro && (
          <div className="flex items-center justify-center gap-2 border-t border-dashed border-borde bg-lienzo py-1.5 text-[10px] text-gris-claro">
            <span className="tracking-wider uppercase">Demo · ver como</span>
            <button
              type="button"
              onClick={() => {
                setDemoId(otro.id)
                setVista('mios')
              }}
              className="cursor-pointer rounded-full border border-borde bg-white px-2.5 py-1 font-medium text-tinta-suave"
            >
              {otro.nombre}
              {otro.jefe ? ' (jefe)' : ''}
            </button>
          </div>
        )}
      </Marco>
    </PersonasProvider>
  )
}
