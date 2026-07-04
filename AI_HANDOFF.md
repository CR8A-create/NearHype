# AI_HANDOFF.md

> Documento de traspaso para cualquier IA o desarrollador que continúe NearHype.
> **Léelo entero antes de tocar código.** Última actualización: 2026-07-04.

## Qué es NearHype

Red social hiperlocal (Next.js 16 App Router + React 19, Clerk, Drizzle + Neon PostgreSQL, TailwindCSS v4, PWA). Todo el código vive en este directorio (`nearhype/`), que es la raíz del repositorio git. El archivo `CLAUDE.md` con las instrucciones de trabajo está un nivel por encima (fuera del repo).

## Estado actual (2026-07-04)

| Verificación | Resultado |
|---|---|
| `npm run build` | ✅ Pasa |
| `npm run lint` | ✅ 0 errores; 32 warnings (todos `no-img-element`, decisión diferida a Fase 2) |
| `npx tsc --noEmit` | ✅ Pasa |
| `npm test` (Vitest) | ✅ 26 tests (lógica del feed + rate limiter) |

## Sesión 2026-07-04 — Resumen

1. **Auditoría inicial**: build ✅, lint ❌ (54 errores).
2. Creada la infraestructura de continuidad: este archivo, `ROADMAP.md`, `NEXT_STEPS.md`, `KNOWN_ISSUES.md`.
3. **Corregidos 3 bugs reales de React hooks**:
   - `CallRoom.tsx`: el `useEffect` de montaje usaba `initCall`/`cleanup` antes de declararse (closures obsoletos) — reordenado.
   - `IncomingCallModal.tsx`: `stopRingtone` usado antes de declararse — reordenado.
   - `GlobalHeader.tsx`: el intervalo de polling se reiniciaba con cada cambio de contadores y comparaba con closures obsoletos — ahora usa un ref para los valores previos y depende solo de `user`.
4. **Eliminados todos los `any`** (54 → 0 errores de lint):
   - Nuevo `lib/apis/types.ts` con `ExternalArticle` (forma común de NewsAPI/Google Search/Wikipedia).
   - Tipos crudos de respuesta para GDELT, Reddit, RAWG, Invidious y Eventbrite en sus fetchers.
   - `schema.ts`: `AnyPgColumn` en FKs auto-referenciadas.
   - Feed route: eliminados los casts `as any[]` (los fetchers ya están tipados); corregidos dos accesos a campos inexistentes (`item.extract`/`item.thumbnail` → `description`/`socialimage`) en el bloque Wikipedia.
   - Componentes: nuevo tipo `CommentData` exportado desde `Comments.tsx` y usado en `PostCard`/`EnhancedCommentInput`; `catch (err: any)` → narrowing con `instanceof Error`.
5. **Código muerto y sin uso eliminado** (~50 warnings): bloque `FriendsList` inalcanzable en `GlobalHeader` (superado por la página de amigos), `searchYouTubeRSS` (siempre devolvía `[]`), función muerta en `orchestrator.ts`, imports/params/vars sin uso en ~35 archivos.
6. **Deps de hooks saneadas** (12 warnings `exhaustive-deps` → 0): los loaders (`loadMessages`, `loadMembers`, `loadCommunity`, `loadPosts`, `loadProfile`, `loadMore`, `getFilteredItems`, `connectSSE`/`scrollToBottom`) ahora son `useCallback` declarados antes de los efectos que los usan y están en sus arrays de deps. `NotificationBell` usa un ref para el contador previo. Un único `eslint-disable` justificado queda en `DMChat` (scroll inicial intencionadamente solo al cargar).
7. **Auditoría de seguridad (authz) — 4 vulnerabilidades corregidas**:
   - **Inyección SQL** en `app/api/discover/route.ts`: `sql.raw` interpolaba los intereses del usuario (texto libre) directamente en un `IN (...)`. Ahora parametrizado.
   - `app/api/calls/[roomId]/signal/route.ts` (POST): cualquier usuario autenticado podía inyectar señales WebRTC en cualquier llamada. Ahora exige ser participante.
   - `app/api/communities/[slug]/messages/[id]/route.ts` (DELETE): un mod de la comunidad A podía borrar mensajes de la B (el mensaje no se verificaba contra el slug). Ahora se comprueba `message.communityId`.
   - `app/api/posts/[id]/comments/[commentId]/route.ts` (DELETE): mismo patrón con comentarios (`comment.postId` sin verificar).
   - Además: cabeceras de seguridad básicas en `next.config.ts` (nosniff, Permissions-Policy con cámara/micro para llamadas, Referrer-Policy, X-Frame-Options, HSTS). Verificado también: uploads (auth + límites), DMs y llamadas exigen amistad, roles de comunidad bien escalonados, sin `dangerouslySetInnerHTML`, resto de SQL parametrizado.
8. **Validación con Zod** en las 6 rutas de contenido: nuevo `lib/validation.ts` con esquemas (`createPostSchema`, `createCommentSchema`, `createMessageSchema`, `createDmSchema`, `createCommunitySchema`, `updatePostSchema`) y helper `parseBody(req, schema)` que devuelve 400 con el primer error legible. Límites alineados con las columnas del schema DB. Patrón a seguir para las rutas restantes (listadas en KNOWN_ISSUES §4).
9. **Vitest introducido** con los primeros 20 tests. La lógica pura del feed se extrajo de la ruta a `lib/feed/` (`types.ts` con `ContentItem`, `dedupe.ts`, `diversify.ts`) sin cambios de comportamiento; la ruta ahora la importa. Scripts: `npm test` / `npm run test:watch`. Añadir tests aquí al tocar lógica pura.
10. **Rate limiting** en `middleware.ts` + `lib/rateLimit.ts` (ventana deslizante in-memory, testeada): 300 lecturas y 60 escrituras por minuto por usuario (o IP anónima), respuesta 429 con `Retry-After`. Los límites de lectura son generosos a propósito: el polling de señales WebRTC durante una llamada ronda las 75 req/min.
11. **Dependencias saneadas**: `npm audit fix` (actualizó `@clerk/nextjs` en el lockfile, eliminando las 2 críticas) + upgrade de Next 16.1.3 → **16.2.10** y `eslint-config-next` a juego (cierra 2 avisos altos de DoS). Quedan 15 avisos transitivos sin fix compatible (ver KNOWN_ISSUES). Verificado: tests, lint, tsc y build en verde con Next 16.2.10.
12. **Validación Zod completada en el resto de rutas** (11 más: onboarding, profile, profile/public, preferences, interests/weight, friends/request, dms iniciar, calls crear/acción, vote, community PATCH, swipe). Todas las rutas con body JSON usan `parseBody(req, schema)`.
13. **Regresión crítica detectada y corregida con smoke test real**: tras el update de Clerk (lockfile), la landing `/` devolvía **500 en SSR** — `@clerk/nextjs` >= 6.39 rechaza `SignInButton`/`SignUpButton` usados directamente en Server Components (los children llegan serializados como array por la frontera RSC). Fix: nuevo `components/AuthButtons.tsx` ("use client") con `SignInCta`/`SignUpCta`; `app/page.tsx` los usa. **Patrón a seguir: los botones de Clerk siempre desde componentes cliente.**
14. **Smoke test local**: la app arranca y la landing renderiza (verificado con navegador). Nota: `.env.local` contiene claves de **producción** de Clerk (dominio nearhype.com), por lo que el login no funciona en localhost — para e2e local hacen falta claves de una instancia de desarrollo de Clerk (documentado en KNOWN_ISSUES).
15. **Auditoría de consultas DB — 3 N+1 corregidos** (importante en Neon free tier):
   - `user/status` (polling cada 30s desde el header): un COUNT por conversación → un único COUNT con `inArray`.
   - `posts/[id]/comments` GET: una query de replies por comentario → una sola query agrupada en JS.
   - `calls/[roomId]/signal` GET (polling ~800ms en llamada): un UPDATE por señal → un UPDATE con `inArray`.
   - `feed/generate`: caché con DELETE+INSERT → upsert `onConflictDoUpdate` sobre el índice único de `cacheKey`.
   - El schema ya estaba bien indexado (índices compuestos correctos en mensajes, amistades, notificaciones, caché).
16. Ver commits de esta fecha para el detalle de cada cambio.

## Decisiones de arquitectura vigentes

- **Auth**: Clerk. `middleware.ts` protege todo excepto `/`, `/sign-in`, `/sign-up`, `/api/webhook`. Toda ruta API autenticada empieza por `lib/getOrCreateUser.ts` (auto-provisiona usuario en DB y migra clerkId dev→prod).
- **DB**: esquema único en `lib/db/schema.ts` (Drizzle). Cambios de esquema: `npm run db:push` (iteración) o `db:generate` + `db:migrate` (versionado).
- **Feed**: `app/api/feed/generate/route.ts` — 8 fuentes en paralelo (`Promise.allSettled`), deduplicación en 3 niveles, diversificación round-robin ponderada, caché 15 min en tabla `feedCache` (versionada con `apiVersion`).
- **IA**: Gemini `gemini-2.0-flash` vía `@google/generative-ai` en `lib/apis/recommendations.ts`; fallback estático `INTEREST_GRAPH` sin API key.
- **Tiempo real**: SSE para DMs y notificaciones (`app/api/dms/stream`, `app/api/notifications/stream`). Llamadas WebRTC con señalización por polling a DB (`callRooms`/`callSignals`).
- **Uploads**: UploadThing.
- **Restricción de presupuesto**: 0 €/mes. Solo servicios free-tier / open source. No introducir dependencias de pago.

## Riesgos identificados

- Cobertura de tests mínima (solo lógica pura): los refactors de UI/rutas se verifican con build + lint + prueba manual.
- La señalización WebRTC por polling de DB consume conexiones de Neon; vigilar el free tier.
- `lib/apis/*` depende de APIs externas gratuitas con rate limits (NewsAPI, YouTube, Reddit, RAWG, GDELT…); todos los fetch deben tolerar fallo (ya se usa `Promise.allSettled`).

## Cómo continuar

1. Lee `NEXT_STEPS.md` (siguiente objetivo concreto) y `KNOWN_ISSUES.md` (problemas abiertos).
2. Trabaja en hitos pequeños; tras cada hito: build + lint, actualiza estos documentos, commit descriptivo.
3. Nunca implementes funciones nuevas mientras existan errores críticos.
4. Comandos: ver `README.md` / `SETUP.md` / `CLAUDE.md` (nivel superior). Env vars requeridas en `.env.local`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`.
