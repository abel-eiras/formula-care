# Estructura del Proyecto - Formula Care

## 📂 Organización de Carpetas

```
formula-care/
│
├── 📄 README.md                    # Documentación principal del proyecto
├── 📄 AGENTS.md                   # Guía para agentes de IA
├── 📄 LICENSE                      # Licencia MIT
├── 📄 package.json                 # Dependencias del proyecto (frontend + scripts de Tauri)
├── 📄 .gitignore                   # Archivos a ignorar en git
│
├── 📁 src/                         # Frontend React (empaquetado en la app de escritorio)
│   ├── 📄 main.tsx                # Punto de entrada
│   ├── 📄 App.tsx                 # Componente raíz con routing
│   ├── 📁 pages/                  # Páginas
│   ├── 📁 components/             # Componentes reutilizables
│   ├── 📁 hooks/                  # Custom hooks
│   ├── 📁 lib/                    # Utilidades (api.ts, utils.ts)
│   └── 📁 types/                  # Tipos TypeScript
│
├── 📁 public/                     # Archivos estáticos del frontend
├── 📁 context/                    # Documentación para agentes y referencia
│   ├── guias/                     # Guías activas (código limpio, React, despliegue)
│   ├── integraciones/             # Guías de integraciones opcionales
│   └── old/                       # Documentación histórica (incluida la del SaaS anterior)
│
├── 📁 backend/                    # API Node.js (embebida en la app de escritorio)
│   ├── 📁 src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── lib/
│   ├── 📁 prisma/                 # schema.prisma (SQLite) y migraciones
│   └── package.json
│
├── 📁 src-tauri/                  # Empaquetado de escritorio (Tauri, Rust)
│   ├── 📁 src/                    # lib.rs: arranca/detiene el backend embebido
│   └── tauri.conf.json
│
├── 📁 booking-web/                # Servicio OPCIONAL y aparte: reserva pública de citas
│                                  # (proyecto independiente, sin sincronizar con la app de escritorio)
│
└── 📁 .cursor/skills/             # Skills de proyecto para agentes
```

---

## 📋 Descripción de Carpetas Principales

### Frontend (raíz: `/src`)

**`/src/pages/`** - Páginas principales de la aplicación
- Cada página es un componente que representa una ruta
- Nombres en PascalCase
- Ejemplo: `Pacientes.tsx`, `NuevoPaciente.tsx`

**`/src/components/`** - Componentes reutilizables
- **`ui/`** - Componentes UI base (shadcn/ui)
- **`layout/`** - Componentes de estructura (sidebar, header)
- **`dashboard/`**, **`pacientes/`**, etc. - Componentes por funcionalidad

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

**`/prisma/`** - Base de datos
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
- `package.json` - Dependencias y scripts del frontend
- `.env.example` - Plantilla de variables de entorno
- `.gitignore` - Archivos a ignorar
- `README.md` - Documentación principal
- `AGENTS.md` - Guía para agentes de IA

### Frontend
- `vite.config.ts` - Configuración de Vite
- `tailwind.config.ts` - Configuración de Tailwind CSS
- `tsconfig.json` - Configuración de TypeScript

### Backend
- `backend/tsconfig.json` - Configuración de TypeScript
- `backend/.env` - Variables de entorno (no en git)

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
   - Documentación de referencia en `context/`

4. **Documentación junto al código**
   - README en cada carpeta importante
   - Comentarios en código complejo

---

**Esta estructura está diseñada para ser:**
- ✅ Fácil de navegar
- ✅ Escalable
- ✅ Mantenible
- ✅ Intuitiva para nuevos desarrolladores
