# 📘 NearHype - Manual Técnico

Este documento describe la arquitectura, tecnologías y lógica interna de **NearHype**, una red social hiper-local construida con Next.js 14.

## 🛠 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, Framer Motion.
- **Backend**: Next.js Server Actions & API Routes.
- **Base de Datos**: PostgreSQL (Neon Tech) gestionada con **Drizzle ORM**.
- **Autenticación**: Clerk (NextJS).
- **Almacenamiento**: UploadThing (Imágenes).
- **APIs Externas**: 
  - **Google Gemini**: IA (Opcional).
  - **NewsAPI**: Noticias globales (Inglés).
  - **DuckDuckGo / Google News RSS**: Búsquedas web gratuitas para contenido local.

## 📂 Estructura del Proyecto

- `/app`: Rutas del App Router.
  - `/api`: Endpoints REST (Feed, Friends, UploadThing).
  - `/communities`: Páginas de comunidades.
  - `/discover`: Sistema de Swipe y Feed.
  - `/feed`: Feed principal.
- `/components`: Componentes reutilizables (UI).
- `/lib`: Lógica de negocio y utilidades.
  - `/apis`: Conectores a DuckDuckGo, NewsAPI, etc.
  - `/db`: Configuración de Drizzle y Schema.

## 🧠 Lógica Clave

### 1. Sistema de Feed Inteligente (`/app/api/feed/generate`)
El feed no es aleatorio. Usa una estrategia de **"Anillos Expansivos"** para priorizar contenido:

1.  **Prioridad 1 (Local):** Busca noticias GENERALES de la ciudad del usuario usando `Google News RSS`. Tienen un puntaje de relevancia de **100**.
2.  **Prioridad 2 (Intereses Locales):** Busca eventos específicos de los intereses del usuario (ej: "Gaming Madrid") en `DuckDuckGo`. Puntaje: **95**.
3.  **Prioridad 3 (Nacional):** Noticias de gran interés en el país. Puntaje: **70**.
4.  **Prioridad 4 (Global/Relleno):** Volumen masivo de noticias en Inglés vía `NewsAPI` para asegurar que el feed nunca esté vacío. Puntaje: **65**.

> **Nota:** El sistema tiene un caché inteligente. Si cambiamos la lógica, se incrementa `CURRENT_API_VERSION` para invalidar cachés antiguos automáticamente.

### 2. Detección de Imágenes en RSS
Muchas fuentes RSS no incluyen imágenes claras. Hemos implementado un parser en `lib/apis/free_search.ts` que:
1. Busca etiquetas `<img src="...">` en la descripción HTML.
2. Busca etiquetas `<media:content>` o `<enclosure>`.
3. **Fallback Visual:** Si no encuentra imagen, asigna automáticamente una imagen temática de alta calidad (Unsplash) según la categoría para evitar "muros de texto".

### 3. Sistema Social
- **Amigos**: Modelo bidireccional (Solicitud -> Aceptar).
- **Discover**: Interfaz tipo "Tinder" para encontrar gente basada en:
  - Proximidad geográfica.
  - Intereses comunes.
- **Mensajería**: Chat en tiempo real (Polling optimizado) solo entre amigos.

## 🚀 Despliegue

La aplicación está optimizada para **Vercel**.

1. **Variables de Entorno**: Configurar en Vercel (ver `.env.example`).
2. **Base de Datos**: Asegurar que las migraciones de Drizzle se apliquen (`npm run db:push`).
3. **Build**: `npm run build` genera la versión optimizada.

## ⚠️ Puntos de Atención

- **UploadThing**: Requiere `UPLOADTHING_TOKEN` válido. Si falla, las imágenes no subirán.
- **Rate Limits**: Las APIs gratuitas (DuckDuckGo/RSS) son robustas per se, pero hemos añadido delays artificiales y rotación de User-Agent (`lib/apis/free_search.ts`) para evitar bloqueos 403.

---
*Documento generado automáticamente para el equipo de desarrollo de NearHype.*
