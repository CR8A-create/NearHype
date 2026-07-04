# NEXT_STEPS.md

Siguiente objetivo concreto para quien retome el proyecto. Última actualización: 2026-07-04 (sesión 2).

## Estado: Fase 0 casi cerrada

- Build ✅ · Lint 0 errores ✅ · tsc ✅
- Warnings restantes: solo 32 × `no-img-element` (decisión documentada en KNOWN_ISSUES.md, se aborda en Fase 2).

## Objetivo inmediato: verificación manual end-to-end

Con `npm run dev` (requiere `.env.local` completo), recorrer y anotar fallos en KNOWN_ISSUES.md:

1. Onboarding (intereses + ubicación).
2. Feed: generación, filtros por categoría, scroll infinito, refresh.
3. Comunidades: crear, unirse, posts (crear/editar/borrar/votar), comentarios y respuestas, chat en tiempo real, panel de miembros y roles.
4. DMs: conversación, SSE en tiempo real, envío de imágenes.
5. Llamadas: audio y vídeo entre dos cuentas (CallRoom fue refactorizado en esta sesión — probar especialmente).
6. Discover (swipe de perfiles), amigos (solicitudes, aceptar/rechazar, sugerencias), notificaciones (campana + SSE + sonido).

**Atención especial**: en esta sesión se refactorizaron los efectos de `CommunityChat`, `MembersPanel`, `RoleManagementPanel`, `communities/[slug]/page`, `feed/page`, `DMChat`, `NotificationBell`, `SettingsModal` y `users/[username]/page` (loaders a `useCallback`). El riesgo típico de regresión sería un bucle de refetch (red en bucle en DevTools) o datos que no se recargan al cambiar de slug/usuario.

## Después (Fase 1 — seguridad y tests)

- ~~Auditoría de authz~~ **HECHA 2026-07-04** (4 vulnerabilidades corregidas, ver AI_HANDOFF.md §7). Los `await auth()` sin comprobar en `communities/[slug]/messages` GET y `users/[username]/similar` son aceptables: el middleware protege todas las rutas API.
- ~~Validación con Zod en rutas de contenido~~ **HECHA 2026-07-04** (6 rutas; ver lib/validation.ts). Falta migrar las rutas menores listadas en KNOWN_ISSUES §4 al mismo patrón.
- ~~Tests con Vitest para la lógica del feed~~ **HECHO 2026-07-04** (20 tests en lib/feed/__tests__). Ampliar cobertura al tocar lógica pura.
- ~~Rate limiting básico~~ **HECHO 2026-07-04** (middleware + lib/rateLimit.ts, con tests). Si los límites molestan en uso real (llamadas largas), ajustar READ_LIMIT_PER_MINUTE.
- CSP: evaluar una Content-Security-Policy compatible con Next inline scripts + Clerk + UploadThing (ver KNOWN_ISSUES.md).

## Contexto que debes conocer antes de tocar nada

- Red de seguridad: `npm run build` + `npm run lint` + `npm test` (Vitest, lógica del feed) + prueba manual para UI.
- Presupuesto 0 €: no añadir servicios de pago.
- Leer `AI_HANDOFF.md` y `KNOWN_ISSUES.md` primero.
- La forma común de artículo externo es `ExternalArticle` en `lib/apis/types.ts`.
- Los commits locales NO están pusheados (el usuario pidió no hacer push todavía).
