# 📈 NearHype - Plan de Escalabilidad y Negocio

Este documento detalla los límites actuales de tu infraestructura gratuita, qué se llenará primero y cómo puedes generar ingresos para sostener el crecimiento.

## 🚨 ¿Qué se llenará primero? (Cuellos de Botella)

Tu aplicación usa servicios "Serverless" con capas gratuitas generosas, pero tienen límites. Este es el orden probable en que te encontrarás problemas si la app crece:

### 1. 🥇 Almacenamiento de Imágenes (UploadThing) - **EL PRIMERO EN CAER**
*   **Límite Gratis**: 2GB de almacenamiento y ancho de banda limitado.
*   **Por qué**: Las fotos pesan mucho más que el texto. Si 500 usuarios suben 1 foto de 2MB cada uno, ya has consumido 1GB (50% de tu plan).
*   **Solución**:
    *   Limitar tamaño de subida (ya lo hacemos a 4MB, quizás bajar a 2MB).
    *   **Plan Pagado**: $10/mes por 10GB+ es lo estándar en servicios similares (o migrar a AWS S3 que es más barato pero difícil de configurar).

### 2. 🥈 Base de Datos (Neon Postgres)
*   **Límite Gratis**: 500MB de almacenamiento.
*   **Por qué**: Aquí solo guardas texto y enlaces. El texto "pesa" muy poco. Puedes tener decenas de miles de posts y usuarios antes de llenar 500MB.
*   **Alerta**: Si empiezas a guardar "biografías" muy largas o mucha metadata JSON, crecerá más rápido.

### 3. 🥉 Vercel (Hosting)
*   **Límite**: Ancho de banda y **"Serverless Function Execution"**.
*   **Riesgo**: Si tu app se hace viral, mucha gente entrando a la vez disparará las ejecuciones de la API.
*   **Términos de Uso**: **OJO**. El plan "Hobby" (Gratis) de Vercel **NO permite uso comercial**. Si pones anuncios o cobras suscripciones, técnicamente debes pasarte al plan Pro ($20/mes) o te pueden bloquear si se dan cuenta.

### 4. 🏅 Clerk (Autenticación)
*   **Límite Gratis**: 10,000 Usuarios Activos Mensuales (MAU).
*   **Opinión**: Si llegas a este límite, ¡felicidades! Tienes una app muy exitosa. Es un "buen problema" que tendrás dinero para pagar cuando llegue.

---

## 💰 Estrategias de Monetización

Para una red social **hiper-local**, tienes ventajas únicas sobre Facebook o Twitter:

### 1. 🏪 Anuncios Locales (Publicidad Nativa) - **RECOMENDADO**
En lugar de Google Ads (que pagan céntimos), vende **espacios a negocios locales**:
*   **"Plato del día"**: Restaurantes de la zona pagan para salir primero en el feed de esa ciudad.
*   **Eventos**: Discotecas o teatros pagan por "Pinear" su evento en la comunidad local.
*   **Ventaja**: Cobras directo al negocio (ej: 20€/semana) y es mucho más rentable que los anuncios automáticos.

### 2. ⭐ NearHype Premium (Suscripción Usuarios)
Cobra una pequeña mensualidad (ej: 2.99€/mes) por:
*   **Badge de Verificado**.
*   **Más visibilidad** en la sección "Discover" (salir mas veces a otros usuarios).
*   **Subir fotos en HD** (sin compresión).
*   **Sin anuncios** (si los pones).

### 3. 🤝 Patrocinios de Comunidades
Si tienes una comunidad muy activa (ej: "Gamers Madrid"), una tienda de videojuegos podría "apadrinar" esa comunidad a cambio de poner su logo en el banner y fijar ofertas.

---

## 📱 ¿App Móvil (APK) o Web?

Tienes varias opciones para llevar esto al móvil de la gente:

### Nivel 1: PWA (Progressive Web App) - **YA LA TIENES (CASI)**
Tu web actual es responsive. Puedes configurarla como PWA.
*   **Ventaja**: Gratis. El usuario entra en Chrome -> "Instalar App". Aparece en su inicio como una app normal.
*   **Desventaja**: No estás en la Play Store.

### Nivel 2: TWA (Trusted Web Activity) con Capacitor
*   **Qué es**: Usar una herramienta (CapacitorJS) que "envuelve" tu web de Next.js y genera un archivo `.apk` para Android y `.ipa` para iOS.
*   **Coste**:
    *   Google Play Developer: $25 (pago único) para subir apps de por vida.
    *   Apple App Store: $99/año (muy caro para empezar).
*   **Estrategia**: Convierte tu web en APK usando Capacitor y súbela **solo a Android** al principio. Es barato y fácil.

### Nivel 3: App Nativa (React Native / Flutter)
*   **No recomendado aún**: Implica reescribir todo el código. Solo hazlo si tienes 100,000 usuarios y la web se queda corta.

## 🚀 Hoja de Ruta Recomendada

1.  **Fase 1 (Gratis total)**: Mantén la web como está. Usa PWA para que tus amigos se la instalen. Céntrate en conseguir usuarios.
2.  **Fase 2 (Validación)**: Si llegas a 500 usuarios o el almacenamiento se llena:
    *   Pon anuncios locales manuales (contacta negocios).
    *   Usa ese dinero para pagar el Plan Pro de Vercel ($20) y ampliar UploadThing ($10).
3.  **Fase 3 (Expansión)**: Empaqueta la web como APK (Android) para ganar confianza y súbela a la Play Store.

---
*Este documento es una guía estratégica basada en el estado actual del proyecto.*
