# Stack tecnológico - Formula Care

Resumen del stack y convenciones del proyecto para contexto rápido (agentes y desarrolladores).

## Arquitectura: app de escritorio local-first

Formula Care es una app de escritorio (Tauri) de código abierto (MIT). No hay
despliegue en la nube ni multi-tenancy: **una instalación = una farmacia**,
con su propia base de datos SQLite local.

| Parte | Tecnología | Nota |
|-------|-----------|------|
| **Empaquetado** | Tauri 2 (Rust) | Genera el instalador nativo; embebe el backend Node como proceso hijo. |
| **Frontend** | React + Vite | Se sirve desde el propio webview de la app. |
| **Backend** | Node.js + Express | Arranca y se cierra junto con la app; escucha en localhost. |
| **Base de datos** | SQLite (Prisma) | Un fichero por instalación, en el directorio de datos del usuario del SO. |

En desarrollo: frontend en `localhost:5173`, backend en `localhost:3000`, BD en SQLite (`backend/prisma/dev.db`).

Hay un componente **opcional y aparte**, [`booking-web/`](../booking-web/), para quien quiera ofrecer reserva pública de citas online; es un proyecto independiente (su propio backend/frontend/base de datos) sin sincronización con la app de escritorio. Ver [booking-web/README.md](../booking-web/README.md).

## Frontend (raíz del proyecto)

| Tecnología | Uso |
|------------|-----|
| **React 18** | UI y componentes |
| **TypeScript** | Tipado estricto en todo el frontend |
| **Vite** | Build y dev server |
| **shadcn/ui** | Componentes UI (Radix + Tailwind) |
| **Tailwind CSS** | Estilos |
| **React Router** | Navegación y rutas |
| **TanStack React Query** | Datos del servidor, cache, mutaciones |
| **React Hook Form + Zod** | Formularios y validación |
| **Zod** | Esquemas de validación (compartido con backend cuando aplique) |

Estructura relevante: `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`.

## Backend (`backend/`)

| Tecnología | Uso |
|------------|-----|
| **Node.js** | Runtime |
| **Express** | API REST |
| **Prisma** | ORM y migraciones |
| **SQLite** | Base de datos de cada instalación (local, sin multi-tenancy) |
| **Zod** | Validación de entradas |
| **JWT** | Autenticación (cookie HttpOnly) |
| **Nodemailer / Resend** | Envío de correos (opcional, configurable desde Configuración) |

Estructura relevante: `backend/src/routes/`, `backend/src/controllers/`, `backend/src/middleware/`, `backend/src/services/`, `backend/prisma/`.

## App de escritorio (`src-tauri/`)

| Tecnología | Uso |
|------------|-----|
| **Tauri 2** | Framework de empaquetado (Rust + webview del sistema) |
| `src-tauri/src/lib.rs` | Arranca el backend embebido (dev: `npm run dev`; producción: sidecar Node + recursos empaquetados), genera secretos locales, gestiona la base de datos del usuario |

## Convenciones

- **Idioma:** Comentarios y documentación en **español**. Nombres de variables/funciones en español cuando sea legible.
- **TypeScript:** Evitar `any`; tipos e interfaces explícitos.
- **Código:** KISS, funciones pequeñas, nombres descriptivos. Ver [guias/GUIA_CODIGO_LIMPIO.md](guias/GUIA_CODIGO_LIMPIO.md).
- **React:** Evitar waterfalls de datos (usar `Promise.all`), imports específicos, code splitting con `lazy`. Ver [guias/REACT_BEST_PRACTICES.md](guias/REACT_BEST_PRACTICES.md).
- **API:** Rutas bajo `/api/`; autenticación por JWT; validación con Zod en backend.
- **Sin multi-tenancy:** no reintroducir `farmaciaId` ni un rol `superadmin` en `backend/`/`src/` — eso pertenece a la arquitectura SaaS anterior. Si una función necesita distinguir instalaciones, es una señal de que probablemente pertenece a `booking-web/`, no al backend de escritorio.

## Puntos de entrada

- **App de escritorio:** `npm run tauri:dev` (raíz).
- **Solo frontend:** `npm run dev` (raíz) → `http://localhost:5173`.
- **Solo backend:** `cd backend && npm run dev` → `http://localhost:3000`.
- **Health API:** `GET /api/health` para comprobar que el backend responde.

Más detalle en [QUICKSTART.md](QUICKSTART.md) y [../backend/README.md](../backend/README.md).
