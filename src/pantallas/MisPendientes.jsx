import { useState } from 'react'
import TarjetaFicha from '../componentes/TarjetaFicha.jsx'
import { Avatar, Icono, Separador } from '../ui.jsx'
import { diaLargo } from '../datos.js'

const FILTROS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'proceso', etiqueta: 'En proceso' },
  { id: 'revision', etiqueta: 'Revisión' },
]

function esHoy(iso) {
  if (!iso) return false
  const a = new Date(iso)
  const b = new Date()
  return a.toDateString() === b.toDateString()
}

export default function MisPendientes({ fichas, yo, ahora, onAbrir, onNuevo }) {
  const [filtro, setFiltro] = useState('todos')

  const activas = fichas.filter((f) => f.estado !== 'listo')
  const terminadas = fichas.filter((f) => f.estado === 'listo')

  const visibles = activas.filter((f) => {
    if (filtro === 'hoy') return esHoy(f.venceEn) || esHoy(f.iniciaEn)
    if (filtro === 'proceso') return f.estado === 'proceso'
    if (filtro === 'revision') return f.estado === 'revision'
    return true
  })

  const vencenHoy = activas.filter((f) => esHoy(f.venceEn)).length
  const enRevision = activas.filter((f) => f.estado === 'revision').length

  return (
    <>
      <header className="flex flex-col gap-3.5 px-5 pt-7 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="rotulo text-gris">{diaLargo(new Date().toISOString())}</span>
            <h1 className="font-display text-[42px] leading-none font-normal">Pendientes</h1>
          </div>
          <Avatar persona={yo} tam={44} />
        </div>

        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-gris">
          <span className="font-semibold text-tinta">{activas.length} activos</span>
          {vencenHoy > 0 && (
            <>
              <span className="h-[3px] w-[3px] rounded-full bg-punto" />
              <span>{vencenHoy} vence hoy</span>
            </>
          )}
          {enRevision > 0 && (
            <>
              <span className="h-[3px] w-[3px] rounded-full bg-punto" />
              <span>{enRevision} esperando revisión</span>
            </>
          )}
        </p>
      </header>

      <div className="flex gap-1.5 overflow-x-auto px-5 pb-3.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-2 text-xs font-medium ${
              filtro === f.id
                ? 'border-tinta bg-tinta text-white'
                : 'border-borde bg-white text-tinta-suave'
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <div className="flex grow flex-col gap-2.5 overflow-y-auto px-5 pb-4">
        {visibles.length === 0 && (
          <p className="rounded-2xl border border-dashed border-borde px-4 py-8 text-center text-[13px] text-gris-claro">
            Nada por aquí. Buen momento para cerrar el laptop.
          </p>
        )}

        {visibles.map((ficha) => (
          <TarjetaFicha
            key={ficha.id}
            ficha={ficha}
            yo={yo}
            ahora={ahora}
            onAbrir={onAbrir}
          />
        ))}

        {terminadas.length > 0 && filtro === 'todos' && (
          <>
            <div className="mt-1.5">
              <Separador>Finalizados</Separador>
            </div>
            {terminadas.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onAbrir(f.id)}
                className="flex w-full cursor-pointer items-center gap-2.5 px-0.5 py-1 text-left"
              >
                <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-listo-fondo text-listo">
                  <Icono.Palomita tam={11} />
                </span>
                <span className="text-sm text-gris-claro line-through">{f.titulo}</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="px-5 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={onNuevo}
          className="w-full cursor-pointer rounded-2xl bg-tinta py-[15px] text-sm font-medium text-white"
        >
          Nuevo pendiente
        </button>
      </div>
    </>
  )
}
