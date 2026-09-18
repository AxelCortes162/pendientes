import { Icono, Interruptor, Separador } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'
import { hora } from '../datos.js'

const ICONOS = {
  inicio: { Comp: Icono.Play, fondo: 'bg-proceso-fondo', color: 'text-proceso-texto' },
  comentario: { Comp: Icono.Comentario, fondo: 'bg-borde-suave', color: 'text-pendiente-texto' },
  revision: { Comp: Icono.Ojo, fondo: 'bg-revision-fondo', color: 'text-revision-texto' },
  listo: { Comp: Icono.Palomita, fondo: 'bg-listo-fondo', color: 'text-listo' },
  nueva: { Comp: Icono.Mas, fondo: 'bg-borde-suave', color: 'text-pendiente-texto' },
}

function fechaCorta(iso) {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return hora(iso)
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora(iso)}`
  return `${d.getDate()}/${d.getMonth() + 1} ${hora(iso)}`
}

export default function Actividad({ actividad, yo, avisos, onCambiarAviso, onSalir }) {
  const personas = usePersonas()

  return (
    <>
      <header className="px-5 pt-7 pb-4">
        <h1 className="font-display text-[42px] leading-none font-normal">Actividad</h1>
      </header>

      <div className="flex grow flex-col gap-4 overflow-y-auto px-5 pb-4">
        <Separador>Lo que ha pasado</Separador>

        <div className="flex flex-col">
          {actividad.length === 0 && (
            <p className="text-[13px] text-gris-claro">Nada todavía.</p>
          )}

          {actividad.map((a, i) => {
            const cfg = ICONOS[a.tipo] || ICONOS.nueva
            const esUltimo = i === actividad.length - 1
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
                      {a.autorId === yo.id ? 'Tú' : autor?.nombre}
                    </span>{' '}
                    {a.texto}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-gris-claro">{fechaCorta(a.creadoEn)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <Separador>Avisos</Separador>

        <div className="rounded-2xl border border-borde bg-white px-4">
          {[
            { id: 'asignacion', titulo: 'Me asignan un pendiente' },
            { id: 'comentario', titulo: 'Comentario nuevo' },
            {
              id: 'vencimiento',
              titulo: 'Recordatorio antes de vencer',
              pie: '24 h antes y a las 9:00 del día',
            },
            {
              id: 'silencio',
              titulo: 'No molestar 20:00 – 8:00',
              pie: 'Se acumulan y llegan por la mañana',
            },
          ].map((av, i, todos) => (
            <div
              key={av.id}
              className={`flex items-center gap-3 py-3.5 ${
                i < todos.length - 1 ? 'border-b border-borde-suave' : ''
              }`}
            >
              <div className="grow">
                <div className="text-[13.5px] font-medium">{av.titulo}</div>
                {av.pie && <div className="mt-0.5 text-[11.5px] text-gris-claro">{av.pie}</div>}
              </div>
              <Interruptor
                activo={avisos[av.id]}
                onChange={(v) => onCambiarAviso(av.id, v)}
                etiqueta={av.titulo}
              />
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-borde-suave px-4 py-3.5">
          <Icono.Calendario tam={17} className="mt-0.5 shrink-0 text-pendiente-texto" />
          <p className="text-xs leading-relaxed text-pendiente-texto">
            Te suscribes al calendario una sola vez desde Ajustes. Después, cada junta y cada fecha
            de entrega llega sola.
          </p>
        </div>

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
