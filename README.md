# Formula Care

Aplicación de escritorio, libre y de código abierto, para la gestión de servicios asistenciales de farmacia: análisis dermocosmético y bioquímico, gestión de pacientes y calendario de citas.

Formula Care corre **de forma local en tu ordenador**: los datos de tus pacientes se guardan en una base de datos SQLite en tu propio equipo, sin depender de ningún servidor en la nube ni de conexión a internet para funcionar.

## 📋 Estado del Proyecto

### ✅ Completado
- **App de escritorio (Tauri)**
  - Backend Node.js/Express embebido, arranca y se cierra junto con la app
  - Base de datos SQLite local, una instalación = una farmacia
  - Asistente de primer arranque para crear la cuenta de administrador

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
  - Base de datos con Prisma ORM (SQLite)
  - Controladores para pacientes, citas, análisis, notificaciones
  - Servicio de disponibilidad de calendario
  - Sistema de eventos personalizados

- **Sistema de Autenticación**
  - Login con JWT (cookie HttpOnly)
  - Roles: admin, farmaceutico, usuario
  - Protección de rutas por rol

- **Sistema de Correos**
  - Plantillas editables (HTML)
  - Soporte para Nodemailer y Resend

- **RGPD y Legal**
  - Configuración de textos legales
  - Política de privacidad, cookies, términos

- **Reserva pública de citas (opcional, servicio aparte)**
  - Ver [booking-web/](booking-web/): un servicio web independiente y autohospedable para quien quiera ofrecer reserva de citas online, desacoplado de la app de escritorio.

### 🚧 En Desarrollo
- Mejoras de rendimiento
- Tests automatizados
- Firma de código para los instaladores de Windows/macOS (ya se compilan vía CI, ver [Compilar la app de escritorio](#-compilar-la-app-de-escritorio), pero sin firmar el sistema operativo avisa de "editor no verificado")

### 📝 Planificado
Ver la carpeta [context/](context/) para documentación (guías activas e histórica).

---

## 🚀 Inicio Rápido (desarrollo)

### Requisitos Previos
- Node.js 18+ y npm
- [Rust y las dependencias nativas de Tauri](https://v2.tauri.app/start/prerequisites/) (solo si vas a ejecutar/compilar la app de escritorio; no hacen falta para trabajar solo en el frontend o el backend web)
- Git

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/abel-eiras/formula-care.git
cd formula-care

# 2. Instalar dependencias del frontend (raíz del repo)
npm install

# 3. Instalar dependencias del backend
cd backend && npm install

# 4. Configurar variables de entorno del backend
cp .env.example .env
# Edita .env si quieres cambiar ADMIN_EMAIL/ADMIN_PASSWORD u otros valores

# 5. Crear la base de datos local y cargar datos de ejemplo
npx prisma migrate deploy
npx tsx src/prisma/seed.ts
cd ..
```

### Ejecutar como app de escritorio (recomendado)

```bash
npm run tauri:dev
```

Esto arranca el backend embebido y abre la ventana de la app. La primera vez, si no has ejecutado el seed, se te pedirá crear la cuenta de administrador.

### Ejecutar como web normal (dos terminales, útil para desarrollar sin Tauri/Rust instalado)

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

### Credenciales de Desarrollo (tras ejecutar el seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@farmacia.local` | `changeme123` |

Cambia esta contraseña en cuanto inicies sesión. En una instalación de escritorio real (sin seed de datos de ejemplo), la propia app te pedirá crear esta cuenta en el primer arranque.

---

## 📦 Compilar la app de escritorio

```bash
npm run tauri:build
```

Esto compila el frontend, empaqueta el backend (Node + Prisma) como recurso de la app, y genera el instalador nativo de tu sistema operativo en `src-tauri/target/release/bundle/` (`.deb`/`.rpm`/AppImage en Linux, `.msi`/`.exe` en Windows, `.dmg`/`.app` en macOS). Cada plataforma debe compilarse en su propio sistema operativo.

Para generar los tres a la vez sin tener las tres máquinas, usa el workflow de GitHub Actions [`desktop-release.yml`](.github/workflows/desktop-release.yml): dispáralo a mano desde la pestaña *Actions* (deja los instaladores como artefactos del run) o haz push de un tag `v*` (crea además un borrador de release con los seis instaladores adjuntos). Detalle en [context/guias/GUIA_DESPLIEGUE.md](context/guias/GUIA_DESPLIEGUE.md).

En el primer arranque de un paquete instalado, la app genera automáticamente un `JWT_SECRET`/clave de cifrado aleatorios y una base de datos SQLite propia en el directorio de datos del usuario del sistema operativo, y aplica las migraciones pendientes en cada arranque (también en actualizaciones futuras) — no hace falta configurar ni migrar nada a mano.

---

## 🛠️ Tecnologías Utilizadas

### App de escritorio
- **Tauri 2** (Rust) — empaquetado nativo, backend Node embebido como proceso hijo

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
- **SQLite** - Base de datos local de cada instalación
- **Zod** - Validación de esquemas
- **TypeScript estricto** - Sin errores de compilación

---

## 📁 Estructura del Proyecto

```
formula-care/
├── src/                        # Frontend React (empaquetado dentro de la app de escritorio)
│   ├── pages/                  # Páginas de la aplicación
│   ├── components/             # Componentes reutilizables
│   │   ├── auth/               # Componentes de autenticación
│   │   ├── dashboard/          # Componentes del dashboard
│   │   ├── layout/             # Layout principal
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── contexts/               # Contextos React (Auth)
│   ├── hooks/                  # Custom hooks (React Query)
│   ├── lib/                    # Utilidades (API, PDF, etc.)
│   └── types/                  # Tipos TypeScript
├── backend/                    # Backend Node.js + Express (embebido en la app de escritorio)
│   ├── prisma/                 # Schema y migraciones (SQLite)
│   └── src/
│       ├── controllers/        # Controladores de API
│       ├── middleware/         # Middlewares (auth, etc.)
│       ├── routes/             # Rutas de API
│       ├── services/           # Servicios (email, notificaciones)
│       └── scripts/            # Scripts de mantenimiento
├── src-tauri/                  # Empaquetado de escritorio (Tauri, Rust)
├── booking-web/                # Servicio OPCIONAL y aparte: reserva pública de citas
├── context/                    # Documentación (guías, integraciones, histórico)
└── public/                     # Archivos estáticos
```

Para más detalles, ver [context/guias/ESTRUCTURA_PROYECTO.md](context/guias/ESTRUCTURA_PROYECTO.md)

---

## 📚 Documentación

- **[context/README.md](context/README.md)** - Índice de documentación (guías, stack, inicio rápido)
- **[AGENTS.md](AGENTS.md)** - Guía para agentes de IA (reglas, checklist, referencias)
- Guías activas en [context/guias/](context/guias/) (código limpio, React, estructura, despliegue)
- Backend: [backend/README.md](backend/README.md), [backend/EMAIL_CONFIG.md](backend/EMAIL_CONFIG.md)
- Reserva pública opcional: [booking-web/README.md](booking-web/README.md)

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

### Dashboard
- Estadísticas generales
- Gráficos de evolución
- Accesos rápidos
- Pacientes recientes

---

## 💻 Scripts Disponibles

```bash
# Desarrollo web (sin Tauri)
npm run dev          # Inicia el servidor de desarrollo de Vite

# App de escritorio
npm run tauri:dev    # Levanta el backend embebido + la ventana de la app
npm run tauri:build  # Genera el instalador nativo de tu sistema operativo

# Build web
npm run build        # Construye el frontend para producción
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

---

## 🤝 Contribución

Formula Care es software libre y las contribuciones son bienvenidas.

1. Haz un fork del repositorio y crea una rama para tu cambio: `git checkout -b feature/nueva-funcionalidad`
2. Sigue la [Guía de Código Limpio](context/guias/GUIA_CODIGO_LIMPIO.md) y la estructura existente del proyecto
3. Asegúrate de que el código compila sin errores (`npm run lint`, `npx tsc -b`, y lo mismo en `backend/`)
4. Haz commit con mensajes claros
5. Abre un Pull Request describiendo el cambio

---

## 📝 Notas Importantes

- **Código en español**: Comentarios y documentación en español
- **TypeScript estricto**: Evitar `any`, usar tipos explícitos
- **Componentes pequeños**: Máximo 200 líneas por componente
- **Funciones enfocadas**: Una sola responsabilidad por función

---

## 🐛 Problemas Conocidos

- Los instaladores de Windows y macOS se generan vía CI ([`.github/workflows/desktop-release.yml`](.github/workflows/desktop-release.yml)) pero no se han podido ejecutar/probar en esos sistemas operativos todavía (este entorno de desarrollo es Linux); en Linux se han verificado `.deb`/`.rpm` instalados y ejecutados. Ninguno de los tres está firmado digitalmente, así que Windows/macOS mostrarán un aviso de "editor no verificado" al abrirlos.
- `booking-web/` (reserva pública opcional) no sincroniza automáticamente sus citas con la base de datos local de la app de escritorio — ver su propio README para el alcance exacto.
- Falta sistema de copia de seguridad automática de la base de datos local.

---

## 📄 Licencia

Formula Care es software libre bajo la [Licencia MIT](./LICENSE). Puedes usarlo, modificarlo y redistribuirlo libremente, incluso con fines comerciales, siempre que mantengas el aviso de copyright.
