import { useState } from 'react'
import { Avatar, Icono, Interruptor, Separador } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-09-22" + "10:00" -> ISO completo en hora local */
function juntar(dia, hora) {
  if (!dia) return null
  return new Date(`${dia}T${hora || '18:00'}:00`).toISOString()
}

const Fila = ({ etiqueta, children, ultima }) => (
  <div
    className={`flex items-center gap-3 py-3.5 ${ultima ? '' : 'border-b border-borde-suave'}`}
  >
    <span className="w-[92px] shrink-0 text-[13.5px] text-gris">{etiqueta}</span>
    <div className="grow">{children}</div>
  </div>
)

export default function Nuevo({ yo, onCancelar, onCrear }) {
  const personas = usePersonas()
  const [tipo, setTipo] = useState('pendiente')
  const [titulo, setTitulo] = useState('')
  const [nota, setNota] = useState('')
  const [paraId, setParaId] = useState(
    Object.values(personas).find((p) => p.id !== yo.id)?.id || yo.id,
  )
  const [dia, setDia] = useState(hoyISO())
  const [inicio, setInicio] = useState('10:00')
  const [fin, setFin] = useState('11:00')
  const [limite, setLimite] = useState('18:00')
  const [prioridad, setPrioridad] = useState('normal')
  const [alCalendario, setAlCalendario] = useState(true)

  const esJunta = tipo === 'junta'
  const para = personas[paraId]
  const listo = titulo.trim().length > 0

  function guardar(e) {
    e.preventDefault()
    if (!listo) return
    onCrear({
      tipo,
      titulo: titulo.trim(),
      nota: nota.trim(),
      estado: 'pendiente',
      prioridad,
      creadorId: yo.id,
      asignadoId: paraId,
      venceEn: esJunta ? null : juntar(dia, limite),
      iniciaEn: esJunta ? juntar(dia, inicio) : null,
      terminaEn: esJunta ? juntar(dia, fin) : null,
      alCalendario,
    })
  }

  return (
    <form onSubmit={guardar} className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-3.5">
        <button
          type="button"
          onClick={onCancelar}
          className="cursor-pointer text-[13.5px] text-gris"
        >
          Cancelar
        </button>
        <span className="rotulo">Nuevo</span>
        <button
          type="submit"
          disabled={!listo}
          className="cursor-pointer rounded-full bg-tinta px-4 py-2 text-[13px] font-medium text-white disabled:opacity-30"
        >
          Guardar
        </button>
      </header>

      <div className="flex grow flex-col gap-4 overflow-y-auto px-5 pb-4">
        <div className="flex gap-1.5 rounded-xl bg-borde-suave p-1">
          {[
            { id: 'pendiente', etiqueta: 'Pendiente' },
            { id: 'junta', etiqueta: 'Junta' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id)}
              className={`grow cursor-pointer rounded-lg py-2.5 text-[13px] ${
                tipo === t.id
                  ? 'bg-white font-semibold text-tinta'
                  : 'font-medium text-pendiente-texto'
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="titulo" className="sr-only">
            Título
          </label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={esJunta ? 'Revisión de avances' : '¿Qué hay que hacer?'}
            autoFocus
            className="w-full bg-transparent py-0.5 font-display text-[27px] leading-tight outline-none placeholder:text-[#C9C5BA]"
          />
          <label htmlFor="nota" className="sr-only">
            Nota
          </label>
          <input
            id="nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Agrega una nota…"
            className="mt-2 w-full bg-transparent py-0.5 text-[13.5px] text-gris outline-none placeholder:text-[#C9C5BA]"
          />
        </div>

        <div className="rounded-2xl border border-borde bg-white px-4">
          <Fila etiqueta={esJunta ? 'Con' : 'Para'}>
            <div className="flex gap-1.5">
              {Object.values(personas).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setParaId(p.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] ${
                    paraId === p.id
                      ? 'border-tinta bg-tinta text-white'
                      : 'border-borde text-tinta-suave'
                  }`}
                >
                  <Avatar persona={p} tam={22} oscuro={paraId !== p.id} />
                  {p.id === yo.id ? 'Yo' : p.nombre}
                </button>
              ))}
            </div>
          </Fila>

          <Fila etiqueta="Día">
            <input
              type="date"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              aria-label="Día"
              className="w-full bg-transparent text-[13.5px] font-medium outline-none"
            />
          </Fila>

          {esJunta ? (
            <Fila etiqueta="Hora">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  aria-label="Hora de inicio"
                  className="rounded-lg bg-borde-suave px-2.5 py-1.5 text-[13.5px] font-medium outline-none"
                />
                <span className="text-xs text-gris-claro">a</span>
                <input
                  type="time"
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  aria-label="Hora de fin"
                  className="rounded-lg bg-borde-suave px-2.5 py-1.5 text-[13.5px] font-medium outline-none"
                />
              </div>
            </Fila>
          ) : (
            <Fila etiqueta="Hora límite">
              <input
                type="time"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                aria-label="Hora límite"
                className="rounded-lg bg-borde-suave px-2.5 py-1.5 text-[13.5px] font-medium outline-none"
              />
            </Fila>
          )}

          <Fila etiqueta="Prioridad" ultima>
            <div className="flex gap-1.5">
              {['baja', 'normal', 'alta'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridad(p)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs capitalize ${
                    prioridad === p
                      ? 'border-tinta bg-tinta font-medium text-white'
                      : 'border-borde text-gris'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Fila>
        </div>

        <Separador>Calendario</Separador>

        <div className="rounded-2xl border border-borde bg-white px-4">
          <div className="flex items-center gap-3 py-[15px]">
            <div className="grow">
              <div className="text-[13.5px] font-medium">Mandar al calendario</div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-gris-claro">
                Aparece junto a todo lo demás, y si mueves la hora aquí, se mueve allá.
              </p>
            </div>
            <Interruptor
              activo={alCalendario}
              onChange={setAlCalendario}
              etiqueta="Mandar al calendario"
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-borde-suave px-4 py-3.5">
          <Icono.Calendario tam={17} className="mt-0.5 shrink-0 text-pendiente-texto" />
          <p className="text-xs leading-relaxed text-pendiente-texto">
            {para.id === yo.id
              ? 'Se agregará a tu calendario suscrito.'
              : `${para.nombre} lo verá en su lista y le llegará una notificación.`}
          </p>
        </div>
      </div>

      <div className="px-5 pt-4 pb-6">
        <button
          type="submit"
          disabled={!listo}
          className="w-full cursor-pointer rounded-2xl bg-tinta py-[15px] text-sm font-medium text-white disabled:opacity-30"
        >
          {para.id === yo.id ? 'Crear' : `Crear y avisar a ${para.nombre}`}
        </button>
      </div>
    </form>
  )
}
