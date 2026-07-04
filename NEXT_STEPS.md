# NEXT_STEPS.md

Siguiente objetivo concreto para quien retome el proyecto. Última actualización: 2026-07-04.

## Estado: lint en verde ✅, build en verde ✅

El objetivo "0 errores de lint" se completó el 2026-07-04. Quedan ~40 **warnings** de lint (no bloqueantes).

## Objetivo inmediato: cerrar la Fase 0 del ROADMAP

1. **Limpiar warnings de lint** (`npx eslint` sin `--quiet`): imports/variables sin usar, `<img>` → `next/image` (evaluar coste/beneficio en cada caso: `next/image` con dominios externos requiere configurar `remotePatterns` en `next.config.ts`), deps de hooks incompletas.
2. **Añadir `tsconfig.tsbuildinfo` a `.gitignore`** y sacarlo del repo (`git rm --cached`).
3. **Verificación manual end-to-end** con `npm run dev`: onboarding, feed, comunidades (posts, comentarios, chat), DMs, llamadas, discover, amigos, notificaciones. Anotar cualquier fallo en KNOWN_ISSUES.md.

## Después (Fase 1 — seguridad y tests)

- Auditoría de authz ruta por ruta (¿cada endpoint valida propiedad del recurso?).
- Validación de inputs con Zod en todas las rutas POST/PATCH.
- Tests con Vitest para la lógica pura del feed (deduplicación, diversificación).
- Rate limiting básico con solución gratuita.

## Contexto que debes conocer antes de tocar nada

- No hay tests: build + lint + prueba manual son la única red de seguridad.
- Presupuesto 0 €: no añadir servicios de pago.
- Leer `AI_HANDOFF.md` y `KNOWN_ISSUES.md` primero.
- Los tipos de las APIs externas viven en cada fetcher de `lib/apis/`; la forma común de artículo es `ExternalArticle` en `lib/apis/types.ts`.
