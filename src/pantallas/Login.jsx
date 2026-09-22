import { useState } from 'react'
import { entrar, registrarse } from '../lib/api.js'

// Correo y contraseña, a propósito.
//
// El enlace mágico por correo obligaría a montar un SMTP propio (el de
// Supabase está limitado a unos pocos correos por hora y no es de fiar para
// entrar a diario). Entrar con Google pide dar de alta credenciales en Google
// Cloud. Para dos personas, correo y contraseña es lo que menos estorba.

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const registrando = modo === 'registrar'

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      if (registrando) {
        await registrarse(correo.trim(), contrasena, nombre.trim())
      } else {
        await entrar(correo.trim(), contrasena)
      }
      // El cambio de sesión lo escucha App: no hay que hacer nada más aquí.
    } catch (err) {
      setError(traducir(err.message))
      setCargando(false)
    }
  }

  const listo =
    correo.includes('@') && contrasena.length >= 6 && (!registrando || nombre.trim().length > 0)

  return (
    <div className="flex h-full flex-col justify-center px-7 pb-12">
      <div className="mb-10">
        <h1 className="font-display text-[44px] leading-none font-normal">Pendientes</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-gris">
          {registrando
            ? 'Crea tu cuenta para empezar a recibir y mandar pendientes.'
            : 'Entra para ver lo tuyo y lo del equipo.'}
        </p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-2.5">
        {registrando && (
          <div>
            <label htmlFor="nombre" className="rotulo">
              Tu nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              placeholder="Axel"
              className="mt-1.5 w-full rounded-xl border border-borde bg-white px-3.5 py-3 text-[15px] outline-none focus:border-tinta"
            />
          </div>
        )}

        <div>
          <label htmlFor="correo" className="rotulo">
            Correo
          </label>
          <input
            id="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="email"
            placeholder="tu@correo.com"
            className="mt-1.5 w-full rounded-xl border border-borde bg-white px-3.5 py-3 text-[15px] outline-none focus:border-tinta"
          />
        </div>

        <div>
          <label htmlFor="contrasena" className="rotulo">
            Contraseña
          </label>
          <input
            id="contrasena"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete={registrando ? 'new-password' : 'current-password'}
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
          disabled={!listo || cargando}
          className="mt-2 w-full cursor-pointer rounded-2xl bg-tinta py-[15px] font-display text-[17px] tracking-wide text-white disabled:opacity-30"
        >
          {cargando ? 'Un momento…' : registrando ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setModo(registrando ? 'entrar' : 'registrar')
          setError(null)
        }}
        className="mt-6 cursor-pointer text-center text-[13px] text-gris underline decoration-borde underline-offset-4"
      >
        {registrando ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}
      </button>
    </div>
  )
}

/** Los mensajes de Supabase vienen en inglés. */
function traducir(mensaje = '') {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login')) return 'Ese correo o esa contraseña no coinciden.'
  if (m.includes('already registered')) return 'Ese correo ya tiene cuenta. Intenta entrar.'
  if (m.includes('email not confirmed'))
    return 'Falta confirmar el correo. Revisa tu bandeja de entrada.'
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('fetch') || m.includes('network'))
    return 'No hay conexión con el servidor. Revisa tu internet.'
  return mensaje
}
