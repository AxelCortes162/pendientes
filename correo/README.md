# Correo → pendientes

Un correo con las notas de una junta entra por aquí y sale convertido en
pendientes, repartidos entre las dos personas.

```
alguien manda un correo
      ↓
Cloudflare Email Routing  (juntas@tocaaqui.app)
      ↓
este Worker               abre el sobre, revisa la firma
      ↓
POST /api/correo          en Vercel: lee las notas y crea las fichas
      ↓
notificación push
```

## Desplegarlo

```bash
cd correo
npm install
npx wrangler secret put CORREO_SECRETO   # el mismo valor que en Vercel
npx wrangler deploy
```

Después, en el panel de Cloudflare: **Email → Email Routing → Routes**,
crear una dirección personalizada y mandarla a este Worker.

Para ver qué pasa con un correo que acaba de llegar: `npx wrangler tail`.

## Quién puede crear pendientes

El Worker no decide nada: solo reenvía. La app rechaza el correo si
no trae el secreto, si el remitente no es una de las dos cuentas, o si
Cloudflare no pudo verificar SPF/DKIM (o sea, si el "De" pudo ser falso).
