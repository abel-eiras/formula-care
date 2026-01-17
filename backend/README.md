# Backend - Farmacia Pontevea

API REST para el sistema de gestión de servicios de farmacia.

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env` en la raíz del backend:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

### 3. Configurar Prisma

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Crear base de datos y ejecutar migraciones
npm run prisma:migrate

# (Opcional) Poblar con datos de prueba
npm run prisma:seed
```

### 4. Iniciar servidor

```bash
# Modo desarrollo (con hot-reload)
npm run dev

# Modo producción
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📁 Estructura

```
backend/
├── src/
│   ├── server.ts          # Punto de entrada del servidor
│   ├── routes/            # Definición de rutas
│   │   ├── pacientes.ts
│   │   ├── citas.ts
│   │   └── servicios.ts
│   ├── controllers/       # Lógica de negocio
│   │   ├── pacientes.ts
│   │   ├── citas.ts
│   │   └── servicios.ts
│   └── lib/
│       └── prisma.ts      # Cliente de Prisma
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   └── seed.ts            # Datos de prueba
└── package.json
```

## 🔌 Endpoints de la API

### Pacientes

- `GET /api/pacientes` - Listar todos los pacientes
- `GET /api/pacientes/:id` - Obtener un paciente
- `POST /api/pacientes` - Crear paciente
- `PUT /api/pacientes/:id` - Actualizar paciente
- `DELETE /api/pacientes/:id` - Eliminar paciente

### Citas

- `GET /api/citas?fecha=YYYY-MM-DD` - Listar citas (opcional: filtrar por fecha)
- `GET /api/citas/:id` - Obtener una cita
- `POST /api/citas` - Crear cita
- `PUT /api/citas/:id` - Actualizar cita
- `DELETE /api/citas/:id` - Eliminar cita

### Servicios

- `POST /api/servicios/dermo` - Crear análisis dermocosmético
- `GET /api/servicios/dermo/:id` - Obtener análisis dermo
- `POST /api/servicios/bio` - Crear análisis bioquímico
- `GET /api/servicios/bio/:id` - Obtener análisis bio

## 🛠️ Scripts Disponibles

- `npm run dev` - Servidor en modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor en producción
- `npm run prisma:generate` - Generar cliente de Prisma
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio (GUI para BD)
- `npm run prisma:seed` - Poblar BD con datos de prueba

## 📝 Notas

- La base de datos usa SQLite por defecto (simple para desarrollo)
- Para producción, cambiar a PostgreSQL en `schema.prisma`
- Todas las rutas requieren JSON en el body
- Las validaciones se hacen con Zod
