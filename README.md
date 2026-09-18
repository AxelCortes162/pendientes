# Pendientes

App de pendientes, juntas y revisiones entre dos personas. React + Vite,
instalable en la pantalla de inicio (PWA), con Supabase detrás.

## Correr el proyecto

```bash
npm install
npm run dev
```

Sin `.env.local`, la app arranca con datos de ejemplo y una barra abajo para
cambiar de persona. No hace falta base de datos para verla funcionar.

## El flujo

```
Pendiente  →  En proceso  →  En revisión  →  Finalizado
```

**En revisión** es la pieza clave: lo que uno termina no se cierra solo, pasa a
la bandeja del otro con *Aprobar* o *Pedir cambios*.

El cronómetro arranca al pasar a **En proceso** y para al enviar a revisión.
No se anotan horas a mano: lo hace un trigger de Postgres, así que el tiempo no
se pierde aunque se cierre el navegador a media tarea.

## Dos tipos de ficha

| | Pendiente | Junta |
|---|---|---|
| Fecha | límite (`vence_en`) | día y hora (`inicia_en`, `termina_en`) |
| Estados | los cuatro | no aplica, solo llega |
| En el calendario | evento de día completo | franja real |

## Cómo está armado

```
src/
  datos.js            Datos de ejemplo y formato de fechas/duraciones
  ui.jsx              Iconos, chips, avatares, la barra de abajo
  componentes/        Piezas que se repiten entre pantallas
  pantallas/          Una pantalla por archivo
  lib/
    supabase.js       Cliente; decide si hay backend o no
    api.js            Todo lo que habla con Supabase
    useDatos.js       Una puerta a los datos, con dos fuentes detrás
    push.js           Permiso, suscripción y disparo de notificaciones
    ics.js            Generación de calendario (iCalendar)
    personas.jsx      Contexto con quiénes son los del espacio
api/                  Funciones de servidor (Vercel)
  notificar.js        Manda el push a la otra persona
  calendario.js       Sirve el .ics al que se suscribe el teléfono
  recordatorios.js    Lo llama pg_cron cada hora
public/sw.js          Service worker: solo push, no cachea nada
supabase/
  schema.sql          Base: tablas, triggers y políticas
  02-push-y-calendario.sql
```

Los colores y tipografías son variables en `src/index.css`, dentro del bloque
`@theme` de Tailwind. Cambiar el acento se hace ahí, en un solo lugar.

## Variables de entorno

**En `.env.local`** (y en Vercel, para que el build las incruste):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
```

**Solo en Vercel**, nunca en el repo ni en el navegador:

```
SUPABASE_SERVICE_ROLE_KEY    Se salta RLS; la usan las funciones de api/
VAPID_PRIVATE_KEY            Firma los push (está en .vapid.json, ignorado por Git)
VAPID_CONTACTO               mailto:tu@correo.com
SECRETO_CRON                 Cualquier cadena larga; protege /api/recordatorios
```

Las `VITE_*` se incrustan al compilar, así que después de agregarlas hay que
volver a desplegar.

Para generar llaves VAPID nuevas:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

## Notificaciones push

El navegador se suscribe (`src/lib/push.js`) y guarda el endpoint en
`suscripciones_push`. Cuando alguien mueve algo, el cliente llama a
`/api/notificar`, que verifica el token contra Supabase, busca a la otra
persona y le manda el aviso.

Las suscripciones muertas (404/410) se borran solas: pasa cuando alguien
desinstala la app o limpia los datos del navegador.

**En iPhone solo funcionan con la app agregada a la pantalla de inicio.** Es
requisito de Apple desde iOS 16.4; la app detecta ese caso y lo explica en
lugar de fallar en silencio.

## Calendario suscrito

Cada persona tiene una URL secreta en `tokens_calendario`. Se suscribe una vez
desde la pantalla de Actividad y de ahí en adelante sus juntas y fechas de
entrega llegan solas.

Apple refresca cada ~15 min. Google puede tardar hasta 24 h: es limitación de
Google, no del archivo.

## Recordatorios

`/api/recordatorios` corre cada hora desde `pg_cron` y avisa de:

- pendientes que vencen en 24 h
- pendientes que vencen en una hora
- juntas que empiezan en menos de una hora

Cada ventana dura una hora exacta y el cron corre en punto, así que nada se
avisa dos veces sin necesidad de guardar qué ya se mandó.

El SQL para programarlo está comentado al final de
`supabase/02-push-y-calendario.sql`.

## Publicar

Cada `git push` a `main` republica en Vercel. Para un despliegue suelto:

```bash
npx vercel --prod
```

## Instalarla en el teléfono

Hace falta HTTPS, así que solo con la app publicada.

- **iPhone:** Safari → Compartir → *Añadir a pantalla de inicio*
- **Android:** Chrome ofrece *Instalar aplicación* solo

## Íconos

```bash
node scripts/generar-iconos.mjs
```

Genera los PNG desde el mismo dibujo del SVG. Se corre a mano cuando cambie el
ícono, no en cada build.
