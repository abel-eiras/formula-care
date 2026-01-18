# Guía de Despliegue en Producción

Esta guía te llevará paso a paso para desplegar la aplicación en un servidor de producción.

## Índice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Opciones de Hosting](#2-opciones-de-hosting)
3. [Configuración de Base de Datos](#3-configuración-de-base-de-datos)
4. [Variables de Entorno](#4-variables-de-entorno)
5. [Despliegue del Backend](#5-despliegue-del-backend)
6. [Despliegue del Frontend](#6-despliegue-del-frontend)
7. [Configuración de Dominio y SSL](#7-configuración-de-dominio-y-ssl)
8. [Post-Despliegue](#8-post-despliegue)
9. [Mantenimiento](#9-mantenimiento)

---

## 1. Requisitos Previos

### Software necesario
- **Node.js** 18+ (recomendado 20 LTS)
- **npm** o **pnpm**
- **Git**

### Cuentas necesarias
- Cuenta en un proveedor de hosting (ver opciones abajo)
- Cuenta de email SMTP o Resend para envío de correos
- (Opcional) Cuenta de Cloudflare para DNS y CDN

---

## 2. Opciones de Hosting

### Opción A: Railway (Recomendada para empezar)

**Ventajas**: Fácil de usar, incluye base de datos PostgreSQL, despliegue automático desde GitHub.

**Precio**: ~$5/mes para proyectos pequeños.

**Pasos**:
1. Crea cuenta en [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente el proyecto

### Opción B: Render

**Ventajas**: Tier gratuito disponible, fácil configuración.

**Precio**: Gratis (con limitaciones) o desde $7/mes.

### Opción C: DigitalOcean App Platform

**Ventajas**: Más control, buen rendimiento.

**Precio**: Desde $5/mes.

### Opción D: VPS (Avanzado)

**Ventajas**: Control total, mejor precio a largo plazo.

**Precio**: Desde $4/mes (Hetzner, Contabo).

---

## 3. Configuración de Base de Datos

### PostgreSQL en Producción

La aplicación usa SQLite en desarrollo, pero **debe usar PostgreSQL en producción**.

#### Opción A: Railway PostgreSQL (más fácil)
1. En tu proyecto de Railway, clic en "New" → "Database" → "PostgreSQL"
2. Railway te dará automáticamente una `DATABASE_URL`

#### Opción B: Supabase (gratis)
1. Crea cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a Settings → Database → Connection string
4. Copia la URL de conexión

#### Opción C: Neon (gratis)
1. Crea cuenta en [neon.tech](https://neon.tech)
2. Crea una base de datos
3. Copia la connection string

### Actualizar Prisma para PostgreSQL

Edita `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Cambiar de "sqlite" a "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 4. Variables de Entorno

### Backend (`.env` en `/backend`)

```env
# ===================================
# BASE DE DATOS
# ===================================
DATABASE_URL="postgresql://usuario:password@host:5432/nombre_db"

# ===================================
# SERVIDOR
# ===================================
NODE_ENV=production
PORT=3000

# ===================================
# SEGURIDAD (¡IMPORTANTE: Cambiar en producción!)
# ===================================
JWT_SECRET=genera-una-clave-secreta-muy-larga-y-aleatoria-aqui

# ===================================
# CORS - URLs permitidas (separar por comas)
# ===================================
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com

# ===================================
# URL DE LA APLICACIÓN (para enlaces en emails)
# ===================================
APP_URL=https://tudominio.com

# ===================================
# EMAIL - Opción 1: SMTP (Gmail, Outlook, etc.)
# ===================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM=tu-email@gmail.com

# ===================================
# EMAIL - Opción 2: Resend (recomendado)
# ===================================
# RESEND_API_KEY=re_xxxxxxxxxxxx

# ===================================
# CREDENCIALES INICIALES (solo para seed)
# ===================================
SUPERADMIN_EMAIL=superadmin@tudominio.com
SUPERADMIN_PASSWORD=CambiaEstaPorUnaSegura123!
```

### Frontend

El frontend no necesita variables de entorno adicionales en producción. 
La URL del API se configura automáticamente según el dominio.

Si necesitas configurar la URL del API manualmente, crea `.env.production`:

```env
VITE_API_URL=https://api.tudominio.com
```

---

## 5. Despliegue del Backend

### Opción A: Railway (Recomendada)

1. **Conectar repositorio**
   - En Railway, crea nuevo proyecto
   - Conecta tu repositorio de GitHub
   - Selecciona la carpeta `/backend`

2. **Configurar variables de entorno**
   - Ve a "Variables"
   - Añade todas las variables del apartado anterior
   - Railway genera automáticamente `DATABASE_URL` si añadiste PostgreSQL

3. **Configurar build**
   - Railway detectará automáticamente el `package.json`
   - Si no, configura:
     - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
     - Start Command: `npm start`

4. **Ejecutar migraciones**
   ```bash
   npx prisma migrate deploy
   npx tsx src/prisma/seed.ts
   ```

### Opción B: Render

1. Crea nuevo "Web Service"
2. Conecta repositorio y selecciona `/backend`
3. Configura:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm start`
4. Añade variables de entorno

### Configurar script de producción

Asegúrate de que `backend/package.json` tiene:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "postinstall": "prisma generate"
  }
}
```

---

## 6. Despliegue del Frontend

### Opción A: Vercel (Recomendada)

1. **Crear cuenta en [vercel.com](https://vercel.com)**

2. **Importar proyecto**
   - Clic en "Import Project"
   - Conecta tu repositorio de GitHub
   - Selecciona la carpeta raíz (no `/backend`)

3. **Configurar build**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Variables de entorno**
   ```
   VITE_API_URL=https://tu-backend.railway.app
   ```

5. **Desplegar**
   - Vercel desplegará automáticamente con cada push a `main`

### Opción B: Netlify

1. Crea cuenta en [netlify.com](https://netlify.com)
2. "Add new site" → "Import an existing project"
3. Conecta GitHub
4. Configura:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

### Opción C: Railway (todo junto)

Puedes desplegar frontend y backend en Railway:
1. Crea otro servicio para el frontend
2. Configura build para Vite

---

## 7. Configuración de Dominio y SSL

### Añadir dominio personalizado

#### En Vercel:
1. Ve a Settings → Domains
2. Añade tu dominio (ej: `farmaciapontevea.com`)
3. Configura DNS según instrucciones

#### En Railway:
1. Ve a Settings → Networking → Custom Domains
2. Añade tu dominio
3. Configura DNS

### Configurar DNS (ejemplo con Cloudflare)

```
Tipo    Nombre    Contenido
A       @         IP-del-servidor
CNAME   www       tudominio.com
CNAME   api       tu-backend.railway.app
```

### SSL/HTTPS

- **Vercel/Netlify/Railway**: SSL automático incluido
- **VPS propio**: Usa Let's Encrypt con Certbot

---

## 8. Post-Despliegue

### Verificar funcionamiento

1. **Backend**: Accede a `https://api.tudominio.com/api/health`
   - Debe devolver: `{"status":"ok","message":"API funcionando correctamente"}`

2. **Frontend**: Accede a `https://tudominio.com`
   - Debe cargar la página de login

3. **Login**: Prueba con las credenciales de superadmin

### Crear primera farmacia

1. Inicia sesión como superadmin
2. Ve a "Farmacias" → "Nueva Farmacia"
3. Completa los datos
4. Crea un usuario admin para la farmacia

### Configurar email

1. Inicia sesión como admin de farmacia
2. Ve a "Configuración" → "Email"
3. Configura SMTP o Resend
4. Envía un email de prueba

---

## 9. Mantenimiento

### Backups de base de datos

```bash
# PostgreSQL
pg_dump -U usuario -h host -d nombre_db > backup_$(date +%Y%m%d).sql
```

### Actualizar aplicación

```bash
# En el servidor o a través de GitHub
git pull origin main
npm install
npx prisma migrate deploy
npm run build
# Reiniciar servicio
```

### Monitorización

- **Railway/Render**: Logs incluidos en el dashboard
- **Uptime monitoring**: UptimeRobot (gratis) o BetterStack

### Logs

```bash
# Ver logs en Railway
railway logs

# Ver logs en Render
# Dashboard → Logs
```

---

## Checklist de Producción

- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno configuradas
- [ ] JWT_SECRET cambiado (¡importante!)
- [ ] CORS configurado con dominios correctos
- [ ] SSL/HTTPS activo
- [ ] Email funcionando
- [ ] Superadmin creado
- [ ] Primera farmacia creada
- [ ] Backup automático configurado
- [ ] Monitorización activa

---

## Solución de Problemas

### Error de conexión a base de datos
- Verifica `DATABASE_URL`
- Comprueba que el servidor de BD está accesible
- Verifica credenciales

### CORS errors
- Añade tu dominio a `CORS_ORIGIN`
- Verifica que no hay barra al final (`https://midominio.com` no `https://midominio.com/`)

### Emails no llegan
- Verifica credenciales SMTP
- Revisa logs del backend
- Comprueba carpeta de spam

### Error 500
- Revisa logs del backend
- Verifica que las migraciones están aplicadas
- Comprueba `NODE_ENV=production`

---

## Soporte

Si necesitas ayuda adicional:
1. Revisa los logs del servidor
2. Consulta la documentación de tu proveedor de hosting
3. Abre un issue en el repositorio

