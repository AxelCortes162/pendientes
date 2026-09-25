// Datos de ejemplo y helpers de formato.
//
// Todo lo que vive aquí tiene la misma forma que las tablas de
// supabase/schema.sql, para que al conectar Supabase solo haya que cambiar
// de dónde vienen los datos, no cómo se usan.

export const ESTADOS = {
  pendiente: {
    nombre: 'Pendiente',
    punto: 'bg-pendiente',
    texto: 'text-pendiente-texto',
    fondo: 'bg-pendiente-fondo',
  },
  proceso: {
    nombre: 'En proceso',
    punto: 'bg-proceso',
    texto: 'text-proceso-texto',
    fondo: 'bg-proceso-fondo',
  },
  revision: {
    nombre: 'En revisión',
    punto: 'bg-revision',
    texto: 'text-revision-texto',
    fondo: 'bg-revision-fondo',
  },
  listo: {
    nombre: 'Finalizado',
    punto: 'bg-listo',
    texto: 'text-listo-texto',
    fondo: 'bg-listo-fondo',
  },
}

export const ORDEN_ESTADOS = ['pendiente', 'proceso', 'revision', 'listo']

export const PERSONAS = {
  axel: { id: 'axel', nombre: 'Axel', iniciales: 'AC', jefe: false },
  daniel: { id: 'daniel', nombre: 'Daniel', iniciales: 'DM', jefe: true },
}

// Fechas relativas a hoy, para que la demo nunca se vea vencida
const hoy = new Date()
function enDias(dias, hora = 9, minuto = 0) {
  const d = new Date(hoy)
  d.setDate(d.getDate() + dias)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

export const FICHAS_INICIALES = [
  {
    id: 'f1',
    tipo: 'pendiente',
    titulo: 'Rediseñar el banner de la home',
    nota: 'Versión nueva con el copy corto que acordamos. Necesito verlo en 1440 y en móvil antes de pasarlo a desarrollo.',
    estado: 'proceso',
    prioridad: 'alta',
    creadorId: 'daniel',
    asignadoId: 'axel',
    venceEn: enDias(0, 18, 0),
    iniciaEn: null,
    terminaEn: null,
    iniciadoEn: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
    segundosTrabajados: 0,
    alCalendario: true,
    creadoEn: enDias(-2, 9, 40),
    comentarios: [
      {
        id: 'c1',
        autorId: 'daniel',
        texto: 'Ojo con el contraste del texto sobre la foto. Si no llega, ponle un velo al 20 %.',
        creadoEn: enDias(-2, 9, 41),
      },
      {
        id: 'c2',
        autorId: 'axel',
        texto: 'Hecho, subí el velo al 25 %. Ya empecé con la versión móvil.',
        creadoEn: enDias(0, 10, 24),
      },
    ],
  },
  {
    id: 'f2',
    tipo: 'pendiente',
    titulo: 'Exportar iconos del sistema a SVG',
    nota: 'Los 24 del set base, optimizados y con nombres consistentes.',
    estado: 'revision',
    prioridad: 'normal',
    creadorId: 'daniel',
    asignadoId: 'axel',
    venceEn: enDias(-1, 18, 0),
    iniciaEn: null,
    terminaEn: null,
    iniciadoEn: null,
    segundosTrabajados: 7500,
    alCalendario: true,
    creadoEn: enDias(-3, 11, 0),
    comentarios: [
      {
        id: 'c3',
        autorId: 'axel',
        texto: 'Listos los 24. Los dejé en el Drive, carpeta /iconos/svg.',
        creadoEn: enDias(-1, 17, 52),
      },
    ],
  },
  {
    id: 'f3',
    tipo: 'pendiente',
    titulo: 'Ajustar tipografía del kit de marca',
    nota: '',
    estado: 'pendiente',
    prioridad: 'alta',
    creadorId: 'daniel',
    asignadoId: 'axel',
    venceEn: enDias(1, 18, 0),
    iniciaEn: null,
    terminaEn: null,
    iniciadoEn: null,
    segundosTrabajados: 0,
    alCalendario: true,
    creadoEn: enDias(-1, 15, 20),
    comentarios: [],
  },
  {
    id: 'f4',
    tipo: 'pendiente',
    titulo: 'Documentar el flujo de alta de usuarios',
    nota: '',
    estado: 'pendiente',
    prioridad: 'normal',
    creadorId: 'axel',
    asignadoId: 'axel',
    venceEn: null,
    iniciaEn: null,
    terminaEn: null,
    iniciadoEn: null,
    segundosTrabajados: 0,
    alCalendario: false,
    creadoEn: enDias(-1, 12, 0),
    comentarios: [],
  },
  {
    id: 'f5',
    tipo: 'junta',
    titulo: 'Revisión de avances del sitio',
    nota: 'Traer las tres versiones del banner.',
    estado: 'pendiente',
    prioridad: 'normal',
    creadorId: 'daniel',
    asignadoId: 'axel',
    venceEn: null,
    iniciaEn: enDias(4, 10, 0),
    terminaEn: enDias(4, 11, 0),
    iniciadoEn: null,
    segundosTrabajados: 0,
    alCalendario: true,
    creadoEn: enDias(0, 8, 15),
    comentarios: [],
  },
  {
    id: 'f6',
    tipo: 'pendiente',
    titulo: 'Aprobar presupuesto de imprenta',
    nota: '',
    estado: 'pendiente',
    prioridad: 'normal',
    creadorId: 'daniel',
    asignadoId: 'daniel',
    venceEn: enDias(0, 17, 0),
    iniciaEn: null,
    terminaEn: null,
    iniciadoEn: null,
    segundosTrabajados: 0,
    alCalendario: true,
    creadoEn: enDias(-1, 10, 0),
    comentarios: [],
  },
  {
    id: 'f7',
    tipo: 'pendiente',
    titulo: 'Subir assets al Drive compartido',
    nota: '',
    estado: 'listo',
    prioridad: 'normal',
    creadorId: 'daniel',
    asignadoId: 'axel',
    venceEn: enDias(-1, 18, 0),
    iniciaEn: null,
    terminaEn: null,
    iniciadoEn: null,
    segundosTrabajados: 3300,
    alCalendario: false,
    creadoEn: enDias(-4, 9, 0),
    comentarios: [],
  },
]

/* ---------- Formato ---------- */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function hora(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function diaLargo(iso) {
  const d = new Date(iso)
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function diasDeDiferencia(iso) {
  const a = new Date(iso)
  a.setHours(0, 0, 0, 0)
  const b = new Date()
  b.setHours(0, 0, 0, 0)
  return Math.round((a - b) / 86400000)
}

/** "Vence hoy · 18:00", "Vence mañana", "Venció hace 2 días"… */
export function textoVencimiento(iso) {
  if (!iso) return { texto: 'Sin fecha', urgente: false }
  const dias = diasDeDiferencia(iso)
  if (dias === 0) return { texto: `Vence hoy · ${hora(iso)}`, urgente: true }
  if (dias === 1) return { texto: 'Vence mañana', urgente: false }
  if (dias < 0) {
    const n = Math.abs(dias)
    return { texto: n === 1 ? 'Venció ayer' : `Venció hace ${n} días`, urgente: true }
  }
  const d = new Date(iso)
  return { texto: `Vence ${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}`, urgente: false }
}

export function textoJunta(iso) {
  if (!iso) return ''
  const dias = diasDeDiferencia(iso)
  if (dias === 0) return `Hoy ${hora(iso)}`
  if (dias === 1) return `Mañana ${hora(iso)}`
  const d = new Date(iso)
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} · ${hora(iso)}`
}

export function duracion(segundos) {
  if (!segundos || segundos < 60) return 'menos de 1 min'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Una junta no se cierra a mano: pasa la hora y deja de ser asunto de hoy.
 * Los pendientes, en cambio, solo salen cuando alguien los aprueba.
 */
export function yaPaso(ficha, ahora = Date.now()) {
  if (ficha.tipo !== 'junta') return false
  const fin = ficha.terminaEn || ficha.iniciaEn
  return Boolean(fin) && new Date(fin).getTime() < ahora
}

/** Cuándo dejó de estar viva: para agrupar lo de hoy. */
export function cerroEn(ficha) {
  if (ficha.tipo === 'junta') return ficha.terminaEn || ficha.iniciaEn || ficha.creadoEn
  return ficha.actualizadoEn || ficha.creadoEn
}

/** Segundos trabajados, contando el cronómetro que corre ahora mismo. */
export function segundosVividos(ficha, ahora = Date.now()) {
  const base = ficha.segundosTrabajados || 0
  if (ficha.estado !== 'proceso' || !ficha.iniciadoEn) return base
  return base + Math.floor((ahora - new Date(ficha.iniciadoEn).getTime()) / 1000)
}

/* ---------- Importar de una junta ---------- */

/**
 * "2026-09-24" + "10:00" -> ISO. Sin día no hay fecha que valga.
 *
 * `zona` es el desfase que se le pega a la hora ('-06:00'). En el teléfono se
 * deja vacío y el navegador usa la hora local, que es la correcta. En el
 * servidor no: Vercel corre en UTC y "las 10" se volverían las 4 de la mañana.
 */
export function aISO(dia, hora, horaPorDefecto = '18:00', zona = '') {
  if (!dia) return null
  const d = new Date(`${dia}T${hora || horaPorDefecto}:00${zona}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Lo que devolvió el servidor, convertido a una ficha que la app entiende. */
export function aFicha(item, yoId, otroId, zona = '') {
  const inicia = aISO(item.fecha, item.hora, '10:00', zona)
  // Una junta sin hora no es junta: no tiene dónde caer en el calendario.
  const esJunta = item.tipo === 'junta' && Boolean(inicia)

  return {
    tipo: esJunta ? 'junta' : 'pendiente',
    titulo: item.titulo.trim().slice(0, 200),
    nota: (item.nota || '').trim(),
    estado: 'pendiente',
    prioridad: 'normal',
    creadorId: yoId,
    asignadoId: item.para === 'otro' && otroId ? otroId : yoId,
    venceEn: esJunta ? null : aISO(item.fecha, item.hora, '18:00', zona),
    iniciaEn: esJunta ? inicia : null,
    terminaEn: esJunta ? new Date(new Date(inicia).getTime() + 3600000).toISOString() : null,
    alCalendario: true,
  }
}
