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

**Importante:** cada sistema operativo debe compilar su propio instalador (Tauri no hace cross-compilation completa de un SO a otro por defecto).

### CI multiplataforma (GitHub Actions)

[`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml) compila Linux, Windows y macOS en paralelo usando [`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action):

- **Al hacer push de un tag `v*`** (p. ej. `git tag v0.2.0 && git push origin v0.2.0`): compila las tres plataformas y crea un **borrador** de release en GitHub con los seis instaladores adjuntos (`.deb`, `.rpm`, `.AppImage`, `.msi`, `.exe`, `.dmg`). El borrador te deja revisar las notas y publicarlo a mano.
- **Manual** (pestaña *Actions* → *Build app de escritorio* → *Run workflow*): compila las tres plataformas y deja los instaladores como artefactos descargables del run, sin crear ningún release — útil para comprobar que el build sigue funcionando sin necesidad de etiquetar una versión.

No requiere ningún secreto adicional: usa el `GITHUB_TOKEN` que Actions inyecta automáticamente. Lo que **no** hace este workflow —y queda fuera de alcance por ahora— es firmar los binarios: sin firma, Windows (SmartScreen) y macOS (Gatekeeper) muestran un aviso de "editor no verificado/desconocido" la primera vez que alguien abre el instalador. Firmarlos requiere un certificado de firma de código (de pago) por plataforma; ver la [documentación de Tauri sobre firma de código](https://v2.tauri.app/distribute/sign/) si se decide dar ese paso.

## Qué pasa en el primer arranque de un paquete instalado

1. Tauri (Rust, `src-tauri/src/lib.rs`) genera un `JWT_SECRET` y una `ENCRYPTION_KEY` aleatorios y los guarda en `secrets.json`, en el directorio de datos del usuario del sistema operativo (p. ej. `~/.local/share/com.abeleiras.formulacare/` en Linux).
2. Copia la base de datos plantilla (`desktop-template.db`, empaquetada como recurso) a ese mismo directorio como `formula-care.db`, si no existe ya una.
3. Aplica las migraciones de Prisma pendientes contra esa base de datos (`prisma migrate deploy`, usando el CLI ya empaquetado en `backend/node_modules` — no hace falta Node ni Prisma instalados en el sistema). En una instalación recién creada esto no hace nada (la plantilla ya está al día); en una actualización, pone al día el esquema sin tocar los datos existentes. Si falla, se registra en `migrate-error.log` (mismo directorio) y la app intenta arrancar igualmente.
4. Lanza el backend (Node, empaquetado como recurso junto a `node_modules`) apuntando a esa base de datos, en un puerto local fijo.
5. Como la base de datos plantilla no trae ningún usuario, la app muestra el formulario de "crear cuenta de administrador" (`GET /api/auth/necesita-setup`) en vez del login.
6. Al cerrar la ventana, Tauri termina el proceso del backend.

No hace falta configurar variables de entorno a mano para un usuario final: todo se genera y persiste automáticamente en su equipo.

## Actualizar una instalación existente

Instalar una versión nueva del paquete reemplaza el binario y los recursos empaquetados, pero **no toca** el directorio de datos del usuario (`formula-care.db`, `secrets.json`), así que los datos de pacientes persisten entre actualizaciones. Si el `schema.prisma` cambia entre versiones, añade una migración de Prisma normal (`npx prisma migrate dev --name ...`, generada con una base de datos de desarrollo) y quedará empaquetada junto a las demás en `backend/prisma/migrations/`; el propio arranque de la app la aplicará sola contra la base de datos del usuario (paso 3 de arriba) — no hace falta ningún paso manual adicional.

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
