# 🚀 Guía Rápida de Configuración - NearHype

Sigue estos pasos **en orden** para poner en marcha NearHype.

## ✅ Checklist de Configuración

### 1. Clerk Authentication (5 minutos)

□ Ir a https://clerk.com → Sign Up (gratis)
□ Crear nueva aplicación → Seleccionar "Next.js"
□ Copiar las API Keys
□ Pegar en `.env.local`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
□ En Clerk Dashboard → **User & Authentication** → **Social Connections**
□ Activar **Google** (obligatorio)
□ Activar **GitHub** (opcional pero recomendado)

### 2. Base de Datos Neon PostgreSQL (5 minutos)

□ Ir a https://neon.tech → Sign Up (gratis, 500MB)
□ Crear nuevo proyecto → Región: Frankfurt (más cerca de Europa)
□ Copiar el **Connection String** que aparece
□ Pegar en `.env.local`:
  ```
  DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
  ```

### 3. Google Gemini API (2 minutos)

□ Ir a https://aistudio.google.com/app/apikey
□ Iniciar sesión con tu cuenta de Google
□ Click **Create API Key**
□ Copiar la key (empieza con AIza...)
□ Pegar en `.env.local`:
  ```
  GEMINI_API_KEY=AIza...
  ```

### 4. Crear las Tablas en la Base de Datos

Una vez configurado el `DATABASE_URL`, ejecutar:

```bash
npm run db:push
```

**Salida esperada:**
```
✓ Successfully pushed schema changes to the database
```

### 5. Probar que todo funciona

```bash
npm run dev
```

Abrir http://localhost:3000

**Deberías ver:**
- ✅ Landing page con diseño morado/índigo
- ✅ Botones de "Iniciar Sesión" y "Comenzar Gratis"
- ✅ Click en "Comenzar Gratis" abre modal de Clerk

## 🎯 Próximos Pasos (Después de Configurar)

1. **Probar el flujo completo:**
   - Regístrate con Google o email
   - Completa el onboarding (selecciona intereses y ubicación)
   - Deberías llegar a `/feed` (aunque aún está vacío)

2. **Verificar que la DB tiene datos:**
   ```bash
   npm run db:studio
   ```
   Esto abre Drizzle Studio en el navegador. Verás tus tablas con datos.

3. **Desarrollar el Feed (siguiente fase):**
   - Integrar Gemini API
   - Llamar a APIs externas (GDELT, etc.)
   - Mostrar contenido real

## 🆘 Problemas Comunes

### "Invalid Publishable Key"
→ Verifica que copiaste bien la key de Clerk (debe empezar con `pk_test_`)

### "Failed to connect to database"
→ Verifica que el `DATABASE_URL` tiene `?sslmode=require` al final

### "GEMINI_API_KEY is not defined"
→ Reinicia el servidor (`Ctrl+C` y `npm run dev` de nuevo)

### La página no carga / error 500
→ Mira la terminal donde corre `npm run dev`, ahí aparecerán los errores

## 📧 Contacto

Si te atascas en algún paso, avísame con:
1. Captura del error
2. Qué paso estabas haciendo
3. Contenido de tu `.env.local` (sin las keys completas)

---

**Una vez funcione todo, pregúntame y seguimos con el Feed! 🎉**
