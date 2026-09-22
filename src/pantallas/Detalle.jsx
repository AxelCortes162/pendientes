import { useState } from 'react'
import { Avatar, Icono, Separador } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'
import {
  ORDEN_ESTADOS,
  diaLargo,
  duracion,
  hora,
  segundosVividos,
  textoJunta,
  textoVencimiento,
} from '../datos.js'
import { descargarICS } from '../lib/ics.js'

const PASOS = [
  { id: 'pendiente', corto: 'Pendiente' },
  { id: 'proceso', corto: 'En proceso' },
  { id: 'revision', corto: 'Revisión' },
  { id: 'listo', corto: 'Listo' },
]

function Linea({ hecha }) {
  return <span className={`mb-[18px] h-px w-[22px] ${hecha ? 'bg-tinta' : 'bg-borde'}`} />
}

function Paso({ paso, estadoActual }) {
  const iActual = ORDEN_ESTADOS.indexOf(estadoActual)
  const i = ORDEN_ESTADOS.indexOf(paso.id)
  const esActual = i === iActual
  const hecho = i < iActual

  return (
    <div className="flex grow flex-col items-center gap-1.5">
      {esActual ? (
        <span className="h-[15px] w-[15px] rounded-full bg-proceso ring-4 ring-proceso-fondo" />
      ) : hecho ? (
        <span className="h-[11px] w-[11px] rounded-full bg-tinta" />
      ) : (
        <span className="h-[11px] w-[11px] rounded-full border border-[#D5D1C6] bg-white" />
      )}
      <span
        className={`text-[9px] tracking-wider uppercase ${
          esActual
            ? 'font-semibold text-proceso-texto'
            : hecho
              ? 'text-gris'
              : 'text-[#A8A396]'
        }`}
      >
        {paso.corto}
      </span>
    </div>
  )
}

export default function Detalle({ ficha, yo, ahora, onVolver, onCambiarEstado, onComentar }) {
  const [borrador, setBorrador] = useState('')
  const personas = usePersonas()

  const creador = personas[ficha.creadorId]
  const asignado = personas[ficha.asignadoId]
  const soyAsignado = yo.id === ficha.asignadoId
  const soyCreador = yo.id === ficha.creadorId
  const esJunta = ficha.tipo === 'junta'
  const vence = textoVencimiento(ficha.venceEn)
  const trabajado = segundosVividos(ficha, ahora)

  function enviar(e) {
    e.preventDefault()
    const texto = borrador.trim()
    if (!texto) return
    onComentar(ficha.id, texto)
    setBorrador('')
  }

  // Qué botón toca según el estado y quién eres
  let acciones = null
  if (esJunta) {
    acciones = (
      <button
        type="button"
        onClick={() => descargarICS(ficha)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white"
      >
        <Icono.Calendario tam={17} grosor={2} />
        Agregar a mi calendario
      </button>
    )
  } else if (ficha.estado === 'pendiente' && soyAsignado) {
    acciones = (
      <button
        type="button"
        onClick={() => onCambiarEstado(ficha.id, 'proceso')}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white"
      >
        <Icono.Play tam={16} grosor={2.2} />
        Empezar ahora
      </button>
    )
  } else if (ficha.estado === 'proceso' && soyAsignado) {
    acciones = (
      <button
        type="button"
        onClick={() => onCambiarEstado(ficha.id, 'revision')}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white"
      >
        <Icono.Palomita tam={17} />
        Enviar a revisión de {creador.nombre}
      </button>
    )
  } else if (ficha.estado === 'revision' && soyCreador) {
    acciones = (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onCambiarEstado(ficha.id, 'listo')}
          className="grow cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => onCambiarEstado(ficha.id, 'proceso')}
          className="grow cursor-pointer rounded-2xl border border-borde bg-white py-[15px] text-sm font-medium text-tinta-suave"
        >
          Pedir cambios
        </button>
      </div>
    )
  } else if (ficha.estado === 'revision') {
    acciones = (
      <p className="rounded-2xl border border-dashed border-borde py-4 text-center text-[13px] text-gris">
        Esperando el visto bueno de {creador.nombre}
      </p>
    )
  } else if (ficha.estado === 'listo') {
    acciones = (
      <button
        type="button"
        onClick={() => onCambiarEstado(ficha.id, 'pendiente')}
        className="w-full cursor-pointer rounded-2xl border border-borde bg-white py-[15px] text-sm font-medium text-tinta-suave"
      >
        Reabrir
      </button>
    )
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between px-5 pt-6 pb-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver a la lista"
          className="-ml-2.5 flex h-11 w-11 cursor-pointer items-center justify-center"
        >
          <Icono.Flecha grosor={1.9} />
        </button>
        {ficha.alCalendario && !esJunta && (
          <button
            type="button"
            onClick={() => descargarICS(ficha)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gris"
          >
            <Icono.Calendario tam={15} />
            Al calendario
          </button>
        )}
      </header>

      <div className="flex grow flex-col gap-[18px] overflow-y-auto px-5 pb-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-3xl leading-tight font-normal">{ficha.titulo}</h1>
          <p className="flex items-center gap-2 text-xs text-gris">
            <span>
              {soyAsignado
                ? `${creador.nombre} te lo asignó`
                : `Se lo asignaste a ${asignado.nombre}`}
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-punto" />
            <span>{diaLargo(ficha.creadoEn)}</span>
          </p>
        </div>

        {esJunta ? (
          <div className="rounded-2xl border border-borde bg-white p-4">
            <div className="rotulo">Cuándo</div>
            <div className="mt-1.5 font-display text-[22px]">{textoJunta(ficha.iniciaEn)}</div>
            <div className="mt-1 text-xs text-gris">
              {diaLargo(ficha.iniciaEn)} · {hora(ficha.iniciaEn)}
              {ficha.terminaEn && ` a ${hora(ficha.terminaEn)}`}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 rounded-2xl border border-borde bg-white p-4">
            <div className="flex items-center">
              {PASOS.map((paso, i) => (
                <div key={paso.id} className="contents">
                  {i > 0 && (
                    <Linea hecha={ORDEN_ESTADOS.indexOf(ficha.estado) >= i} />
                  )}
                  <Paso paso={paso} estadoActual={ficha.estado} />
                </div>
              ))}
            </div>

            {(ficha.estado === 'proceso' || trabajado > 0) && (
              <>
                <div className="h-px bg-borde-suave" />
                <p className="flex items-center gap-2 text-xs text-gris">
                  <Icono.Reloj tam={14} grosor={2} className="text-proceso" />
                  {ficha.estado === 'proceso' && ficha.iniciadoEn
                    ? `Iniciado a las ${hora(ficha.iniciadoEn)} · `
                    : 'Tiempo total: '}
                  <span className="font-medium text-tinta">{duracion(trabajado)}</span>
                </p>
              </>
            )}
          </div>
        )}

        {ficha.nota && (
          <p className="text-sm leading-relaxed text-tinta-suave">{ficha.nota}</p>
        )}

        {!esJunta && (
          <div className="flex gap-2">
            <div className="grow rounded-xl border border-borde bg-white px-3 py-2.5">
              <div className="rotulo text-[10px]">Vence</div>
              <div
                className={`mt-1 text-[13px] font-medium ${vence.urgente ? 'text-proceso-texto' : ''}`}
              >
                {ficha.venceEn ? `${diaLargo(ficha.venceEn).split(' ').slice(0, 2).join(' ')} ${hora(ficha.venceEn)}` : 'Sin fecha'}
              </div>
            </div>
            <div className="grow rounded-xl border border-borde bg-white px-3 py-2.5">
              <div className="rotulo text-[10px]">Prioridad</div>
              <div className="mt-1 text-[13px] font-medium capitalize">{ficha.prioridad}</div>
            </div>
          </div>
        )}

        <Separador>Comentarios</Separador>

        {ficha.comentarios.length === 0 && (
          <p className="text-[13px] text-gris-claro">Todavía nadie dice nada.</p>
        )}

        <div className="flex flex-col gap-3.5">
          {ficha.comentarios.map((c) => {
            const mio = c.autorId === yo.id
            const autor = personas[c.autorId]
            return (
              <div key={c.id} className={`flex gap-2.5 ${mio ? 'flex-row-reverse' : ''}`}>
                <Avatar persona={autor} oscuro={!mio} />
                <div className="grow">
                  <div
                    className={`flex items-baseline gap-1.5 ${mio ? 'flex-row-reverse' : ''}`}
                  >
                    <span className="text-[13px] font-semibold">
                      {mio ? 'Tú' : autor.nombre}
                    </span>
                    <span className="text-[11px] text-gris-claro">{hora(c.creadoEn)}</span>
                  </div>
                  <div
                    className={`mt-1.5 px-3 py-2.5 text-[13.5px] leading-normal ${
                      mio
                        ? 'rounded-[14px_4px_14px_14px] bg-tinta text-papel'
                        : 'rounded-[4px_14px_14px_14px] border border-borde bg-white text-tinta-suave'
                    }`}
                  >
                    {c.texto}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-borde bg-lienzo px-5 pt-3 pb-5">
        <form
          onSubmit={enviar}
          className="flex items-center gap-2 rounded-full border border-borde bg-white py-1 pr-1 pl-4"
        >
          <label htmlFor="comentario" className="sr-only">
            Escribe un comentario
          </label>
          <input
            id="comentario"
            type="text"
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            placeholder="Escribe un comentario…"
            className="grow bg-transparent py-2.5 text-[13.5px] outline-none"
          />
          <button
            type="submit"
            aria-label="Enviar comentario"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-tinta text-white disabled:opacity-40"
            disabled={!borrador.trim()}
          >
            <Icono.Enviar tam={17} grosor={2} />
          </button>
        </form>
        {acciones}
      </div>
    </>
  )
}
