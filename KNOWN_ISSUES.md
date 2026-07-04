# KNOWN_ISSUES.md

Problemas conocidos y confirmados. Actualizar al resolver cada uno. Última actualización: 2026-07-04.

## Críticos

*(ninguno conocido que impida compilar o ejecutar)*

## Importantes

1. **No hay tests automatizados** de ningún tipo.
2. ~~`npm run lint` falla con 54 errores~~ — **RESUELTO 2026-07-04**: lint en verde (0 errores). Se corrigieron 3 bugs reales de hooks (CallRoom, IncomingCallModal, GlobalHeader), se tipó `lib/apis/*` (nuevo `lib/apis/types.ts` con `ExternalArticle`) y se eliminaron todos los `any`.

## Menores

- 32 warnings `@next/next/no-img-element` (`<img>` en vez de `next/image`). **Decisión pendiente (Fase 2)**: las imágenes del feed vienen de dominios arbitrarios; usar `next/image` requiere `remotePatterns` comodín y puede agotar la cuota de optimización de imágenes del free tier de Vercel. Evaluar `unoptimized`, un loader propio o mantener `<img loading="lazy">`.

## Deuda técnica / observaciones

- Señalización WebRTC por polling a la DB: funciona pero es costosa en conexiones; candidata a migrar a SSE ya existente o a un canal dedicado.
- Sin rate limiting propio en las rutas API.
- Sin validación sistemática de inputs (Zod está instalado pero hay que auditar su uso ruta por ruta).
