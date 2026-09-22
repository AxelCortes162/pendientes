// Piezas que se repiten en varias pantallas: iconos, chips, avatares.

import { ESTADOS } from './datos.js'

/* ---------- Iconos ---------- */
// Todos con el mismo grosor de trazo para que se vean de la misma familia.

function Svg({ children, tam = 20, grosor = 1.8, ...resto }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...resto}
    >
      {children}
    </svg>
  )
}

export const Icono = {
  Lista: (p) => (
    <Svg {...p}>
      <path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" />
      <path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" />
    </Svg>
  ),
  Equipo: (p) => (
    <Svg {...p}>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M17 4.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M22 20v-1.5a4 4 0 0 0-3-3.8" />
    </Svg>
  ),
  Campana: (p) => (
    <Svg {...p}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  ),
  Reloj: (p) => (
    <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
  ),
  Comentario: (p) => (
    <Svg {...p}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    </Svg>
  ),
  Palomita: (p) => (
    <Svg grosor={2.6} {...p}><path d="M20 6 9 17l-5-5" /></Svg>
  ),
  Flecha: (p) => (
    <Svg {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>
  ),
  Enviar: (p) => (
    <Svg {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>
  ),
  Play: (p) => (
    <Svg {...p}><path d="M6 4v16" /><path d="m18 12-9 5V7l9 5z" /></Svg>
  ),
  Ojo: (p) => (
    <Svg {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  Calendario: (p) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" />
    </Svg>
  ),
  Mas: (p) => (
    <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
  ),
}

/* ---------- Piezas ---------- */

export function ChipEstado({ estado }) {
  const e = ESTADOS[estado]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${e.fondo} ${e.texto}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} />
      {e.nombre}
    </span>
  )
}

export function Avatar({ persona, tam = 30, oscuro = false }) {
  return (
    <span
      style={{ width: tam, height: tam, fontSize: tam * 0.36 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${
        oscuro ? 'bg-tinta text-papel' : 'border border-borde bg-white text-tinta'
      }`}
    >
      {persona.iniciales}
    </span>
  )
}

/** Rótulo pequeño con una línea que se come el espacio sobrante. */
export function Separador({ children }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rotulo">{children}</span>
      <span className="h-px grow bg-borde" />
    </div>
  )
}

export function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onChange(!activo)}
      className={`flex h-[25px] w-[42px] shrink-0 cursor-pointer items-center rounded-full px-[3px] transition-colors ${
        activo ? 'justify-end bg-tinta' : 'justify-start bg-[#DFDCD3]'
      }`}
    >
      <span className="h-[19px] w-[19px] rounded-full bg-white" />
    </button>
  )
}

/** Barra de navegación de abajo. */
export function BarraInferior({ vista, irA, hayAvisos }) {
  const tabs = [
    { id: 'mios', etiqueta: 'Míos', Icono: Icono.Lista },
    { id: 'equipo', etiqueta: 'Equipo', Icono: Icono.Equipo },
    { id: 'actividad', etiqueta: 'Actividad', Icono: Icono.Campana },
  ]
  return (
    <nav className="flex shrink-0 justify-between border-t border-borde bg-lienzo px-5 pt-2.5 pb-5">
      {tabs.map((t) => {
        const activo = vista === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => irA(t.id)}
            aria-current={activo ? 'page' : undefined}
            className={`relative flex grow cursor-pointer flex-col items-center gap-1.5 py-1.5 ${
              activo ? 'text-tinta' : 'text-gris-claro'
            }`}
          >
            <t.Icono />
            <span className={`text-[10px] tracking-wide ${activo ? 'font-semibold' : 'font-medium'}`}>
              {t.etiqueta}
            </span>
            {t.id === 'actividad' && hayAvisos && (
              <span className="absolute top-1 right-[34px] h-[7px] w-[7px] rounded-full bg-proceso" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
