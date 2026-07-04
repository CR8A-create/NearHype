# AI_HANDOFF.md

> Documento de traspaso para cualquier IA o desarrollador que continúe NearHype.
> **Léelo entero antes de tocar código.** Última actualización: 2026-07-04.

## Qué es NearHype

Red social hiperlocal (Next.js 16 App Router + React 19, Clerk, Drizzle + Neon PostgreSQL, TailwindCSS v4, PWA). Todo el código vive en este directorio (`nearhype/`), que es la raíz del repositorio git. El archivo `CLAUDE.md` con las instrucciones de trabajo está un nivel por encima (fuera del repo).

## Estado actual (2026-07-04)

| Verificación | Resultado |
|---|---|
| `npm run build` | ✅ Pasa |
| `npm run lint` | ❌ 54 errores (ver KNOWN_ISSUES.md) |
| Tests automatizados | ⚠️ No existen |
| Working tree | Limpio, sincronizado con `origin/main` |

## Sesión 2026-07-04 — Resumen

1. **Auditoría inicial**: build ✅, lint ❌ (54 errores).
2. Creada la infraestructura de continuidad: este archivo, `ROADMAP.md`, `NEXT_STEPS.md`, `KNOWN_ISSUES.md`.
3. Ver commits de esta fecha para el detalle de cada cambio.

## Decisiones de arquitectura vigentes

- **Auth**: Clerk. `middleware.ts` protege todo excepto `/`, `/sign-in`, `/sign-up`, `/api/webhook`. Toda ruta API autenticada empieza por `lib/getOrCreateUser.ts` (auto-provisiona usuario en DB y migra clerkId dev→prod).
- **DB**: esquema único en `lib/db/schema.ts` (Drizzle). Cambios de esquema: `npm run db:push` (iteración) o `db:generate` + `db:migrate` (versionado).
- **Feed**: `app/api/feed/generate/route.ts` — 8 fuentes en paralelo (`Promise.allSettled`), deduplicación en 3 niveles, diversificación round-robin ponderada, caché 15 min en tabla `feedCache` (versionada con `apiVersion`).
- **IA**: Gemini `gemini-2.0-flash` vía `@google/generative-ai` en `lib/apis/recommendations.ts`; fallback estático `INTEREST_GRAPH` sin API key.
- **Tiempo real**: SSE para DMs y notificaciones (`app/api/dms/stream`, `app/api/notifications/stream`). Llamadas WebRTC con señalización por polling a DB (`callRooms`/`callSignals`).
- **Uploads**: UploadThing.
- **Restricción de presupuesto**: 0 €/mes. Solo servicios free-tier / open source. No introducir dependencias de pago.

## Riesgos identificados

- Sin tests: cualquier refactor debe verificarse con `npm run build` + `npm run lint` + prueba manual.
- Los errores de React hooks en `components/CallRoom.tsx`, `components/IncomingCallModal.tsx` y `components/GlobalHeader.tsx` son bugs potenciales reales (closures obsoletos / renders en cascada), no solo estilo.
- La señalización WebRTC por polling de DB consume conexiones de Neon; vigilar el free tier.
- `lib/apis/*` depende de APIs externas gratuitas con rate limits (NewsAPI, YouTube, Reddit, RAWG, GDELT…); todos los fetch deben tolerar fallo (ya se usa `Promise.allSettled`).

## Cómo continuar

1. Lee `NEXT_STEPS.md` (siguiente objetivo concreto) y `KNOWN_ISSUES.md` (problemas abiertos).
2. Trabaja en hitos pequeños; tras cada hito: build + lint, actualiza estos documentos, commit descriptivo.
3. Nunca implementes funciones nuevas mientras existan errores críticos.
4. Comandos: ver `README.md` / `SETUP.md` / `CLAUDE.md` (nivel superior). Env vars requeridas en `.env.local`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`.
