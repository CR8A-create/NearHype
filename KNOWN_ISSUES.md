# KNOWN_ISSUES.md

Problemas conocidos y confirmados. Actualizar al resolver cada uno. Última actualización: 2026-07-04.

## Críticos

*(ninguno conocido que impida compilar o ejecutar)*

## Importantes

1. **No hay tests automatizados** de ningún tipo.
2. **Sin rate limiting** en las rutas API (mutaciones, polling de llamadas, generación de feed). Pendiente de Fase 1; usar solución gratuita (contador en memoria por instancia o `@upstash/ratelimit` free tier).
3. **Sin Content-Security-Policy.** Se añadieron cabeceras básicas (nosniff, Permissions-Policy, Referrer-Policy, X-Frame-Options, HSTS) en `next.config.ts` el 2026-07-04, pero una CSP requiere probar con los scripts inline de Next y los dominios de Clerk/UploadThing antes de activarla.
4. **Validación de inputs parcial**: las 6 rutas de contenido (posts crear/editar, comentarios, mensajes de comunidad, DMs, crear comunidad) validan con Zod y límites de longitud desde 2026-07-04 (`lib/validation.ts`). Quedan con validación manual: `user/onboarding`, `user/profile`, `user/profile/public`, `user/preferences`, `user/interests/weight`, `friends/request`, `calls` y `communities/[slug]` PATCH — migrarlas al mismo patrón `parseBody(req, schema)`.
2. ~~`npm run lint` falla con 54 errores~~ — **RESUELTO 2026-07-04**: lint en verde (0 errores). Se corrigieron 3 bugs reales de hooks (CallRoom, IncomingCallModal, GlobalHeader), se tipó `lib/apis/*` (nuevo `lib/apis/types.ts` con `ExternalArticle`) y se eliminaron todos los `any`.

## Menores

- 32 warnings `@next/next/no-img-element` (`<img>` en vez de `next/image`). **Decisión pendiente (Fase 2)**: las imágenes del feed vienen de dominios arbitrarios; usar `next/image` requiere `remotePatterns` comodín y puede agotar la cuota de optimización de imágenes del free tier de Vercel. Evaluar `unoptimized`, un loader propio o mantener `<img loading="lazy">`.

## Deuda técnica / observaciones

- Señalización WebRTC por polling a la DB: funciona pero es costosa en conexiones; candidata a migrar a SSE ya existente o a un canal dedicado.
- Sin rate limiting propio en las rutas API.
- Sin validación sistemática de inputs (Zod está instalado pero hay que auditar su uso ruta por ruta).
