# Pendientes

App de pendientes, juntas y revisiones entre dos personas. React + Vite, pensada
para instalarse en la pantalla de inicio (PWA), tanto en iPhone como en Android.

## Correr el proyecto

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. Ahora mismo corre con datos de ejemplo en memoria:
no hace falta base de datos para verla funcionar.

Abajo de todo hay una barra **Demo · ver como** para cambiar entre Axel y Daniel
y ver las dos caras de la app. Se quita cuando exista el login de verdad.

## Cómo está armado

```
src/
  datos.js            Datos de ejemplo y formato de fechas/duraciones
  ui.jsx              Iconos, chips, avatares, la barra de abajo
  componentes/        Piezas que se repiten entre pantallas
  pantallas/          Una pantalla por archivo
  lib/ics.js          Generación de calendario (iCalendar / .ics)
supabase/
  schema.sql          Tablas, triggers y reglas de acceso
```

Los colores y las tipografías están como variables en `src/index.css`, dentro del
bloque `@theme` de Tailwind. Cambiar el acento se hace ahí, en un solo lugar.

## El flujo

```
Pendiente  →  En proceso  →  En revisión  →  Finalizado
```

**En revisión** es la pieza clave: lo que uno termina no se cierra solo, pasa a
la bandeja del otro con *Aprobar* o *Pedir cambios*.

El cronómetro arranca al pasar a **En proceso** y para al enviar a revisión.
Nadie anota horas a mano.

## Dos tipos de ficha

| | Pendiente | Junta |
|---|---|---|
| Fecha | límite (`vence_en`) | día y hora (`inicia_en`, `termina_en`) |
| Estados | los cuatro | no aplica, solo llega |
| En el calendario | evento de día completo | franja real |

## Lo que falta

### 1. Conectar Supabase

`supabase/schema.sql` se pega en el SQL Editor del proyecto y se ejecuta una vez.
Después hay que cambiar `src/datos.js` por llamadas a `@supabase/supabase-js`
(ya está instalado). Las claves van en `.env.local`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

### 2. Notificaciones push

Service worker + Web Push con VAPID. En Android funciona sin más; **en iPhone
solo funciona si la app está agregada a la pantalla de inicio** (requisito de
Apple desde iOS 16.4).

### 3. Calendario suscrito

`src/lib/ics.js` ya genera el archivo; el botón *Al calendario* descarga un .ics
suelto. Falta el endpoint de suscripción: una función edge que sirva
`/cal/<token>.ics` con `Content-Type: text/calendar`. El token sale de la tabla
`tokens_calendario`.

Apple refresca el calendario suscrito cada ~15 min. Google puede tardar hasta
24 h: es limitación de Google, no del archivo.

## Publicar

La app es un sitio estático: `npm run build` deja todo en `dist/`.

```bash
npx vercel
```

La primera vez pide iniciar sesión y hace algunas preguntas; los valores por
defecto sirven (Vite viene detectado). Luego `npx vercel --prod` para publicar.

**Las variables de entorno hay que darlas también en Vercel**, en Settings →
Environment Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Vite las
incrusta al compilar, así que sin ellas el sitio publicado arranca en modo
demo. Después de agregarlas hay que volver a desplegar.

## Instalarla en el teléfono

Hace falta HTTPS, así que solo funciona con la app ya publicada, no con
`localhost`.

- **iPhone:** abrir en Safari → Compartir → *Añadir a pantalla de inicio*.
  Es obligatorio para que las notificaciones push funcionen (requisito de
  Apple desde iOS 16.4).
- **Android:** Chrome ofrece *Instalar aplicación* solo.

## Íconos

`scripts/generar-iconos.mjs` genera los PNG desde el mismo dibujo del SVG:

```bash
node scripts/generar-iconos.mjs
```

Se corre a mano cuando cambie el ícono, no en cada build.
