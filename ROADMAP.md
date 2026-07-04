# ROADMAP.md

Hoja de ruta priorizada de NearHype. Orden absoluto: compilar → ejecutar → errores críticos → importantes → menores → arquitectura → rendimiento → diseño → funciones nuevas → característica única.

## Fase 0 — Estabilización ✅ / 🔄

- [x] Verificar que el proyecto compila (`npm run build`) — 2026-07-04
- [x] Infraestructura de continuidad (AI_HANDOFF, ROADMAP, NEXT_STEPS, KNOWN_ISSUES) — 2026-07-04
- [ ] Lint en verde: corregir los 54 errores (empezar por los 3 bugs de hooks: CallRoom, IncomingCallModal, GlobalHeader)
- [ ] Limpiar los ~40 warnings de lint
- [ ] Verificación manual end-to-end con dev server (feed, comunidades, DMs, llamadas, discover)
- [ ] Ignorar `tsconfig.tsbuildinfo` en git

## Fase 1 — Calidad y seguridad

- [ ] Auditoría de seguridad ruta por ruta: authz (¿cada ruta valida propiedad del recurso?), validación de inputs con Zod, cabeceras HTTP
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
