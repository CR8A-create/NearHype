# 🌟 NearHype

**Tu agregador inteligente de contenido geolocalizado** - Descubre eventos, noticias y comunidades basadas en tus intereses y ubicación.

![NearHype](public/icon-512x512.png)

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Estilos**: Tailwind CSS v4
- **Autenticación**: Clerk (OAuth + Email/Password)
- **Base de Datos**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **IA**: Google Gemini 2.0 Flash API
- **PWA**: Next-PWA (instalable, funciona offline)
- **Deploy**: Vercel (recomendado)

## 📋 Prerequisitos

Antes de empezar, necesitas tener instalado:

- **Node.js 22+** o **Bun** (recomendado para mejor performance)
- **npm** o **bun** como gestor de paquetes
- **Git**

## 🛠️ Configuración Inicial (Paso a Paso)

### 1. Clonar el repositorio (si viene de Git)

```bash
cd C:\Users\carlo\Documents\NearHype\nearhype
```

### 2. Instalar dependencias

```bash
npm install
# o si usas Bun:
bun install
```

### 3. Configurar Clerk Authentication

1. Ve a [https://clerk.com](https://clerk.com) y crea una cuenta
2. Crea una nueva aplicación
3. En el dashboard, ve a **API Keys**
4. Copia las keys y pégalas en `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_TU_KEY_AQUI
CLERK_SECRET_KEY=sk_test_TU_SECRET_AQUI
```

5. En Clerk, activa los providers de OAuth:
   - Ve a **User & Authentication** → **Social Connections**
   - Activa **Google** y **GitHub** (mínimo)
   - Opcional: Apple (para iOS PWA)

### 4. Configurar Base de Datos PostgreSQL (Neon)

1. Ve a [https://neon.tech](https://neon.tech) y crea una cuenta gratis
2. Crea un nuevo proyecto
3. Copia la **Connection String** (debe verse como `postgresql://user:password@hostname/dbname`)
4. Pégala en `.env.local`:

```env
DATABASE_URL=postgresql://user:password@hostname/dbname?sslmode=require
```

### 5. Obtener Google Gemini API Key

1. Ve a [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Click en **Create API Key**
4. Copia la key y pégala en `.env.local`:

```env
GEMINI_API_KEY=TU_GEMINI_API_KEY_AQUI
```

### 6. Ejecutar Migraciones de Base de Datos

Una vez configurado el `DATABASE_URL`, ejecuta:

```bash
npm run db:push
```

Este comando creará todas las tablas necesarias en tu base de datos.

### 7. Verificar configuración

Tu archivo `.env.local` debe verse así:

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Google Gemini API
GEMINI_API_KEY=AIza...

# Database - Neon PostgreSQL
DATABASE_URL=postgresql://user:password@hostname/dbname?sslmode=require

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🏃‍♂️ Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📱 Características Implementadas (MVP v0.1)

### ✅ Completadas
- [x] Landing page profesional con héroe y CTAs
- [x] Autenticación completa con Clerk (email + OAuth)
- [x] Flujo de onboarding interactivo (2 pasos)
  - Selección de intereses (preset + custom)
  - Ubicación (automática + manual)
- [x] Base de datos PostgreSQL con schema optimizado
- [x] PWA manifest y configuración
- [x] Diseño responsive y dark mode

### 🚧 Próximos Pasos

1. **Feed personalizado** (Semana 2)
   - Integración con Gemini API (prompt orchestrator)
   - APIs externas: GDELT, Eventbrite, Reddit
   - Sistema de ranking por relevancia + distancia
   - Cache de 15 minutos con Redis

2. **Página de Feed** (Semana 3)
   - UI con infinite scroll
   - Cards de contenido (noticias, eventos)
   - Filtros (tipo, distancia)
   - Pull-to-refresh

3. **Settings & Perfil** (Semana 4)
   - Editar intereses
   - Cambiar ubicación/radio
   - Preferencias de notificaciones

## 🗂️ Estructura del Proyecto

```
nearhype/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   └── user/
│   │       ├── profile/      # GET perfil usuario
│   │       └── onboarding/   # POST guardar onboarding
│   ├── onboarding/           # Flujo de configuración inicial
│   ├── sign-in/              # Página login Clerk
│   ├── sign-up/              # Página registro Clerk
│   ├── feed/                 # Feed personalizado (próximamente)
│   ├── layout.tsx            # Layout raíz con ClerkProvider
│   ├── page.tsx              # Landing page
│   └── globals.css           # Estilos globales
├── lib/
│   └── db/
│       ├── schema.ts         # Schema Drizzle (tablas)
│       └── index.ts          # Conexión DB
├── public/                   # Assets estáticos
│   ├── manifest.json         # PWA manifest
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── middleware.ts             # Clerk auth middleware
├── drizzle.config.ts         # Config Drizzle Kit
├── next.config.ts            # Config Next.js + PWA
└── .env.local                # Variables de entorno (NO commitear)
```

## 📊 Base de Datos (Schema)

### Tablas principales:

- **users**: Info básica del usuario (id, email, username, avatar)
- **user_interests**: Temas de interés (gaming, música, etc.)
- **user_locations**: Ubicación actual (ciudad, lat/lon, radio)
- **user_settings**: Preferencias (dark mode, idioma, consentimientos)
- **feed_cache**: Cache del feed generado (15min TTL)

### Comandos útiles DB:

```bash
# Ver la base de datos visualmente
npm run db:studio

# Generar nueva migración (si cambias schema.ts)
npm run db:generate

# Aplicar cambios a la DB
npm run db:push
```

## 🔒 Privacidad & Seguridad

- **GDPR Compliant desde día 1**
- Solo guardamos ciudad aproximada (no GPS preciso)
- No tracking de historial de ubicaciones
- Opción de eliminar cuenta completa
- Encriptación de datos sensibles
- Cookies httpOnly para sesiones

## 🚀 Deploy a Producción

### Vercel (recomendado, gratis)

1. Crear cuenta en [vercel.com](https://vercel.com)
2. Conectar tu repositorio de GitHub
3. Configurar variables de entorno en Vercel:
   - Todas las de `.env.local`
   - Cambiar `NEXT_PUBLIC_APP_URL` a tu dominio real
4. Deploy automático en cada push a `main`

### Configurar dominio personalizado

1. En Vercel → Settings → Domains
2. Añadir tu dominio (ej: `nearhype.app`)
3. Configurar DNS según instrucciones

## 🐛 Troubleshooting

### Error: "DATABASE_URL no está configurada"
- Verifica que `.env.local` existe y tiene `DATABASE_URL`
- Reinicia el servidor dev (`Ctrl+C` y `npm run dev`)

### Error: "Clerk is not configured"
- Verifica las keys de Clerk en `.env.local`
- Asegúrate que las keys empiezan con `pk_test_` y `sk_test_`

### Error al hacer login
- Verifica que en Clerk Dashboard tienes activos los OAuth providers
- Limpia las cookies del navegador

### La base de datos no se crea
- Verifica que `DATABASE_URL` es correcta
- Ejecuta `npm run db:push` de nuevo
- Comprueba logs en Neon Dashboard

## 📝 Scripts Disponibles

```bash
npm run dev           # Servidor desarrollo (Turbopack)
npm run build         # Build para producción
npm start             # Servidor producción
npm run lint          # Linter ESLint
npm run db:push       # Aplicar schema a DB
npm run db:generate   # Generar SQL migrations
npm run db:studio     # Abrir Drizzle Studio (GUI)
```

## 🤝 Contribuir

Este es un proyecto personal en fase MVP, pero si quieres contribuir:

1. Fork el repo
2. Crea una rama feature (`git checkout -b feature/amazing`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing`)
5. Abre un Pull Request

## 📄 Licencia

MIT © 2026 NearHype

---

**¿Dudas?** Revisa la [documentación de arquitectura](../brain/nearhype_architecture.md)
