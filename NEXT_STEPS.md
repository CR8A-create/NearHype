# NEXT_STEPS.md

Siguiente objetivo concreto para quien retome el proyecto. Última actualización: 2026-07-04.

## Objetivo inmediato: lint en verde (54 errores → 0)

Orden recomendado (commits pequeños, uno por grupo):

1. **Auto-fix**: `npx eslint --fix` corrige los 2 `prefer-const`.
2. **Bugs reales de hooks** (prioridad — afectan a llamadas y header):
   - `components/CallRoom.tsx:64` — mover `initCall`/`cleanup` antes del `useEffect` o dentro de él (son bugs de closure obsoleto).
   - `components/IncomingCallModal.tsx:51` — mismo patrón.
   - `components/GlobalHeader.tsx:55` — evitar `setState` síncrono en efecto.
3. **Tipado de `lib/apis/*`**: sustituir `any` por interfaces de respuesta de cada API externa (newsapi, youtube, reddit, gaming, gdelt, google_search, wikipedia, events). Definir tipos junto a cada fetcher.
4. **Tipado de `app/api/feed/generate/route.ts`** (10 `any`): usa los tipos creados en el paso 3.
5. **Componentes** (`Comments.tsx`, `PostCard.tsx`, etc.): tipar props y respuestas fetch.
6. **`lib/db/schema.ts:290,318`**: revisar los 2 `any` (probablemente `$type<...>()` en columnas json).
7. `components/SettingsModal.tsx:206`: escapar comillas (`&quot;`).

Tras cada grupo: `npm run lint` + `npm run build`, commit, actualizar KNOWN_ISSUES.md.

## Después

Ver Fase 0 restante en `ROADMAP.md`: warnings, verificación manual con dev server, y luego Fase 1 (seguridad + tests).

## Contexto que debes conocer antes de tocar nada

- No hay tests: build + lint + prueba manual son la única red de seguridad.
- Presupuesto 0 €: no añadir servicios de pago.
- Leer `AI_HANDOFF.md` y `KNOWN_ISSUES.md` primero.
