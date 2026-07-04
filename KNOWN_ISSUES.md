# KNOWN_ISSUES.md

Problemas conocidos y confirmados. Actualizar al resolver cada uno. Última actualización: 2026-07-04.

## Críticos

*(ninguno conocido que impida compilar o ejecutar)*

## Importantes

1. **Cobertura de tests mínima**: solo la lógica pura del feed y el rate limiter (26 tests Vitest). La UI y las rutas API no tienen tests.
2. ~~Sin rate limiting~~ **RESUELTO 2026-07-04**: middleware con ventana deslizante in-memory (300 lecturas / 60 escrituras por minuto por usuario o IP, 429 con Retry-After). Limitación: estado por instancia serverless; si escala, migrar a almacén compartido (Upstash free tier).
3. **Sin Content-Security-Policy.** Se añadieron cabeceras básicas (nosniff, Permissions-Policy, Referrer-Policy, X-Frame-Options, HSTS) en `next.config.ts` el 2026-07-04, pero una CSP requiere probar con los scripts inline de Next y los dominios de Clerk/UploadThing antes de activarla.
4. ~~Validación de inputs parcial~~ **RESUELTO 2026-07-04**: todas las rutas API con body JSON (17) validan con Zod vía `parseBody(req, schema)` en `lib/validation.ts`, con límites de longitud alineados al schema DB. Al crear una ruta nueva con body, seguir el mismo patrón.
5. ~~`npm run lint` falla con 54 errores~~ — **RESUELTO 2026-07-04**: lint en verde (0 errores). Se corrigieron 3 bugs reales de hooks (CallRoom, IncomingCallModal, GlobalHeader), se tipó `lib/apis/*` (nuevo `lib/apis/types.ts` con `ExternalArticle`) y se eliminaron todos los `any`.

## Menores

- **Login local no funciona**: `.env.local` tiene claves de producción de Clerk (restringidas al dominio nearhype.com). Para probar auth en localhost, crear una instancia de desarrollo en el dashboard de Clerk y usar sus claves `pk_test_`/`sk_test_` en `.env.local`. La verificación e2e manual completa está bloqueada por esto.

- 32 warnings `@next/next/no-img-element` (`<img>` en vez de `next/image`). **Decisión pendiente (Fase 2)**: las imágenes del feed vienen de dominios arbitrarios; usar `next/image` requiere `remotePatterns` comodín y puede agotar la cuota de optimización de imágenes del free tier de Vercel. Evaluar `unoptimized`, un loader propio o mantener `<img loading="lazy">`.

## Deuda técnica / observaciones

- `npm audit`: de 33 vulnerabilidades (2 críticas) se bajó a 15 (0 críticas, 5 altas) el 2026-07-04 vía `npm audit fix` + upgrade de Next a 16.2.10. Las restantes son transitivas sin fix semver-compatible: `serialize-javascript` (vía workbox/next-pwa, solo build-time) y `effect` (vía uploadthing). Riesgo aceptado; revisar cuando next-pwa/uploadthing publiquen versiones nuevas. No usar `npm audit fix --force`.
- `diversifyFeed` (lib/feed/diversify.ts) descarta silenciosamente los tipos sin peso definido (`music`, `image`). Hoy el generador no produce esos tipos, pero si se añaden nuevas fuentes hay que darles peso en `typeWeights` (comportamiento documentado en el test).

- Señalización WebRTC por polling a la DB: funciona pero es costosa en conexiones; candidata a migrar a SSE ya existente o a un canal dedicado.
- Sin rate limiting propio en las rutas API.
- Sin validación sistemática de inputs (Zod está instalado pero hay que auditar su uso ruta por ruta).
