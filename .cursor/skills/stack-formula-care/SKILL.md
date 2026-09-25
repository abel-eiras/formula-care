---
name: stack-formula-care
description: Proporciona contexto del stack tecnológico y la estructura del proyecto Formula Care. Usar cuando se necesite saber qué tecnologías se usan, dónde está el frontend/backend, convenciones de nombres o cómo está organizado el código.
---

# Stack y Estructura - Formula Care

Este skill resume el stack y la organización del proyecto. Detalle en [context/STACK.md](../../context/STACK.md) y [context/guias/ESTRUCTURA_PROYECTO.md](../../context/guias/ESTRUCTURA_PROYECTO.md).

## Stack

Formula Care es una **app de escritorio** (Tauri 2): el frontend y un backend
Express embebido corren en el ordenador de la farmacia, con una base de datos
SQLite local. No hay servidores en la nube (ni Vercel, ni Render, ni Supabase:
eso era la arquitectura web antigua, ya retirada).

### App de escritorio (`src-tauri/`)

Tauri 2 (Rust): abre la ventana, arranca el backend como proceso hijo con un
Node.js empaquetado (sidecar), aplica las migraciones al arrancar y guarda la
base de datos en la carpeta de datos del usuario.

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
| SQLite      | Base de datos local (también en producción) |
| Zod         | Validación    |
| JWT         | Auth (token Bearer en la app de escritorio) |
| Vitest      | Tests (`backend/tests/`) |

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
│   ├── prisma/
│   └── tests/
├── src-tauri/     # App de escritorio (Tauri, Rust)
├── booking-web/   # Reserva online opcional (proyecto aparte, desactivada en la app)
├── context/       # Documentación (guías, old, integraciones)
└── .cursor/skills/# Skills de proyecto
```

## Convenciones

- **Idioma:** Comentarios y documentación en **español**. Nombres de variables/funciones en español cuando sea claro.
- **API:** Rutas bajo prefijo `/api/`. Autenticación JWT. Validación con Zod en backend.
- **Nombres:** Componentes/páginas PascalCase; hooks con prefijo `use`; archivos de utilidades y tipos en camelCase.
- **Base de datos:** Prisma + SQLite, tanto en desarrollo (`file:./dev.db`) como en la app instalada (un fichero por instalación).

## Distribución (producción)

- Instaladores de Windows, macOS y Linux generados por GitHub Actions
  (`.github/workflows/desktop-release.yml`) al publicar una release con tag `v*`.
- La app instalada usa su backend local en `http://localhost:4577`.

## Puntos de entrada

- **App de escritorio:** `npm run tauri:dev` (raíz)
- **Frontend:** `npm run dev` (raíz) → http://localhost:5173
- **Backend:** `cd backend && npm run dev` → http://localhost:3000
- **Health:** `GET /api/health`

## Referencias en el proyecto

- [context/STACK.md](../../context/STACK.md) – Stack resumido.
- [context/QUICKSTART.md](../../context/QUICKSTART.md) – Comandos de inicio.
- [context/guias/ESTRUCTURA_PROYECTO.md](../../context/guias/ESTRUCTURA_PROYECTO.md) – Estructura detallada.
- [backend/README.md](../../backend/README.md) – API y setup del backend.
