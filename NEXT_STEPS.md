# NEXT_STEPS.md

Siguiente objetivo concreto para quien retome el proyecto. Última actualización: 2026-07-04 (sesión 2).

## Estado: Fase 0 casi cerrada

- Build ✅ · Lint 0 errores ✅ · tsc ✅
- Warnings restantes: solo 32 × `no-img-element` (decisión documentada en KNOWN_ISSUES.md, se aborda en Fase 2).

## Objetivo inmediato: verificación manual end-to-end

> ✅ **Desbloqueada el 2026-07-06**: claves dev de Clerk configuradas. El backend está verificado end-to-end con `scripts/e2e-smoke.mjs` (32/32). **Queda solo el click-through visual de la UI** (el navegador embebido del preview estaba caído; reintentarlo o que el usuario recorra la app logueado en su navegador).
> Nota: `DATABASE_URL` sigue apuntando a la base de producción de Neon; el usuario creó la branch `dewv` pero falta pegar su connection string (Neon → Connect → desplegable Branch → dewv). El smoke test limpia tras de sí (residuo 0), pero para desarrollo continuado conviene cambiarla.

Con `npm run dev` (requiere `.env.local` completo), recorrer y anotar fallos en KNOWN_ISSUES.md:

1. Onboarding (intereses + ubicación).
2. Feed: generación, filtros por categoría, scroll infinito, refresh.
3. Comunidades: crear, unirse, posts (crear/editar/borrar/votar), comentarios y respuestas, chat en tiempo real, panel de miembros y roles.
4. DMs: conversación, SSE en tiempo real, envío de imágenes.
5. Llamadas: audio y vídeo entre dos cuentas (CallRoom fue refactorizado en esta sesión — probar especialmente).
6. Discover (swipe de perfiles), amigos (solicitudes, aceptar/rechazar, sugerencias), notificaciones (campana + SSE + sonido).

**Atención especial**: en esta sesión se refactorizaron los efectos de `CommunityChat`, `MembersPanel`, `RoleManagementPanel`, `communities/[slug]/page`, `feed/page`, `DMChat`, `NotificationBell`, `SettingsModal` y `users/[username]/page` (loaders a `useCallback`). El riesgo típico de regresión sería un bucle de refetch (red en bucle en DevTools) o datos que no se recargan al cambiar de slug/usuario.

## Fase 2 en curso

- ~~Auditoría de consultas Drizzle~~ **HECHA 2026-07-04**: 3 N+1 corregidos + upsert en feedCache.
- ~~Lazy loading de modales~~ **HECHO 2026-07-04** (header + página de comunidad). Al hacer el e2e manual, verificar que los modales abren (ajustes, solicitudes, crear/editar post, roles).
- ~~Decisión de imágenes~~ **HECHA 2026-07-04** (ADR 001; lint 0/0). Queda de Fase 2: evaluar migrar la señalización WebRTC de polling a SSE — hacerlo solo cuando se puedan probar llamadas (claves dev de Clerk).
- Después: Fase 3 (accesibilidad, estados vacíos/loading, sistema de diseño).

## Después (Fase 1 — seguridad y tests)

- ~~npm audit~~ **REVISADO 2026-07-04**: 33 → 15 avisos (0 críticos). Restantes documentados en KNOWN_ISSUES como riesgo aceptado.

- ~~Auditoría de authz~~ **HECHA 2026-07-04** (4 vulnerabilidades corregidas, ver AI_HANDOFF.md §7). Los `await auth()` sin comprobar en `communities/[slug]/messages` GET y `users/[username]/similar` son aceptables: el middleware protege todas las rutas API.
- ~~Validación con Zod~~ **COMPLETA 2026-07-04**: las 17 rutas con body JSON usan parseBody + esquema de lib/validation.ts.
- ~~Tests con Vitest para la lógica del feed~~ **HECHO 2026-07-04** (20 tests en lib/feed/__tests__). Ampliar cobertura al tocar lógica pura.
- ~~Rate limiting básico~~ **HECHO 2026-07-04** (middleware + lib/rateLimit.ts, con tests). Si los límites molestan en uso real (llamadas largas), ajustar READ_LIMIT_PER_MINUTE.
- CSP: evaluar una Content-Security-Policy compatible con Next inline scripts + Clerk + UploadThing (ver KNOWN_ISSUES.md).

## Contexto que debes conocer antes de tocar nada

- Red de seguridad: `npm run build` + `npm run lint` + `npm test` (Vitest, lógica del feed) + prueba manual para UI.
- Presupuesto 0 €: no añadir servicios de pago.
- Leer `AI_HANDOFF.md` y `KNOWN_ISSUES.md` primero.
- La forma común de artículo externo es `ExternalArticle` en `lib/apis/types.ts`.
- Los commits locales NO están pusheados (el usuario pidió no hacer push todavía).
