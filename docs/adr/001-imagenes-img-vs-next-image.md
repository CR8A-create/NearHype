# ADR 001 — Imágenes externas: `<img loading="lazy">` en lugar de `next/image`

**Fecha**: 2026-07-04 · **Estado**: aceptada

## Contexto

El feed agrega contenido de fuentes externas (NewsAPI, Reddit, YouTube/Invidious, RAWG, GDELT, Eventbrite, Unsplash como placeholder…). Las URLs de imagen provienen de **dominios arbitrarios que cambian constantemente**. ESLint (`@next/next/no-img-element`) recomienda `next/image` en los 32 usos de `<img>` del proyecto.

## Decisión

Mantener `<img>` con `loading="lazy" decoding="async"` para todo el contenido de origen externo/dinámico, y desactivar la regla `no-img-element` con referencia a este ADR.

## Motivos

1. **Presupuesto 0 €** (restricción del proyecto): `next/image` optimiza en el servidor. En el free tier de Vercel la optimización tiene cuota limitada de imágenes de origen; un feed con decenas de imágenes nuevas por usuario y por regeneración (caché de 15 min) la agotaría enseguida, y al agotarse las imágenes fallan o generan coste.
2. `next/image` exige declarar `remotePatterns`; con dominios arbitrarios habría que usar comodín `**`, lo que además abre la puerta a que terceros usen nuestro optimizador como proxy (vector del aviso de DoS GHSA-9g9p-9gw9-jx7f).
3. `loading="lazy"` + `decoding="async"` nativos dan la mayor parte del beneficio (no bloquear el render, no descargar imágenes fuera de viewport) sin coste ni configuración.

## Consecuencias

- Sin srcset/resize automático: las imágenes externas se sirven a su tamaño original. Aceptable para tarjetas de feed; revisar si aparece una vista tipo galería.
- Los avatares de Clerk y las subidas propias (utfs.io) **sí** tienen `remotePatterns` configurados en `next.config.ts`; si en el futuro se quiere optimizar solo esos dominios conocidos, puede usarse `next/image` de forma selectiva sin tocar esta decisión.

## Revisión futura

Reevaluar si: (a) el proyecto sale del free tier, (b) Vercel cambia la cuota, o (c) se autoaloja un optimizador (p. ej. `ipx`/imgproxy en contenedor gratuito).
