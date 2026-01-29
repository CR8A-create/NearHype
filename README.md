# NearHype 🌍

**NearHype** es una red social de próxima generación enfocada en la **hiper-localidad**. Conecta a usuarios con noticias, eventos y comunidades de su entorno inmediato, priorizando la relevancia geográfica sin perder de vista el contexto global.

## ✨ Características Principales

*   **📰 Smart Feed Geográfico**: Algoritmo de "Anillos Expansivos" que prioriza noticias locales (Ciudad -> País -> Mundo).
*   **🤝 Discover Social**: Sistema tipo Tinder para encontrar amigos cercanos con intereses comunes.
*   **💬 Chat en Tiempo Real**: Mensajería directa integrada con tus amigos.
*   **🚀 Comunidades**: Espacios temáticos para compartir posts, imágenes y enlaces.
*   **📸 Pegado Mágico**: Sube imágenes al portapapeles directamente con `Ctrl+V` al crear posts.
*   **🎨 UI Moderna**: Interfaz glassmorphism construida con TailwindCSS y animaciones fluidas.

## 🛠 Tecnología

Este proyecto está construido con un stack moderno y escalable:

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
*   **Base de Datos**: PostgreSQL (via [Neon](https://neon.tech/)) + [Drizzle ORM](https://orm.drizzle.team/)
*   **Auth**: [Clerk](https://clerk.com/)
*   **Imágenes**: [UploadThing](https://uploadthing.com/)

## 🚀 Cómo Empezar

Para correr este proyecto localmente:

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/tu-usuario/near-hype.git
    cd near-hype
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**:
    Crea un archivo `.env.local` basado en `.env.example` y rellena tus claves (Clerk, Database URL, etc.).

4.  **Iniciar Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```
    Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📄 Licencia

Este proyecto es para uso privado y educativo.

---
Hecho con ❤️ y Next.js
