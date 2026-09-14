# Inicio rápido - Formula Care

Comandos y pasos mínimos para desarrollar en local y verificar que todo funciona.

## Requisitos

- **Node.js** 18+ (recomendado 20 LTS)
- **npm** (el proyecto usa `package-lock.json`)
- Para ejecutar/compilar la app de escritorio: [Rust y las dependencias nativas de Tauri](https://v2.tauri.app/start/prerequisites/) (no hacen falta si solo vas a trabajar en frontend o backend como web normal)

## Desarrollo en local

### Opción A: como app de escritorio (recomendado)

```bash
# Instalar dependencias
npm install
cd backend && npm install && cd ..

# Configurar y crear la base de datos local
cd backend
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed   # opcional: datos de ejemplo
cd ..

# Arrancar la app (backend embebido + ventana)
npm run tauri:dev
```

### Opción B: como web normal (dos terminales, sin Rust/Tauri)

```bash
cd backend
npm install
```

Crear `backend/.env` (puedes basarte en `backend/.env.example`):

```env
DATABASE_URL="file:./dev.db"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

Inicializar base de datos:

```bash
npm run prisma:generate
npm run prisma:migrate
# Opcional: datos de prueba
npm run prisma:seed
```

Arrancar el servidor:

```bash
npm run dev
```

El backend quedará en **http://localhost:3000**.

Desde la **raíz** del proyecto, en otra terminal:

```bash
npm install
npm run dev
```

El frontend quedará en **http://localhost:5173**.

## Verificar que funciona

1. **Backend:** Abre `http://localhost:3000/api/health`
   Debe responder algo como: `{"status":"ok","message":"API funcionando correctamente"}`

2. **Frontend/app:** Si no ejecutaste el seed, verás un formulario para crear la cuenta de administrador (primer arranque); si lo ejecutaste, inicia sesión con `admin@farmacia.local` / `changeme123` (cámbiala después) y comprueba que no hay errores de red en la consola.

## Comandos útiles

| Dónde | Comando | Descripción |
|-------|---------|-------------|
| Raíz | `npm run tauri:dev` | App de escritorio completa (backend + ventana) |
| Raíz | `npm run tauri:build` | Genera el instalador nativo |
| Raíz | `npm run dev` | Dev frontend (Vite), sin Tauri |
| Raíz | `npm run build` | Build frontend |
| Raíz | `npm run lint` | Lint frontend |
| Backend | `npm run dev` | Dev backend (Express) |
| Backend | `npm run prisma:studio` | Abrir Prisma Studio (BD) |
| Backend | `npm run prisma:migrate` | Aplicar migraciones |
| Backend | `npm run build:desktop` | Compila el backend y genera la plantilla de BD para empaquetar |

## Más información

- Variables de entorno completas del backend y API: [../backend/README.md](../backend/README.md)
- Configuración de email: [../backend/EMAIL_CONFIG.md](../backend/EMAIL_CONFIG.md)
- Empaquetado de escritorio: [guias/GUIA_DESPLIEGUE.md](guias/GUIA_DESPLIEGUE.md)
- Reserva pública opcional (proyecto aparte): [../booking-web/README.md](../booking-web/README.md)
