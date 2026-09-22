import { ChipEstado, Icono } from '../ui.jsx'
import { usePersonas } from '../lib/personas.jsx'
import {
  duracion,
  segundosVividos,
  textoJunta,
  textoVencimiento,
} from '../datos.js'

export default function TarjetaFicha({ ficha, yo, ahora, onAbrir }) {
  const personas = usePersonas()
  const esJunta = ficha.tipo === 'junta'
  const vence = textoVencimiento(ficha.venceEn)
  const trabajado = segundosVividos(ficha, ahora)

  // Quién es la otra parte, mirado desde donde estoy yo
  let quien = 'Creado por ti'
  if (ficha.creadorId !== yo.id) quien = `De ${personas[ficha.creadorId].nombre}`
  else if (ficha.asignadoId !== yo.id) quien = `Para ${personas[ficha.asignadoId].nombre}`

  return (
    <button
      type="button"
      onClick={() => onAbrir(ficha.id)}
      className="w-full cursor-pointer rounded-2xl border border-borde bg-white px-4 py-[15px] text-left"
    >
      <div className="flex items-center justify-between gap-2.5">
        {esJunta ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-borde-suave px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-pendiente-texto uppercase">
              <Icono.Calendario tam={11} grosor={2.2} />
              Junta
            </span>
            {ficha.vistoEn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-listo-fondo px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-listo-texto uppercase">
                <Icono.Palomita tam={10} />
                Confirmada
              </span>
            )}
          </span>
        ) : (
          <ChipEstado estado={ficha.estado} />
        )}
        <span
          className={`text-xs ${
            esJunta
              ? 'text-gris'
              : vence.urgente
                ? 'font-medium text-proceso-texto'
                : 'text-gris'
          }`}
        >
          {esJunta ? textoJunta(ficha.iniciaEn) : vence.texto}
        </span>
      </div>

      <div className="font-display mt-2.5 text-[20px] leading-[1.08]">{ficha.titulo}</div>

      <div className="mt-3 flex items-center gap-2.5 text-xs text-gris">
        <span>{quien}</span>

        {ficha.estado === 'proceso' && (
          <>
            <span className="h-[3px] w-[3px] rounded-full bg-punto" />
            <span className="inline-flex items-center gap-1 text-proceso-texto">
              <Icono.Reloj tam={13} grosor={2} />
              {duracion(trabajado)}
            </span>
          </>
        )}

        {ficha.estado === 'revision' && (
          <>
            <span className="h-[3px] w-[3px] rounded-full bg-punto" />
            <span>Esperando a {personas[ficha.creadorId].nombre}</span>
          </>
        )}

        <span className="grow" />

        {ficha.comentarios.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Icono.Comentario tam={13} grosor={2} />
            {ficha.comentarios.length}
          </span>
        )}
      </div>
    </button>
  )
}
