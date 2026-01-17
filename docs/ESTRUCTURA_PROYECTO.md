# Estructura del Proyecto - Farmacia Pontevea

## 📂 Organización de Carpetas

```
farmaciapontevea_servicios/
│
├── 📄 README.md                    # Documentación principal del proyecto
├── 📄 PROPUESTA_DESARROLLO.md     # Propuesta de desarrollo (este documento)
├── 📄 package.json                 # Dependencias del proyecto
├── 📄 .env.example                 # Variables de entorno de ejemplo
├── 📄 .gitignore                   # Archivos a ignorar en git
│
├── 📁 frontend/                    # Aplicación React (Frontend)
│   ├── 📁 public/                 # Archivos estáticos
│   │   ├── favicon.ico
│   │   └── robots.txt
│   │
│   ├── 📁 src/
│   │   ├── 📄 main.tsx            # Punto de entrada de la aplicación
│   │   ├── 📄 App.tsx             # Componente raíz con routing
│   │   ├── 📄 index.css           # Estilos globales
│   │   │
│   │   ├── 📁 pages/              # Páginas de la aplicación
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Pacientes.tsx
│   │   │   ├── PacienteDetalle.tsx
│   │   │   ├── NuevoPaciente.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── ServicioDermo.tsx
│   │   │   ├── ServicioBio.tsx
│   │   │   └── NotFound.tsx
│   │   │
│   │   ├── 📁 components/         # Componentes reutilizables
│   │   │   ├── 📁 ui/            # Componentes UI base (shadcn/ui)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── 📁 layout/        # Componentes de layout
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   └── AppSidebar.tsx
│   │   │   │
│   │   │   ├── 📁 dashboard/     # Componentes específicos del dashboard
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── EvolutionChart.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── 📁 pacientes/     # Componentes relacionados con pacientes
│   │   │       ├── PacienteCard.tsx
│   │   │       └── PacienteForm.tsx
│   │   │
│   │   ├── 📁 hooks/              # Custom React hooks
│   │   │   ├── usePacientes.ts
│   │   │   ├── useServicios.ts
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── 📁 lib/                # Utilidades y helpers
│   │   │   ├── api.ts            # Cliente HTTP para API
│   │   │   ├── utils.ts          # Funciones auxiliares
│   │   │   └── constants.ts      # Constantes de la aplicación
│   │   │
│   │   ├── 📁 types/              # Definiciones de TypeScript
│   │   │   ├── paciente.ts
│   │   │   ├── servicio.ts
│   │   │   └── index.ts
│   │   │
│   │   └── 📁 test/              # Tests (si son necesarios)
│   │       └── setup.ts
│   │
│   ├── 📄 vite.config.ts          # Configuración de Vite
│   ├── 📄 tailwind.config.ts      # Configuración de Tailwind
│   ├── 📄 tsconfig.json           # Configuración de TypeScript
│   └── 📄 package.json            # Dependencias del frontend
│
├── 📁 backend/                     # API Node.js (Backend)
│   ├── 📁 src/
│   │   ├── 📄 server.ts           # Punto de entrada del servidor
│   │   │
│   │   ├── 📁 routes/             # Definición de rutas
│   │   │   ├── index.ts          # Agrupa todas las rutas
│   │   │   ├── pacientes.ts      # Rutas de pacientes
│   │   │   ├── servicios.ts       # Rutas de servicios
│   │   │   ├── citas.ts          # Rutas de citas
│   │   │   └── auth.ts            # Rutas de autenticación
│   │   │
│   │   ├── 📁 controllers/        # Lógica de negocio
│   │   │   ├── pacientes.ts
│   │   │   ├── servicios.ts
│   │   │   ├── citas.ts
│   │   │   └── auth.ts
│   │   │
│   │   ├── 📁 middleware/         # Middleware de Express
│   │   │   ├── auth.ts            # Autenticación
│   │   │   ├── validacion.ts     # Validación de datos
│   │   │   └── errorHandler.ts   # Manejo de errores
│   │   │
│   │   ├── 📁 lib/                # Utilidades del backend
│   │   │   ├── prisma.ts         # Cliente de Prisma
│   │   │   └── utils.ts          # Funciones auxiliares
│   │   │
│   │   ├── 📁 types/              # Tipos TypeScript
│   │   │   └── index.ts
│   │   │
│   │   └── 📁 prisma/             # Schema y migraciones de Prisma
│   │       ├── schema.prisma      # Esquema de base de datos
│   │       └── migrations/        # Migraciones (generadas)
│   │
│   ├── 📄 package.json            # Dependencias del backend
│   ├── 📄 tsconfig.json           # Configuración de TypeScript
│   └── 📄 .env                    # Variables de entorno (no en git)
│
├── 📁 docs/                        # Documentación del proyecto
│   ├── API.md                     # Documentación de la API
│   ├── DATABASE.md                # Esquema de base de datos
│   ├── DEPLOYMENT.md              # Guía de despliegue
│   ├── GUIA_CODIGO_LIMPIO.md      # Guía de código limpio
│   ├── REACT_BEST_PRACTICES.md    # Mejores prácticas de React
│   └── ESTRUCTURA_PROYECTO.md     # Este archivo
├── 📄 AGENTS.md                    # Guía para agentes de IA
│
└── 📁 scripts/                     # Scripts útiles
    ├── setup.sh                   # Script de configuración inicial
    ├── seed.ts                    # Script para poblar BD con datos de prueba
    └── backup.sh                  # Script de backup (si es necesario)
```

---

## 📋 Descripción de Carpetas Principales

### Frontend (`/frontend`)

**`/src/pages/`** - Páginas principales de la aplicación
- Cada página es un componente que representa una ruta
- Nombres en PascalCase
- Ejemplo: `Pacientes.tsx`, `NuevoPaciente.tsx`

**`/src/components/`** - Componentes reutilizables
- **`ui/`** - Componentes UI base (botones, inputs, etc.)
- **`layout/`** - Componentes de estructura (sidebar, header)
- **`dashboard/`**, **`pacientes/`**, etc. - Componentes específicos por funcionalidad

**`/src/hooks/`** - Custom hooks
- Lógica reutilizable encapsulada en hooks
- Ejemplo: `usePacientes()` para gestionar estado de pacientes

**`/src/lib/`** - Utilidades y configuraciones
- **`api.ts`** - Cliente HTTP configurado
- **`utils.ts`** - Funciones auxiliares
- **`constants.ts`** - Constantes de la aplicación

**`/src/types/`** - Definiciones de tipos TypeScript
- Tipos compartidos entre componentes
- Interfaces y tipos relacionados agrupados

---

### Backend (`/backend`)

**`/src/routes/`** - Definición de rutas
- Cada archivo define las rutas de un recurso
- Ejemplo: `pacientes.ts` define `/api/pacientes/*`

**`/src/controllers/`** - Lógica de negocio
- Funciones que procesan las peticiones
- Separadas de las rutas para mantener código limpio

**`/src/middleware/`** - Middleware de Express
- Autenticación, validación, manejo de errores
- Reutilizable en múltiples rutas

**`/src/prisma/`** - Base de datos
- **`schema.prisma`** - Define el esquema de la BD
- **`migrations/`** - Historial de cambios (generado automáticamente)

---

## 🎯 Convenciones de Nombres

### Archivos y Carpetas
- **Componentes React**: PascalCase - `PacienteCard.tsx`
- **Hooks**: camelCase con prefijo `use` - `usePacientes.ts`
- **Utilidades**: camelCase - `api.ts`, `utils.ts`
- **Tipos**: camelCase - `paciente.ts`, `servicio.ts`
- **Páginas**: PascalCase - `Dashboard.tsx`

### Variables y Funciones
- **Variables**: camelCase - `nombrePaciente`, `listaServicios`
- **Funciones**: camelCase - `obtenerPacientes()`, `crearCita()`
- **Constantes**: UPPER_SNAKE_CASE - `MAX_PACIENTES`, `API_URL`
- **Componentes**: PascalCase - `PacienteCard`, `Dashboard`

### Base de Datos
- **Tablas**: snake_case plural - `pacientes`, `analisis_dermo`
- **Columnas**: snake_case - `fecha_creacion`, `tipo_piel`

---

## 📦 Archivos de Configuración

### En la Raíz
- `package.json` - Dependencias y scripts principales
- `.env.example` - Plantilla de variables de entorno
- `.gitignore` - Archivos a ignorar
- `README.md` - Documentación principal

### Frontend
- `vite.config.ts` - Configuración de Vite
- `tailwind.config.ts` - Configuración de Tailwind CSS
- `tsconfig.json` - Configuración de TypeScript

### Backend
- `tsconfig.json` - Configuración de TypeScript
- `.env` - Variables de entorno (no en git)

---

## 🔄 Flujo de Datos

```
Usuario → Frontend (React) → API (Express) → Base de Datos (Prisma)
                ↓                                    ↓
         React Query                          Prisma ORM
         (gestión estado)                     (acceso BD)
```

---

## ✅ Reglas de Organización

1. **Un archivo = Una responsabilidad**
   - No mezclar lógica de diferentes funcionalidades

2. **Agrupar por funcionalidad, no por tipo**
   - Mejor: `components/pacientes/PacienteCard.tsx`
   - Peor: `components/cards/PacienteCard.tsx`

3. **Mantener la raíz limpia**
   - Solo archivos de configuración esenciales
   - Todo lo demás en carpetas apropiadas

4. **Documentación junto al código**
   - README en cada carpeta importante
   - Comentarios en código complejo

---

## 🚀 Próximos Pasos

1. Revisar y aprobar esta estructura
2. Crear las carpetas necesarias
3. Mover archivos existentes a su ubicación correcta
4. Configurar el backend siguiendo esta estructura

---

**Esta estructura está diseñada para ser:**
- ✅ Fácil de navegar
- ✅ Escalable
- ✅ Mantenible
- ✅ Intuitiva para nuevos desarrolladores
