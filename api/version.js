// GET /api/version
//
// Qué código está corriendo de verdad. Existe porque nos pasó dos veces:
// probar un arreglo antes de que Vercel terminara de desplegarlo y sacar
// conclusiones del comportamiento viejo. El hash del bundle del navegador no
// sirve para esto: los arreglos del servidor no lo cambian.

export default function handler(req, res) {
  res.status(200).json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    mensaje: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0] || null,
    modelo: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    // Que se vea si faltan llaves, sin enseñar ninguna.
    llaves: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      correo: Boolean(process.env.CORREO_SECRETO),
      supabase: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  })
}
