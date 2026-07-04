# KNOWN_ISSUES.md

Problemas conocidos y confirmados. Actualizar al resolver cada uno. Última actualización: 2026-07-04.

## Críticos

*(ninguno conocido que impida compilar o ejecutar)*

## Importantes

1. **No hay tests automatizados** de ningún tipo.
2. ~~`npm run lint` falla con 54 errores~~ — **RESUELTO 2026-07-04**: lint en verde (0 errores). Se corrigieron 3 bugs reales de hooks (CallRoom, IncomingCallModal, GlobalHeader), se tipó `lib/apis/*` (nuevo `lib/apis/types.ts` con `ExternalArticle`) y se eliminaron todos los `any`.

## Menores

- ~40 warnings de lint (`no-unused-vars`, `<img>` en vez de `next/image`, deps de hooks incompletas).
- `tsconfig.tsbuildinfo` está commiteado (debería ignorarse).

## Deuda técnica / observaciones

- Señalización WebRTC por polling a la DB: funciona pero es costosa en conexiones; candidata a migrar a SSE ya existente o a un canal dedicado.
- Sin rate limiting propio en las rutas API.
- Sin validación sistemática de inputs (Zod está instalado pero hay que auditar su uso ruta por ruta).
