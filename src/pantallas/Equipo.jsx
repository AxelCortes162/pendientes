import TarjetaFicha from '../componentes/TarjetaFicha.jsx'
import { Avatar, Icono, Separador } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'
import { duracion, hora, segundosVividos } from '../datos.js'

export default function Equipo({ fichas, yo, ahora, onAbrir, onCambiarEstado, onNuevo }) {
  const personas = usePersonas()

  // Todo lo que yo le encargué a alguien más
  const asignadas = fichas.filter((f) => f.creadorId === yo.id && f.asignadoId !== yo.id)

  const porRevisar = asignadas.filter((f) => f.estado === 'revision')
  const enProceso = asignadas.filter((f) => f.estado === 'proceso')
  const resto = asignadas.filter((f) => f.estado === 'pendiente')

  const otro = Object.values(personas).find((p) => p.id !== yo.id)

  return (
    <>
      <header className="flex shrink-0 flex-col gap-3.5 px-5 pt-7 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="rotulo text-gris">Hola, {yo.nombre}</span>
            <h1 className="font-display text-[42px] leading-none font-normal">Equipo</h1>
          </div>
          <Avatar persona={yo} tam={44} oscuro />
        </div>
      </header>

      <div className="flex grow flex-col gap-4 overflow-y-auto px-5 pb-4">
        {porRevisar.length > 0 && (
          <>
            {porRevisar.map((f) => (
              <article
                key={f.id}
                className="flex flex-col gap-3.5 rounded-[18px] bg-tinta p-[18px]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-[7px] w-[7px] rounded-full bg-[#E8A87C]" />
                  <span className="text-[11px] tracking-[0.12em] text-[#C9C5BA] uppercase">
                    Espera tu revisión
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onAbrir(f.id)}
                  className="cursor-pointer text-left font-display text-[22px] leading-tight text-papel"
                >
                  {f.titulo}
                </button>

                <p className="text-xs text-[#A8A396]">
                  {personas[f.asignadoId].nombre} lo terminó · {duracion(f.segundosTrabajados)}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCambiarEstado(f.id, 'listo')}
                    className="grow cursor-pointer rounded-xl bg-papel py-3 text-[13px] font-medium text-tinta"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => onCambiarEstado(f.id, 'proceso')}
                    className="grow cursor-pointer rounded-xl border border-[#4A473F] py-3 text-[13px] font-medium text-papel"
                  >
                    Pedir cambios
                  </button>
                </div>
              </article>
            ))}
          </>
        )}

        {enProceso.length > 0 && (
          <>
            <Separador>Trabajando ahora</Separador>
            {enProceso.map((f) => {
              const trabajado = segundosVividos(f, ahora)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onAbrir(f.id)}
                  className="w-full cursor-pointer rounded-2xl border border-borde bg-white px-4 py-[15px] text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar persona={personas[f.asignadoId]} tam={32} />
                    <div className="grow">
                      <div className="text-[15px] leading-snug font-medium">{f.titulo}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-proceso-texto">
                        <span className="h-[5px] w-[5px] rounded-full bg-proceso" />
                        {personas[f.asignadoId].nombre} lleva {duracion(trabajado)}
                        {f.iniciadoEn && ` · desde las ${hora(f.iniciadoEn)}`}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {resto.length > 0 && (
          <>
            <Separador>Sin empezar</Separador>
            {resto.map((f) => (
              <TarjetaFicha
                key={f.id}
                ficha={f}
                yo={yo}
                ahora={ahora}
                onAbrir={onAbrir}
              />
            ))}
          </>
        )}

        {asignadas.length === 0 && (
          <p className="rounded-2xl border border-dashed border-borde px-4 py-8 text-center text-[13px] text-gris-claro">
            No le has encargado nada a {otro?.nombre} todavía.
          </p>
        )}

        <div className="flex items-start gap-3 rounded-2xl bg-borde-suave px-4 py-3.5">
          <Icono.Campana tam={17} className="mt-0.5 shrink-0 text-pendiente-texto" />
          <div>
            <div className="text-[13px] font-semibold">Resumen diario 8:30</div>
            <p className="mt-0.5 text-xs leading-relaxed text-pendiente-texto">
              Una sola notificación al día con lo que vence, lo que se movió y lo que espera tu
              revisión.
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-5 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={onNuevo}
          className="w-full cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white"
        >
          Asignar pendiente a {otro?.nombre}
        </button>
      </div>
    </>
  )
}
