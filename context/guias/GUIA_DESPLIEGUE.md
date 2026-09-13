# Guía de Distribución de la App de Escritorio

Formula Care ya no se despliega como servicio web (SaaS). Se distribuye como
app de escritorio: cada usuario instala un paquete nativo (`.deb`/`.rpm`/AppImage
en Linux, `.msi`/`.exe` en Windows, `.dmg` en macOS) y todo corre localmente en
su equipo. No hay "servidor de producción" que mantener para la app en sí.

> La guía de despliegue de la antigua arquitectura SaaS (Vercel/Render/Supabase,
> Raiola con GitHub Actions, MySQL/PostgreSQL) se conserva como referencia
> histórica en [context/old/GUIA_DESPLIEGUE_SAAS_LEGACY.md](../old/GUIA_DESPLIEGUE_SAAS_LEGACY.md).
> Ya no aplica a este proyecto.

## Compilar un instalador

Requisitos: Node.js 18+, y [Rust + las dependencias nativas de Tauri](https://v2.tauri.app/start/prerequisites/) para tu sistema operativo.

```bash
npm install
cd backend && npm install && cd ..
npm run tauri:build
```

Esto:
1. Compila el frontend (`vite build`, con `VITE_API_URL` apuntando al puerto local del backend embebido).
2. Compila y empaqueta el backend (`backend/npm run build:desktop`): genera el cliente Prisma, compila TypeScript, y crea `backend/prisma/desktop-template.db` (una base de datos SQLite ya migrada, sin datos — la plantilla que se copia al equipo del usuario en el primer arranque).
3. Invoca `tauri build`, que compila el binario nativo (Rust) y genera los instaladores en `src-tauri/target/release/bundle/`.

**Importante:** cada sistema operativo debe compilar su propio instalador (Tauri no hace cross-compilation completa de un SO a otro por defecto). Para distribuir en Windows, macOS y Linux hace falta compilar en cada uno, normalmente vía una matriz de CI (ver la [documentación oficial de Tauri sobre CI](https://v2.tauri.app/distribute/) para ejemplos de GitHub Actions).

## Qué pasa en el primer arranque de un paquete instalado

1. Tauri (Rust, `src-tauri/src/lib.rs`) genera un `JWT_SECRET` y una `ENCRYPTION_KEY` aleatorios y los guarda en `secrets.json`, en el directorio de datos del usuario del sistema operativo (p. ej. `~/.local/share/com.abeleiras.formulacare/` en Linux).
2. Copia la base de datos plantilla (`desktop-template.db`, empaquetada como recurso) a ese mismo directorio como `formula-care.db`, si no existe ya una.
3. Lanza el backend (Node, empaquetado como recurso junto a `node_modules`) apuntando a esa base de datos, en un puerto local fijo.
4. Como la base de datos plantilla no trae ningún usuario, la app muestra el formulario de "crear cuenta de administrador" (`GET /api/auth/necesita-setup`) en vez del login.
5. Al cerrar la ventana, Tauri termina el proceso del backend.

No hace falta configurar variables de entorno a mano para un usuario final: todo se genera y persiste automáticamente en su equipo.

## Actualizar una instalación existente

Instalar una versión nueva del paquete reemplaza el binario y los recursos empaquetados, pero **no toca** el directorio de datos del usuario (`formula-care.db`, `secrets.json`), así que los datos de pacientes persisten entre actualizaciones. Si el `schema.prisma` cambia entre versiones, añade una migración de Prisma normal (`npx prisma migrate dev --name ...`) — queda pendiente automatizar cómo se aplican esas migraciones a una base de datos ya existente en el directorio de datos del usuario en el arranque (hoy solo se copia la plantilla si el fichero no existe todavía).

## El servicio opcional de reserva pública (`booking-web/`)

`booking-web/` es un proyecto aparte, pensado para desplegarse como un servicio
web normal (Render, Fly.io, un VPS, etc. + una base de datos Postgres o SQLite
con disco persistente) para quien quiera ofrecer reserva de citas online. Tiene
su propia guía de despliegue en [booking-web/README.md](../../booking-web/README.md)
y no comparte base de datos ni proceso con la app de escritorio.

## Copias de seguridad

La base de datos de cada instalación es un único fichero SQLite en el
directorio de datos del usuario del sistema operativo. Para hacer copia de
seguridad, basta con copiar ese fichero (con la app cerrada, para evitar
escrituras a medias):

- Linux: `~/.local/share/com.abeleiras.formulacare/formula-care.db`
- macOS: `~/Library/Application Support/com.abeleiras.formulacare/formula-care.db`
- Windows: `%APPDATA%\com.abeleiras.formulacare\formula-care.db`

Un sistema de copia de seguridad automática (p. ej. programada desde la propia
app) está en el roadmap, no implementado todavía.
