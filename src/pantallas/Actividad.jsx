import { useEffect, useState } from 'react'
import { Icono, Interruptor, Separador } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'
import { diaLargo, hora } from '../datos.js'
import { hayBackend } from '../lib/supabase.js'
import { cargarTokenCalendario } from '../lib/api.js'
import {
  activarPush,
  desactivarPush,
  esIOSSinInstalar,
  estadoPush,
  probarPush,
  soportaPush,
} from '../lib/push.js'

const ICONOS = {
  inicio: { Comp: Icono.Play, fondo: 'bg-proceso-fondo', color: 'text-proceso-texto' },
  comentario: { Comp: Icono.Comentario, fondo: 'bg-borde-suave', color: 'text-pendiente-texto' },
  revision: { Comp: Icono.Ojo, fondo: 'bg-revision-fondo', color: 'text-revision-texto' },
  listo: { Comp: Icono.Palomita, fondo: 'bg-listo-fondo', color: 'text-listo' },
  nueva: { Comp: Icono.Mas, fondo: 'bg-borde-suave', color: 'text-pendiente-texto' },
}

const AJUSTES = [
  { id: 'asignacion', titulo: 'Me asignan un pendiente' },
  { id: 'comentario', titulo: 'Comentario nuevo' },
  {
    id: 'vencimiento',
    titulo: 'Recordatorio antes de vencer',
    pie: '24 h antes y una hora antes',
  },
  {
    id: 'silencio',
    titulo: 'No molestar 20:00 – 8:00',
    pie: 'Se acumulan y llegan por la mañana',
  },
]

function etiquetaDia(iso) {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return diaLargo(iso)
}

/**
 * Parte la lista en días. Así la hora de cada entrada basta y no hay que
 * repetir la fecha en cada renglón.
 */
function agruparPorDia(lista) {
  const grupos = []
  for (const entrada of lista) {
    const dia = etiquetaDia(entrada.creadoEn)
    const ultimo = grupos.at(-1)
    if (ultimo?.dia === dia) ultimo.entradas.push(entrada)
    else grupos.push({ dia, entradas: [entrada] })
  }
  return grupos
}

/* -------------------------------------------------- notificaciones push */

function TarjetaPush({ perfilId }) {
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [prueba, setPrueba] = useState(null)

  useEffect(() => {
    estadoPush().then(setEstado)
  }, [])

  async function alternar() {
    setError(null)
    setOcupado(true)
    try {
      if (estado === 'activo') {
        await desactivarPush()
      } else {
        await activarPush(perfilId)
      }
      setEstado(await estadoPush())
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  if (!soportaPush()) {
    return (
      <div className="rounded-2xl border border-dashed border-borde px-4 py-3.5 text-xs leading-relaxed text-gris">
        Este navegador no admite notificaciones.
      </div>
    )
  }

  // En iPhone, el push solo existe si la app está en la pantalla de inicio
  if (esIOSSinInstalar()) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-proceso-fondo px-4 py-3.5">
        <Icono.Campana tam={17} className="mt-0.5 shrink-0 text-proceso-texto" />
        <div>
          <div className="text-[13px] font-semibold text-proceso-texto">
            Falta instalar la app
          </div>
          <p className="mt-1 text-xs leading-relaxed text-proceso-texto">
            En iPhone las notificaciones solo funcionan con la app en la pantalla de inicio. Toca
            Compartir y luego «Añadir a pantalla de inicio», y vuelve a entrar desde ahí.
          </p>
        </div>
      </div>
    )
  }

  const activo = estado === 'activo'

  return (
    <div className="rounded-2xl border border-borde bg-white px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="grow">
          <div className="text-[13.5px] font-medium">Notificaciones en este dispositivo</div>
          <p className="mt-0.5 text-[11.5px] text-gris-claro">
            {estado === 'cargando'
              ? 'Revisando…'
              : activo
                ? 'Activas: los avisos llegan aunque la app esté cerrada'
                : 'Apagadas'}
          </p>
        </div>
        <button
          type="button"
          onClick={alternar}
          disabled={ocupado || estado === 'cargando' || estado === 'bloqueado'}
          className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-xs font-medium disabled:opacity-40 ${
            activo ? 'border border-borde bg-white text-gris' : 'bg-tinta text-white'
          }`}
        >
          {ocupado ? '…' : activo ? 'Apagar' : 'Activar'}
        </button>
      </div>

      {estado === 'bloqueado' && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-proceso-texto">
          Las bloqueaste antes. Hay que volver a permitirlas desde los ajustes del navegador para
          este sitio.
        </p>
      )}

      {error && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-proceso-texto">{error}</p>
      )}

      {activo && (
        <>
          <button
            type="button"
            onClick={async () => {
              setPrueba({ estado: 'enviando' })
              try {
                setPrueba({ estado: 'listo', ...(await probarPush()) })
              } catch (e) {
                setPrueba({ estado: 'error', mensaje: e.message })
              }
            }}
            className="mt-3 w-full cursor-pointer rounded-xl border border-borde py-2.5 text-xs font-medium text-gris"
          >
            Enviar una de prueba
          </button>

          {prueba && <ResultadoPrueba prueba={prueba} />}
        </>
      )}
    </div>
  )
}

/** Traduce el resultado del envío de prueba a algo accionable. */
function ResultadoPrueba({ prueba }) {
  if (prueba.estado === 'enviando') {
    return <p className="mt-2 text-[11.5px] text-gris-claro">Enviando…</p>
  }

  if (prueba.estado === 'error') {
    return (
      <p className="mt-2 text-[11.5px] leading-relaxed text-proceso-texto">
        No se pudo enviar: {prueba.mensaje}
      </p>
    )
  }

  if (prueba.suscripciones === 0) {
    return (
      <p className="mt-2 text-[11.5px] leading-relaxed text-proceso-texto">
        Esta cuenta no tiene ningún dispositivo suscrito. Apaga y vuelve a activar aquí.
      </p>
    )
  }

  if (prueba.errores?.length) {
    const e = prueba.errores[0]
    return (
      <p className="mt-2 text-[11.5px] leading-relaxed text-proceso-texto">
        {e.servicio} respondió {e.codigo}.
        {(e.codigo === 401 || e.codigo === 403) &&
          ' Un 401 o 403 casi siempre es la llave VAPID mal puesta en el servidor.'}
      </p>
    )
  }

  return (
    <p className="mt-2 text-[11.5px] leading-relaxed text-listo">
      Enviada a {prueba.enviados} de {prueba.suscripciones} dispositivo
      {prueba.suscripciones === 1 ? '' : 's'}. Si no aparece nada, revisa los permisos del sistema.
    </p>
  )
}

/* ------------------------------------------------------ calendario */

function TarjetaCalendario() {
  const [token, setToken] = useState(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!hayBackend) return
    cargarTokenCalendario().then(setToken).catch(() => {})
  }, [])

  if (!token) return null

  const url = `${window.location.origin}/api/calendario?t=${token}`

  // Cada plataforma se suscribe distinto:
  // - Apple registra el esquema webcal:// y abre Calendario directo.
  // - Android no lo registra, y encima la app de Google Calendar no permite
  //   agregar calendarios por URL: hay que hacerlo desde el navegador y
  //   después se sincroniza solo al teléfono.
  const esAndroid = /android/i.test(navigator.userAgent)
  const destino = esAndroid
    ? `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(url)}`
    : url.replace(/^https?:/, 'webcal:')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="rounded-2xl border border-borde bg-white px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Icono.Calendario tam={17} className="mt-0.5 shrink-0 text-gris" />
        <div className="grow">
          <div className="text-[13.5px] font-medium">Tu calendario</div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-gris-claro">
            Te suscribes una vez y de ahí en adelante tus juntas y fechas de entrega llegan solas.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <a
          href={destino}
          target={esAndroid ? '_blank' : undefined}
          rel={esAndroid ? 'noreferrer' : undefined}
          className="grow rounded-xl bg-tinta py-2.5 text-center text-xs font-medium text-white no-underline"
        >
          {esAndroid ? 'Abrir en Google Calendar' : 'Suscribirme'}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 cursor-pointer rounded-xl border border-borde px-4 py-2.5 text-xs font-medium text-gris"
        >
          {copiado ? 'Copiada' : 'Copiar URL'}
        </button>
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-gris-claro">
        {esAndroid
          ? 'Se abre Google Calendar con la URL puesta; solo confirma. Tarda unas horas en aparecer la primera vez: Google revisa los calendarios suscritos a su ritmo.'
          : 'Se abre tu app de Calendario y te pregunta si quieres suscribirte.'}
      </p>

      <p className="mt-1.5 text-[11px] leading-relaxed text-gris-claro">
        Esta URL es privada: quien la tenga puede ver tus pendientes.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------- pantalla */

export default function Actividad({ actividad, yo, avisos, onCambiarAviso, onSalir }) {
  const personas = usePersonas()

  // De entrada solo lo reciente. Lo demás está a un toque, pero no estorbando.
  const [tope, setTope] = useState(12)
  const visibles = actividad.slice(0, tope)

  return (
    <>
      <header className="px-5 pt-7 pb-4">
        <h1 className="font-display text-[42px] leading-none font-normal">Actividad</h1>
      </header>

      <div className="flex grow flex-col gap-4 overflow-y-auto px-5 pb-4">
        {actividad.length === 0 && (
          <>
            <Separador>Lo que ha pasado</Separador>
            <p className="text-[13px] text-gris-claro">Nada todavía.</p>
          </>
        )}

        {agruparPorDia(visibles).map((grupo) => (
          <div key={grupo.dia} className="flex flex-col gap-3">
            <Separador>{grupo.dia}</Separador>

            <div className="flex flex-col">
              {grupo.entradas.map((a, i) => {
                const cfg = ICONOS[a.tipo] || ICONOS.nueva
                const esUltimo = i === grupo.entradas.length - 1
                const autor = personas[a.autorId]
                return (
                  <div key={a.id} className="flex gap-3.5 py-2.5">
                    <div className="flex shrink-0 flex-col items-center">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${cfg.fondo} ${cfg.color}`}
                      >
                        <cfg.Comp tam={14} grosor={2} />
                      </span>
                      {!esUltimo && <span className="mt-1.5 w-px grow bg-borde" />}
                    </div>
                    <div className="grow pb-1.5">
                      <p className="text-[13.5px] leading-normal">
                        <span className="font-semibold">
                          {a.autorId === yo.id ? 'Tú' : autor?.nombre || 'Alguien'}
                        </span>{' '}
                        {a.texto}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-gris-claro">{hora(a.creadoEn)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {tope < actividad.length && (
          <button
            type="button"
            onClick={() => setTope((t) => t + 20)}
            className="cursor-pointer rounded-xl border border-borde bg-white py-2.5 text-xs font-medium text-gris"
          >
            Ver más
          </button>
        )}

        {tope >= actividad.length && actividad.length >= 40 && (
          <p className="text-center text-[11.5px] text-gris-claro">
            Hasta aquí llega el historial reciente.
          </p>
        )}

        <Separador>Avisos</Separador>

        {hayBackend && <TarjetaPush perfilId={yo.id} />}

        <div className="rounded-2xl border border-borde bg-white px-4">
          {AJUSTES.map((av, i) => (
            <div
              key={av.id}
              className={`flex items-center gap-3 py-3.5 ${
                i < AJUSTES.length - 1 ? 'border-b border-borde-suave' : ''
              }`}
            >
              <div className="grow">
                <div className="text-[13.5px] font-medium">{av.titulo}</div>
                {av.pie && <div className="mt-0.5 text-[11.5px] text-gris-claro">{av.pie}</div>}
              </div>
              <Interruptor
                activo={Boolean(avisos[av.id])}
                onChange={(v) => onCambiarAviso(av.id, v)}
                etiqueta={av.titulo}
              />
            </div>
          ))}
        </div>

        <Separador>Calendario</Separador>

        <TarjetaCalendario />

        {onSalir && (
          <button
            type="button"
            onClick={onSalir}
            className="mt-1 cursor-pointer rounded-2xl border border-borde bg-white py-3.5 text-[13.5px] font-medium text-gris"
          >
            Cerrar sesión de {yo.nombre}
          </button>
        )}
      </div>
    </>
  )
}
