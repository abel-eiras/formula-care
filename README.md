# Farmacia Pontevea - Sistema de Gestión de Servicios

Sistema de gestión para servicios asistenciales de farmacia, incluyendo análisis dermocosmético y bioquímico, gestión de pacientes y calendario de citas.

## 📋 Estado del Proyecto

### ✅ Completado
- Frontend React con TypeScript
- UI moderna con shadcn/ui y Tailwind CSS
- Estructura de páginas básica:
  - Dashboard con estadísticas
  - Gestión de pacientes (listado, detalle, nuevo)
  - Calendario de citas
  - Formularios de análisis dermocosmético
  - Formularios de análisis bioquímico

### 🚧 En Desarrollo
- Backend API con Node.js + Express
- Base de datos con Prisma
- Autenticación y autorización
- Integración frontend-backend

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

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

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

### Backend (En desarrollo)
- **Node.js + Express** - Servidor API
- **Prisma** - ORM para base de datos
- **SQLite/PostgreSQL** - Base de datos
- **JWT** - Autenticación

---

## 📁 Estructura del Proyecto

```
farmaciapontevea_servicios/
├── src/                    # Código fuente del frontend
│   ├── pages/             # Páginas de la aplicación
│   ├── components/        # Componentes reutilizables
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilidades
│   └── types/             # Tipos TypeScript
├── docs/                  # Documentación
│   ├── PROPUESTA_DESARROLLO.md
│   ├── GUIA_CODIGO_LIMPIO.md
│   └── ESTRUCTURA_PROYECTO.md
└── public/                # Archivos estáticos
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

- Los datos actualmente son mockeados (no hay persistencia)
- No hay autenticación implementada
- El calendario no se sincroniza con servicios externos

Estos puntos están planificados para las siguientes fases de desarrollo.

---

## 📞 Contacto

Para preguntas o sugerencias sobre el proyecto, consulta la [Propuesta de Desarrollo](./PROPUESTA_DESARROLLO.md) o crea un issue en el repositorio.

---

## 📄 Licencia

[Especificar licencia si aplica]

---

**Última actualización**: Enero 2024
