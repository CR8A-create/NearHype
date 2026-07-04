# KNOWN_ISSUES.md

Problemas conocidos y confirmados. Actualizar al resolver cada uno. Última actualización: 2026-07-04.

## Críticos

*(ninguno conocido que impida compilar o ejecutar)*

## Importantes

1. **`npm run lint` falla con 54 errores.** Desglose:
   - ~45 × `@typescript-eslint/no-explicit-any` — concentrados en `lib/apis/*` (newsapi, youtube, reddit, gaming, gdelt, google_search, wikipedia, events, free_search), `app/api/feed/generate/route.ts` (10), componentes de comunidades y `lib/db/schema.ts` (2).
   - 3 errores `react-hooks` que son **bugs potenciales reales**:
     - `components/CallRoom.tsx:64-65` — `initCall`/`cleanup` usados en `useEffect` antes de declararse; el efecto captura versiones obsoletas.
     - `components/IncomingCallModal.tsx:51` — mismo patrón.
     - `components/GlobalHeader.tsx:55` — `setState` síncrono dentro de un efecto (renders en cascada).
   - 2 × `prefer-const` (auto-corregibles): `app/api/discover/profiles/route.ts:70`, `lib/apis/free_search.ts:76`.
   - 2 × `react/no-unescaped-entities` en `components/SettingsModal.tsx:206`.
2. **No hay tests automatizados** de ningún tipo.

## Menores

- ~40 warnings de lint (`no-unused-vars`, `<img>` en vez de `next/image`, deps de hooks incompletas).
- `tsconfig.tsbuildinfo` está commiteado (debería ignorarse).

## Deuda técnica / observaciones

- Señalización WebRTC por polling a la DB: funciona pero es costosa en conexiones; candidata a migrar a SSE ya existente o a un canal dedicado.
- Sin rate limiting propio en las rutas API.
- Sin validación sistemática de inputs (Zod está instalado pero hay que auditar su uso ruta por ruta).
