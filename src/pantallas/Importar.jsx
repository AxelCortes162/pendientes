import { useState } from 'react'
import { Avatar, Icono, Separador } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'
import { leerNotas } from '../lib/importar.js'
import { aFicha, textoJunta, textoVencimiento } from '../datos.js'

export default function Importar({ yo, textoInicial = '', onCancelar, onCrear }) {
  const personas = usePersonas()
  const [texto, setTexto] = useState(textoInicial)
  const [leyendo, setLeyendo] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState(null)

  const otro = Object.values(personas).find((p) => p.id !== yo.id)
  const elegidos = items?.filter((i) => i.elegido) || []

  async function leer() {
    setLeyendo(true)
    setError(null)
    try {
      const lista = await leerNotas(texto)
      setItems(lista.map((i) => ({ ...i, elegido: true })))
    } catch (e) {
      setError(e.message)
    } finally {
      setLeyendo(false)
    }
  }

  function cambiar(i, cambios) {
    setItems((prev) => prev.map((it, n) => (n === i ? { ...it, ...cambios } : it)))
  }

  function crear() {
    onCrear(elegidos.map((i) => aFicha(i, yo.id, otro?.id)))
  }

  return (
    <>
      <header className="banda shrink-0">
        <div className="flex items-center gap-2 px-3 pt-5 pb-4">
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Volver"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-papel"
          >
            <Icono.Flecha grosor={1.9} />
          </button>
          <div>
            <h1 className="font-display text-[30px] leading-none">De una junta</h1>
            <span className="mt-1 block text-[10px] tracking-[0.3em] text-papel/45">
              ミーティング
            </span>
          </div>
        </div>
      </header>

      <div className="flex grow flex-col gap-4 overflow-y-auto px-5 pt-4 pb-4">
        {!items && (
          <>
            <p className="text-[13px] leading-relaxed text-gris">
              Pega aquí las notas de la junta —las de Granola, un correo, o lo que hayas
              escrito— y saco los pendientes. Tú decides cuáles se crean.
            </p>

            <label htmlFor="notas" className="sr-only">
              Notas de la junta
            </label>
            <textarea
              id="notas"
              name="notas"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pega las notas aquí…"
              rows={12}
              className="w-full rounded-2xl border border-borde bg-white p-4 text-[13.5px] leading-relaxed outline-none placeholder:text-punto"
            />
          </>
        )}

        {error && (
          <p className="rounded-2xl border border-proceso bg-proceso-fondo px-4 py-3 text-[13px] text-proceso-texto">
            {error}
          </p>
        )}

        {items && items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-borde px-4 py-8 text-center text-[13px] text-gris-claro">
            No encontré pendientes claros en esas notas.
          </p>
        )}

        {items && items.length > 0 && (
          <>
            <Separador>{items.length} encontrados</Separador>

            {items.map((item, i) => {
              const ficha = aFicha(item, yo.id, otro?.id)
              const cuando =
                ficha.tipo === 'junta'
                  ? textoJunta(ficha.iniciaEn)
                  : textoVencimiento(ficha.venceEn).texto
              const para = personas[ficha.asignadoId]

              return (
                <div
                  key={i}
                  className={`rounded-2xl border bg-white px-4 py-3.5 ${
                    item.elegido ? 'border-borde' : 'border-borde-suave opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => cambiar(i, { elegido: !item.elegido })}
                      aria-label={item.elegido ? 'Quitar de la lista' : 'Agregar a la lista'}
                      aria-pressed={item.elegido}
                      className={`mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-md border ${
                        item.elegido
                          ? 'border-tinta bg-tinta text-white'
                          : 'border-borde bg-white'
                      }`}
                    >
                      {item.elegido && <Icono.Palomita tam={13} />}
                    </button>

                    <div className="grow">
                      <label htmlFor={`titulo-${i}`} className="sr-only">
                        Título del pendiente {i + 1}
                      </label>
                      <input
                        id={`titulo-${i}`}
                        type="text"
                        value={item.titulo}
                        onChange={(e) => cambiar(i, { titulo: e.target.value })}
                        className="w-full bg-transparent text-[15px] leading-snug font-medium outline-none"
                      />
                      {item.nota && (
                        <p className="mt-1 text-xs leading-relaxed text-gris">{item.nota}</p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-gris">
                        {ficha.tipo === 'junta' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-borde-suave px-2 py-1 font-semibold tracking-[0.08em] uppercase">
                            <Icono.Calendario tam={10} grosor={2.2} />
                            Junta
                          </span>
                        )}
                        <span>{cuando}</span>
                        <span className="grow" />
                        {otro && (
                          <button
                            type="button"
                            onClick={() => cambiar(i, { para: item.para === 'otro' ? 'yo' : 'otro' })}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-borde py-0.5 pr-2.5 pl-0.5"
                          >
                            <Avatar persona={para} tam={20} oscuro />
                            {para.id === yo.id ? 'Yo' : para.nombre}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => setItems(null)}
              className="cursor-pointer self-start px-0.5 py-1 text-[12.5px] text-gris underline decoration-borde underline-offset-4"
            >
              Volver a las notas
            </button>
          </>
        )}
      </div>

      <div className="shrink-0 px-5 pt-3.5 pb-2.5">
        {items ? (
          <button
            type="button"
            onClick={crear}
            disabled={elegidos.length === 0}
            className="w-full cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white disabled:opacity-30"
          >
            {elegidos.length === 1 ? 'Crear 1 pendiente' : `Crear ${elegidos.length} pendientes`}
          </button>
        ) : (
          <button
            type="button"
            onClick={leer}
            disabled={!texto.trim() || leyendo}
            className="w-full cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white disabled:opacity-30"
          >
            {leyendo ? 'Leyendo…' : 'Leer notas'}
          </button>
        )}
      </div>
    </>
  )
}
