# Farmacia Pontevea - Sistema de Gestión de Servicios

Sistema de gestión para servicios asistenciales de farmacia, incluyendo análisis dermocosmético y bioquímico, gestión de pacientes y calendario de citas.

## 📋 Estado del Proyecto

### ✅ Completado
- **Frontend React con TypeScript**
  - UI moderna con shadcn/ui y Tailwind CSS
  - Dashboard con estadísticas en tiempo real
  - Gestión de pacientes (CRUD completo)
  - Calendario de citas integrado
  - Formularios de análisis dermocosmético y bioquímico
  - Generación de informes PDF
  - Sistema de notificaciones
  - Configuración dinámica de parámetros bioquímicos

- **Backend API con Node.js + Express**
  - API RESTful completa
  - Base de datos con Prisma ORM (SQLite/PostgreSQL)
  - Controladores para pacientes, citas, análisis, notificaciones
  - Servicio de disponibilidad de calendario
  - Sistema de eventos para citas públicas
  - Configuración centralizada por farmacia
  - Tipos TypeScript estrictos (sin errores de compilación)

- **Sistema de Autenticación**
  - Login con JWT
  - Roles: superadmin, admin, farmaceutico, usuario
  - Protección de rutas por rol
  - Sesiones persistentes con localStorage

- **Sistema Multi-Tenant**
  - Modelo `Farmacia` para múltiples farmacias
  - Aislamiento de datos por farmacia
  - Panel de administración para superadmin
  - Gestión de farmacias, usuarios y planes

- **Sistema de Calendario**
  - Página pública de solicitud de citas
  - Configuración de horarios por servicio
  - Gestión de eventos con fechas y horarios
  - Aprobación/rechazo de solicitudes

- **Sistema de Correos**
  - Plantillas editables (HTML)
  - Soporte para Nodemailer y Resend
  - Enlaces de confirmación/cancelación de citas
  - Tokens únicos con expiración

- **RGPD y Legal**
  - Configuración de textos legales
  - Política de privacidad, cookies, términos
  - Solo en páginas públicas (no en panel admin)

### 🚧 En Desarrollo
- Mejoras de rendimiento
- Tests automatizados

### 📝 Planificado
Ver [PROPUESTA_DESARROLLO.md](./PROPUESTA_DESARROLLO.md) para detalles completos.

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+ y npm
- (Opcional) Git para clonar el repositorio

### Instalación

```bash
# 1. Clonar el repositorio (si aún no lo has hecho)
git clone https://github.com/abel-eiras/farmaciapontevea_servicios.git
cd farmaciapontevea_servicios

# 2. Instalar dependencias del frontend
npm install

# 3. Instalar dependencias del backend
cd backend && npm install && cd ..

# 4. Configurar base de datos
cd backend
npx prisma db push
npx tsx src/prisma/seed.ts
cd ..

# 5. Iniciar servidores de desarrollo (en dos terminales)
# Terminal 1 - Backend:
cd backend && npm run dev

# Terminal 2 - Frontend:
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

### Credenciales de Desarrollo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Superadmin | `superadmin@sistema.local` | `superadmin123` |
| Admin Farmacia | `admin@farmaciademo.com` | `admin123` |

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes UI
- **React Router** - Navegación
- **React Query** - Gestión de estado del servidor
- **React Hook Form + Zod** - Formularios y validación

### Backend
- **Node.js + Express** - Servidor API REST
- **Prisma** - ORM para base de datos
- **SQLite** - Base de datos (PostgreSQL en producción)
- **Zod** - Validación de esquemas
- **TypeScript estricto** - Sin errores de compilación

---

## 📁 Estructura del Proyecto

```
farmaciapontevea_servicios/
├── src/                        # Frontend React
│   ├── pages/                  # Páginas de la aplicación
│   │   └── admin/              # Páginas de administración (superadmin)
│   ├── components/             # Componentes reutilizables
│   │   ├── auth/               # Componentes de autenticación
│   │   ├── dashboard/          # Componentes del dashboard
│   │   ├── layout/             # Layout principal
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── contexts/               # Contextos React (Auth)
│   ├── hooks/                  # Custom hooks (React Query)
│   ├── lib/                    # Utilidades (API, PDF, etc.)
│   └── types/                  # Tipos TypeScript
├── backend/                    # Backend Node.js + Express
│   ├── prisma/                 # Schema y migraciones
│   └── src/
│       ├── controllers/        # Controladores de API
│       ├── middleware/         # Middlewares (auth, tenant, etc.)
│       ├── routes/             # Rutas de API
│       ├── services/           # Servicios (email, notificaciones)
│       └── scripts/            # Scripts de migración
├── docs/                       # Documentación
└── public/                     # Archivos estáticos
```

Para más detalles, ver [ESTRUCTURA_PROYECTO.md](./docs/ESTRUCTURA_PROYECTO.md)

---

## 📚 Documentación

- **[Propuesta de Desarrollo](./PROPUESTA_DESARROLLO.md)** - Plan completo del proyecto
- **[Guía de Código Limpio](./docs/GUIA_CODIGO_LIMPIO.md)** - Estándares de código
- **[Estructura del Proyecto](./docs/ESTRUCTURA_PROYECTO.md)** - Organización de archivos
- **[Mejores Prácticas de React](./docs/REACT_BEST_PRACTICES.md)** - Optimización y rendimiento en React

---

## 🎯 Funcionalidades Principales

### Gestión de Pacientes
- Listado de pacientes con búsqueda
- Detalle completo de cada paciente
- Registro de nuevos pacientes
- Historial de visitas y análisis

### Análisis Dermocosmético
- Formulario completo de evaluación de piel
- Captura de parámetros (hidratación, sebo, elasticidad, etc.)
- Plan de tratamiento personalizado
- Recomendaciones de productos

### Análisis Bioquímico
- Registro de parámetros sanguíneos
- Cálculo automático de IMC
- Alertas visuales para valores fuera de rango
- Seguimiento de evolución

### Calendario
- Vista mensual de citas
- Creación y gestión de citas
- Diferentes tipos de citas (dermo, bio, consulta, seguimiento)
- (Planificado) Sincronización con Google Calendar

### Dashboard
- Estadísticas generales
- Gráficos de evolución
- Accesos rápidos
- Pacientes recientes

---

## 💻 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo

# Build
npm run build        # Construye para producción
npm run build:dev    # Construye en modo desarrollo

# Testing
npm run test         # Ejecuta tests
npm run test:watch   # Tests en modo watch

# Linting
npm run lint         # Verifica código con ESLint

# Preview
npm run preview      # Previsualiza build de producción
```

---

## 🧩 Principios de Desarrollo

Este proyecto sigue principios de **código limpio y simple**:

- ✅ **Simplicidad sobre complejidad** - Soluciones simples que funcionan
- ✅ **Código legible** - Fácil de entender sin explicación
- ✅ **Funciones pequeñas** - Una responsabilidad por función
- ✅ **Nombres descriptivos** - Variables y funciones que se explican solas
- ✅ **Comentarios útiles** - Explican el "por qué", no el "qué"
- ✅ **Sin sobre-ingeniería** - Solo lo necesario
- ✅ **Mejores prácticas de React** - Basadas en [Vercel Labs Agent Skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)

Ver [GUIA_CODIGO_LIMPIO.md](./docs/GUIA_CODIGO_LIMPIO.md) y [REACT_BEST_PRACTICES.md](./docs/REACT_BEST_PRACTICES.md) para más detalles.

---

## 🤝 Contribución

### Antes de Contribuir

1. Lee la [Propuesta de Desarrollo](./PROPUESTA_DESARROLLO.md)
2. Revisa la [Guía de Código Limpio](./docs/GUIA_CODIGO_LIMPIO.md)
3. Asegúrate de seguir la estructura del proyecto

### Proceso

1. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Realiza tus cambios siguiendo los estándares de código
3. Asegúrate de que el código compile sin errores
4. Haz commit con mensajes claros
5. Crea un Pull Request

---

## 📝 Notas Importantes

- **Código en español**: Comentarios y documentación en español
- **TypeScript estricto**: Evitar `any`, usar tipos explícitos
- **Componentes pequeños**: Máximo 200 líneas por componente
- **Funciones enfocadas**: Una sola responsabilidad por función

---

## 🐛 Problemas Conocidos

- El sistema de emails requiere configuración de proveedor (Nodemailer/Resend)
- Falta sistema de backup automático
- Algunas funcionalidades del calendario aún en refinamiento

Estos puntos están planificados para las siguientes fases de desarrollo.

---

## 📞 Contacto

Para preguntas o sugerencias sobre el proyecto, consulta la [Propuesta de Desarrollo](./PROPUESTA_DESARROLLO.md) o crea un issue en el repositorio.

---

## 📄 Licencia

[Especificar licencia si aplica]

---

**Última actualización**: Enero 2026
