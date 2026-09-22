import { useState } from 'react'
import TarjetaFicha from '../componentes/TarjetaFicha.jsx'
import { Avatar, Icono, Separador } from '../ui.jsx'
import { cerroEn, diaLargo, yaPaso } from '../datos.js'

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
  const [verAnteriores, setVerAnteriores] = useState(false)

  const activas = fichas.filter((f) => f.estado !== 'listo' && !yaPaso(f, ahora))

  // Lo terminado hace semanas no tiene por qué seguir en la pantalla
  // principal: esta lista es para lo que está vivo.
  const terminadas = fichas.filter((f) => f.estado === 'listo' || yaPaso(f, ahora))
  const deHoy = terminadas.filter((f) => esHoy(cerroEn(f)))
  const anteriores = terminadas.length - deHoy.length
  const visiblesTerminadas = verAnteriores ? terminadas : deHoy

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
      <header className="banda shrink-0">
        <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div>
            <span className="rotulo text-papel/55">{diaLargo(new Date().toISOString())}</span>
            <h1 className="font-display mt-1 text-[46px] leading-[0.9] font-normal">Pendientes</h1>
            <span className="mt-1 block text-[11px] tracking-[0.34em] text-papel/45">
              ペンディエンテス
            </span>
          </div>
          <Avatar persona={yo} tam={44} />
        </div>

        {/* Franja roja: el estado de hoy, de un vistazo */}
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-proceso px-5 py-2 text-[10px] font-bold tracking-[0.16em] text-white uppercase">
          <span>{activas.length} activos</span>
          {vencenHoy > 0 && <span>· {vencenHoy} vence hoy</span>}
          {enRevision > 0 && <span>· {enRevision} en revisión</span>}
        </p>
      </header>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-5 pt-4 pb-3.5">
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
              <Separador>{verAnteriores ? 'Finalizados' : 'Finalizados hoy'}</Separador>
            </div>

            {visiblesTerminadas.length === 0 && (
              <p className="px-0.5 text-[13px] text-gris-claro">Nada todavía hoy.</p>
            )}

            {visiblesTerminadas.map((f) => (
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

            {anteriores > 0 && (
              <button
                type="button"
                onClick={() => setVerAnteriores((v) => !v)}
                className="cursor-pointer self-start px-0.5 py-1 text-[12.5px] text-gris underline decoration-borde underline-offset-4"
              >
                {verAnteriores
                  ? 'Ocultar los anteriores'
                  : `Ver ${anteriores} anterior${anteriores === 1 ? '' : 'es'}`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 px-5 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={onNuevo}
          className="w-full cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white"
        >
          Nuevo pendiente
        </button>
      </div>
    </>
  )
}
