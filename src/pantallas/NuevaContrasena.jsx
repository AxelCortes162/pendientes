import { useState } from 'react'
import { cambiarContrasena } from '../lib/api.js'

/**
 * A dónde cae quien abre el enlace del correo de recuperación.
 *
 * Al abrirlo ya quedó dentro de la app (Supabase le dio sesión), así que
 * esto no es un candado: es la oportunidad de dejar una contraseña que sí
 * recuerde, en vez de seguir dependiendo del correo.
 */
export default function NuevaContrasena({ onListo }) {
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await cambiarContrasena(contrasena)
      onListo()
    } catch (err) {
      setError(err.message)
      setCargando(false)
    }
  }

  return (
    <div className="flex h-full flex-col justify-center px-7 pb-12">
      <div className="mb-10">
        <h1 className="font-display text-[40px] leading-none font-normal">
          Nueva contraseña
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-gris">
          Escribe una que vayas a recordar. Con esta entras de aquí en adelante.
        </p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-2.5">
        <div>
          <label htmlFor="nueva" className="rotulo">
            Contraseña
          </label>
          <input
            id="nueva"
            name="nueva"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="new-password"
            autoFocus
            placeholder="Mínimo 6 caracteres"
            className="mt-1.5 w-full rounded-xl border border-borde bg-white px-3.5 py-3 text-[15px] outline-none focus:border-tinta"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-proceso-fondo px-3.5 py-3 text-[13px] leading-relaxed text-proceso-texto">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={contrasena.length < 6 || cargando}
          className="mt-2 w-full cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white disabled:opacity-30"
        >
          {cargando ? 'Un momento…' : 'Guardar y entrar'}
        </button>
      </form>

      <button
        type="button"
        onClick={onListo}
        className="mt-6 cursor-pointer text-center text-[13px] text-gris underline decoration-borde underline-offset-4"
      >
        Ahora no
      </button>
    </div>
  )
}
