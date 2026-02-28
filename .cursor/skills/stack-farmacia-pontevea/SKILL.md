---
name: stack-farmacia-pontevea
description: Proporciona contexto del stack tecnológico y la estructura del proyecto Farmacia Pontevea. Usar cuando se necesite saber qué tecnologías se usan, dónde está el frontend/backend, convenciones de nombres o cómo está organizado el código.
---

# Stack y Estructura - Farmacia Pontevea

Este skill resume el stack y la organización del proyecto. Detalle en [context/STACK.md](../../context/STACK.md) y [context/guias/ESTRUCTURA_PROYECTO.md](../../context/guias/ESTRUCTURA_PROYECTO.md).

## Stack

### Frontend (raíz del proyecto)

| Tecnología   | Uso                    |
|-------------|------------------------|
| React 18    | UI                     |
| TypeScript  | Tipado                 |
| Vite        | Build y dev            |
| shadcn/ui   | Componentes UI         |
| Tailwind    | Estilos                |
| React Router| Rutas                  |
| React Query | Datos del servidor     |
| React Hook Form + Zod | Formularios y validación |

El frontend vive en la **raíz**: `src/`, `public/`, `index.html`, `vite.config.ts`, etc. No hay carpeta `frontend/`.

### Backend (`backend/`)

| Tecnología   | Uso           |
|-------------|----------------|
| Node.js     | Runtime       |
| Express     | API REST      |
| Prisma      | ORM           |
| SQLite      | Dev (dev.db)  |
| PostgreSQL (Supabase) | Producción |
| Zod         | Validación    |
| JWT         | Auth          |

Estructura típica: `backend/src/routes/`, `controllers/`, `middleware/`, `services/`, `lib/`, y `backend/prisma/` (schema, migraciones).

## Estructura de carpetas relevante

```
(raíz)
├── src/           # Frontend
│   ├── pages/     # Páginas (PascalCase)
│   ├── components/# ui/, layout/, dashboard/, pacientes/, etc.
│   ├── hooks/     # usePacientes, useAuth, etc.
│   ├── lib/       # api.ts, utils.ts
│   └── types/     # Tipos TypeScript
├── backend/       # API
│   ├── src/
│   └── prisma/
├── context/       # Documentación (guías, old, integraciones)
└── .cursor/skills/# Skills de proyecto
```

## Convenciones

- **Idioma:** Comentarios y documentación en **español**. Nombres de variables/funciones en español cuando sea claro.
- **API:** Rutas bajo prefijo `/api/`. Autenticación JWT. Validación con Zod en backend.
- **Nombres:** Componentes/páginas PascalCase; hooks con prefijo `use`; archivos de utilidades y tipos en camelCase.
- **Base de datos:** Prisma; en desarrollo SQLite (`file:./dev.db`); en producción PostgreSQL (Supabase).

## Hosting (producción)

- **Frontend:** Vercel (deploy automático desde el repo).
- **Backend:** Render → `https://formula-care-api.onrender.com`.
- **Base de datos:** Supabase (PostgreSQL).

## Puntos de entrada

- **Frontend:** `npm run dev` (raíz) → http://localhost:5173
- **Backend:** `cd backend && npm run dev` → http://localhost:3000
- **Health:** `GET /api/health`

## Referencias en el proyecto

- [context/STACK.md](../../context/STACK.md) – Stack resumido.
- [context/QUICKSTART.md](../../context/QUICKSTART.md) – Comandos de inicio.
- [context/guias/ESTRUCTURA_PROYECTO.md](../../context/guias/ESTRUCTURA_PROYECTO.md) – Estructura detallada.
- [backend/README.md](../../backend/README.md) – API y setup del backend.
