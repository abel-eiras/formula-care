# Stack tecnológico - Farmacia Pontevea

Resumen del stack y convenciones del proyecto para contexto rápido (agentes y desarrolladores).

## Hosting (producción)

Cada parte del sistema está alojada en un servicio distinto:

| Parte       | Servicio | URL / nota |
|------------|----------|------------|
| **Frontend** | Vercel   | Despliegue automático desde el repo (rama `main`). |
| **Backend**  | Render   | Web Service `formula-care-api` → `https://formula-care-api.onrender.com` (plan Free: se duerme por inactividad). |
| **Base de datos** | Supabase | PostgreSQL gestionado; el backend usa su `DATABASE_URL` en producción. |

En desarrollo: frontend en `localhost:5173`, backend en `localhost:3000`, BD en SQLite (`backend/prisma/dev.db`) o conexión local a Supabase.

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
| **SQLite** | Desarrollo (archivo `dev.db`) |
| **PostgreSQL** | Producción (Supabase) |
| **Zod** | Validación de entradas |
| **JWT** | Autenticación |
| **Nodemailer / Resend** | Envío de correos |

Estructura relevante: `backend/src/routes/`, `backend/src/controllers/`, `backend/src/middleware/`, `backend/src/services/`, `backend/prisma/`.

## Convenciones

- **Idioma:** Comentarios y documentación en **español**. Nombres de variables/funciones en español cuando sea legible.
- **TypeScript:** Evitar `any`; tipos e interfaces explícitos.
- **Código:** KISS, funciones pequeñas, nombres descriptivos. Ver [guias/GUIA_CODIGO_LIMPIO.md](guias/GUIA_CODIGO_LIMPIO.md).
- **React:** Evitar waterfalls de datos (usar `Promise.all`), imports específicos, code splitting con `lazy`. Ver [guias/REACT_BEST_PRACTICES.md](guias/REACT_BEST_PRACTICES.md).
- **API:** Rutas bajo `/api/`; autenticación por JWT; validación con Zod en backend.

## Puntos de entrada

- **Frontend:** `npm run dev` (raíz) → normalmente `http://localhost:5173`.
- **Backend:** `cd backend && npm run dev` → normalmente `http://localhost:3000`.
- **Health API:** `GET /api/health` para comprobar que el backend responde.

Más detalle en [QUICKSTART.md](QUICKSTART.md) y [../backend/README.md](../backend/README.md).
