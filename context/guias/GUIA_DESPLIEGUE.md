# Guía de Despliegue en Producción

Esta guía te llevará paso a paso para desplegar la aplicación en un servidor de producción.

## Índice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Opciones de Hosting](#2-opciones-de-hosting)
3. [Configuración de Base de Datos](#3-configuración-de-base-de-datos)
4. [Variables de Entorno](#4-variables-de-entorno)
5. [Despliegue en Raiola Networks (con GitHub Actions)](#5-despliegue-en-raiola-networks-con-github-actions)
6. [Despliegue del Backend (otras opciones)](#6-despliegue-del-backend-otras-opciones)
7. [Despliegue del Frontend](#7-despliegue-del-frontend)
8. [Instalador Web (estilo WordPress)](#8-instalador-web-estilo-wordpress)
9. [Configuración de Dominio y SSL](#9-configuración-de-dominio-y-ssl)
10. [Post-Despliegue](#10-post-despliegue)
11. [Mantenimiento](#11-mantenimiento)

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

### Opción D: Raiola Networks (Hosting compartido con Node.js)

**Ventajas**: Soporte en español, hosting nacional, incluye MySQL/MariaDB, panel cPanel.

**Requisitos**: Plan que soporte Node.js (Starter PRO o superior).

**Nota**: Esta es tu opción actual y la que configuraremos con GitHub Actions.

### Opción E: VPS (Avanzado)

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

## 5. Despliegue en Raiola Networks (con GitHub Actions)

Esta sección explica cómo desplegar en Raiola Networks usando GitHub Actions, similar a tu proyecto Astro.

### 5.1. Requisitos en Raiola

1. **Plan con Node.js**: Raiola debe tener habilitado Node.js en tu plan
2. **Acceso SSH**: Necesario para GitHub Actions
3. **Base de datos MySQL/MariaDB**: Crear desde cPanel

### 5.2. Preparar el servidor

#### Acceder por SSH

```bash
ssh usuario@tudominio.com
```

#### Verificar Node.js

```bash
node -v  # Debe ser 18+
npm -v
```

Si no tienes Node.js 18+, contacta con soporte de Raiola o usa nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

#### Crear estructura de directorios

```bash
cd ~/public_html
mkdir -p formula-care
cd formula-care
```

### 5.3. Crear base de datos MySQL

1. Accede a **cPanel** → **Bases de datos MySQL**
2. Crea una nueva base de datos (ej: `usuario_farmacia`)
3. Crea un usuario con contraseña segura
4. Asigna todos los privilegios al usuario sobre la base de datos

### 5.4. Configurar Prisma para MySQL

Modifica `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

La URL de conexión será:
```
DATABASE_URL="mysql://usuario_db:password@localhost:3306/usuario_farmacia"
```

### 5.5. Configurar GitHub Actions

Crea el archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Raiola

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies (Frontend)
        run: npm ci

      - name: Build Frontend
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Install dependencies (Backend)
        working-directory: ./backend
        run: npm ci

      - name: Generate Prisma Client
        working-directory: ./backend
        run: npx prisma generate

      - name: Build Backend
        working-directory: ./backend
        run: npm run build

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            cd ~/public_html/formula-care
            
            # Parar aplicación si está corriendo
            pm2 stop farmacia-backend || true
            
            # Limpiar y preparar
            rm -rf dist backend/dist
            
      - name: Upload Frontend
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          source: "dist/*"
          target: "~/public_html/formula-care/frontend"
          strip_components: 1

      - name: Upload Backend
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          source: "backend/dist/*,backend/package*.json,backend/prisma/*"
          target: "~/public_html/formula-care/backend"
          strip_components: 1

      - name: Post-deploy setup
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            cd ~/public_html/formula-care/backend
            
            # Instalar dependencias de producción
            npm ci --production
            
            # Ejecutar migraciones
            npx prisma migrate deploy
            
            # Reiniciar con PM2
            pm2 start dist/server.js --name farmacia-backend || pm2 restart farmacia-backend
            pm2 save
```

### 5.6. Configurar Secrets en GitHub

Ve a tu repositorio → Settings → Secrets and variables → Actions:

| Secret | Valor |
|--------|-------|
| `SSH_HOST` | Tu dominio o IP (ej: `farmaciapontevea.com`) |
| `SSH_USER` | Tu usuario SSH de Raiola |
| `SSH_PRIVATE_KEY` | Tu clave privada SSH (ver abajo) |
| `SSH_PORT` | `22` (o el puerto SSH de Raiola) |
| `VITE_API_URL` | `https://tudominio.com/api` |

#### Generar clave SSH

```bash
# En tu ordenador local
ssh-keygen -t ed25519 -C "github-actions"

# Copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/id_ed25519.pub usuario@tudominio.com

# Copiar clave privada (para GitHub Secrets)
cat ~/.ssh/id_ed25519
```

### 5.7. Configurar .env en el servidor

Crea el archivo `~/public_html/formula-care/backend/.env`:

```bash
ssh usuario@tudominio.com
cd ~/public_html/formula-care/backend
nano .env
```

Contenido:

```env
DATABASE_URL="mysql://usuario_db:password@localhost:3306/usuario_farmacia"
NODE_ENV=production
PORT=3000
JWT_SECRET=tu-clave-secreta-muy-larga
CORS_ORIGIN=https://tudominio.com
APP_URL=https://tudominio.com
SMTP_HOST=mail.tudominio.com
SMTP_PORT=587
SMTP_USER=noreply@tudominio.com
SMTP_PASS=tu-password
SMTP_FROM=noreply@tudominio.com
```

### 5.8. Configurar PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Configurar inicio automático
pm2 startup
# Sigue las instrucciones que muestra

# Guardar configuración
pm2 save
```

### 5.9. Configurar .htaccess para el frontend

Crea `~/public_html/formula-care/frontend/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirigir API al backend
  RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]
  
  # SPA fallback
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Cabeceras de seguridad
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

### 5.10. Primer despliegue manual

Antes del primer GitHub Actions, ejecuta manualmente:

```bash
ssh usuario@tudominio.com
cd ~/public_html/formula-care/backend

# Ejecutar migraciones
npx prisma migrate deploy

# Ejecutar seed inicial
npx tsx src/prisma/seed.ts
```

---

## 6. Despliegue del Backend (otras opciones)

### Opción A: Railway (Recomendada para principiantes)

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
2. Conecta repositorio y selecciona `/backend` (o raíz si el build usa subcarpeta)
3. Configura:
   - **Build Command:** `npm install && npm run build`  
     (el script `build` en `package.json` ejecuta `prisma generate`, **`prisma migrate deploy`** y `tsc`; así las migraciones se aplican en cada deploy)
   - **Start Command:** `npm start`
4. Añade variables de entorno (incluida `DATABASE_URL` para que las migraciones funcionen en el build)

### Script de producción en backend

El `backend/package.json` debe incluir migraciones en el build para que en Render la BD esté al día:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "prisma generate && prisma migrate deploy && tsc"
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

## 8. Instalador Web (estilo WordPress)

La aplicación incluye un **instalador web** que permite configurar todo a través de un asistente visual, similar a WordPress.

### 8.1. Cómo funciona

1. Sube los archivos al servidor
2. Accede a `https://tudominio.com/install`
3. Sigue el asistente:
   - **Paso 1**: Verificación de requisitos
   - **Paso 2**: Configuración de base de datos
   - **Paso 3**: Creación de superadmin
   - **Paso 4**: Configuración de email
   - **Paso 5**: Finalización

### 8.2. Usar el instalador

#### Paso 1: Subir archivos

Sube el contenido de `dist/` (frontend) y `backend/` al servidor.

#### Paso 2: Acceder al instalador

Navega a:
```
https://tudominio.com/install
```

#### Paso 3: Seguir el asistente

El asistente verificará:
- ✅ Versión de Node.js
- ✅ Conexión a base de datos
- ✅ Permisos de escritura
- ✅ Extensiones necesarias

#### Paso 4: Configurar base de datos

Introduce los datos de conexión:
- Host: `localhost`
- Puerto: `3306` (MySQL) o `5432` (PostgreSQL)
- Usuario: tu usuario de BD
- Contraseña: tu contraseña
- Nombre de BD: nombre de la base de datos

El instalador:
1. Prueba la conexión
2. Ejecuta las migraciones automáticamente
3. Crea las tablas necesarias

#### Paso 5: Crear superadmin

- Email del superadmin
- Contraseña segura (mínimo 8 caracteres)

#### Paso 6: Configurar email (opcional)

Puedes configurar ahora o después desde el panel:
- SMTP o Resend
- Email de prueba

#### Paso 7: Finalizar

El instalador:
1. Genera el archivo `.env`
2. Crea el superadmin
3. Elimina el instalador por seguridad
4. Redirige al login

### 8.3. Requisitos del servidor

Para que el instalador funcione, el servidor necesita:

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| Node.js | 18.x | 20.x LTS |
| RAM | 512 MB | 1 GB |
| Espacio | 500 MB | 1 GB |
| BD | MySQL 5.7+ / PostgreSQL 12+ | MySQL 8+ / PostgreSQL 15+ |

### 8.4. Seguridad

El instalador incluye protecciones:
- ❌ No accesible si ya existe `.env`
- ❌ Se auto-elimina tras la instalación
- ✅ Conexiones cifradas
- ✅ Validación de entradas

### 8.5. Instalación manual (sin asistente)

Si prefieres no usar el instalador:

```bash
# 1. Configurar .env
cp .env.example .env
nano .env  # Editar con tus valores

# 2. Ejecutar migraciones
npx prisma migrate deploy

# 3. Crear superadmin
npx tsx src/prisma/seed.ts

# 4. Iniciar servidor
npm start
```

---

## 9. Configuración de Dominio y SSL

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
- **Raiola Networks**: SSL gratuito incluido vía Let's Encrypt (activar en cPanel)

---

## 10. Post-Despliegue

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

## 11. Mantenimiento

### Backups de base de datos

```bash
# PostgreSQL
pg_dump -U usuario -h host -d nombre_db > backup_$(date +%Y%m%d).sql

# MySQL (Raiola)
mysqldump -u usuario -p nombre_db > backup_$(date +%Y%m%d).sql
```

### Actualizar aplicación

#### Con GitHub Actions (automático)

Simplemente haz push a `main`:
```bash
git push origin main
# GitHub Actions desplegará automáticamente
```

#### Manual

```bash
# En el servidor
cd ~/public_html/formula-care/backend
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 restart farmacia-backend
```

### Monitorización

- **Railway/Render**: Logs incluidos en el dashboard
- **Raiola/PM2**: `pm2 logs farmacia-backend`
- **Uptime monitoring**: UptimeRobot (gratis) o BetterStack

### Logs

```bash
# Ver logs con PM2 (Raiola)
pm2 logs farmacia-backend
pm2 logs farmacia-backend --lines 100

# Ver logs en Railway
railway logs

# Ver logs en Render
# Dashboard → Logs
```

### PM2 - Comandos útiles

```bash
# Ver estado
pm2 status

# Reiniciar
pm2 restart farmacia-backend

# Parar
pm2 stop farmacia-backend

# Ver uso de recursos
pm2 monit

# Recargar sin downtime
pm2 reload farmacia-backend
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

