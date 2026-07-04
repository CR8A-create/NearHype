# ROADMAP.md

Hoja de ruta priorizada de NearHype. Orden absoluto: compilar → ejecutar → errores críticos → importantes → menores → arquitectura → rendimiento → diseño → funciones nuevas → característica única.

## Fase 0 — Estabilización ✅ / 🔄

- [x] Verificar que el proyecto compila (`npm run build`) — 2026-07-04
- [x] Infraestructura de continuidad (AI_HANDOFF, ROADMAP, NEXT_STEPS, KNOWN_ISSUES) — 2026-07-04
- [x] Lint en verde: 54 errores corregidos (incl. 3 bugs de hooks: CallRoom, IncomingCallModal, GlobalHeader) — 2026-07-04
- [x] Limpiar warnings de lint: quedan solo 32 × `no-img-element`, diferidos a Fase 2 — 2026-07-04
- [ ] Verificación manual end-to-end con dev server (feed, comunidades, DMs, llamadas, discover)

## Fase 1 — Calidad y seguridad

- [x] Auditoría de authz ruta por ruta — 2026-07-04. 4 vulnerabilidades corregidas: inyección SQL en discover (sql.raw con intereses del usuario), señales WebRTC sin comprobar participante, borrado de mensajes/comentarios sin verificar pertenencia a la comunidad/post de la URL. Cabeceras de seguridad añadidas en next.config.ts.
- [ ] Validación de inputs con Zod + límites de longitud en rutas POST/PATCH
- [ ] Rate limiting básico (solución gratuita: middleware propio o `@upstash/ratelimit` free tier / in-memory)
- [ ] Introducir tests (Vitest) para lógica pura: deduplicación del feed, diversificación, helpers
- [ ] Revisión de manejo de errores homogéneo en API routes

## Fase 2 — Arquitectura y rendimiento

- [ ] Revisar señalización WebRTC por polling → evaluar reutilizar el canal SSE
- [ ] Auditar consultas Drizzle (N+1, índices en schema.ts)
- [ ] Optimización de imágenes (`next/image` en vez de `<img>`)
- [ ] Revisar tamaño de bundle y lazy loading de componentes pesados (CallRoom, modales)

## Fase 3 — Diseño y UX

- [ ] Auditoría de accesibilidad (focus, contraste, aria)
- [ ] Sistema de diseño consistente (tokens, componentes base) manteniendo identidad glassmorphism propia
- [ ] Estados vacíos, loading skeletons y errores amigables en todas las vistas

## Fase 4 — Producto

- [ ] Definir y diseñar la **característica única** de NearHype (difícil de copiar, genera hábito, favorece comunidad local)
- [ ] Candidatas a explorar: dinámicas hiperlocales en tiempo real (pulso del barrio), eventos efímeros geolocalizados, rituales diarios de comunidad
