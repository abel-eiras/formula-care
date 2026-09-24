# Backend - Formula Care

API REST para el sistema de gestión de servicios de farmacia. Se ejecuta
embebida dentro de la app de escritorio (Tauri); también puede arrancarse de
forma independiente para desarrollo (ver más abajo).

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

- `GET /api/pacientes` - Listar pacientes (`busqueda` sin distinguir mayúsculas ni tildes, `edadMin`/`edadMax`, `limit` opcional)
- `GET /api/pacientes/:id` - Obtener un paciente
- `GET /api/pacientes/:id/mediciones` - Historial único de medidas y constantes (todos los servicios)
- `POST /api/pacientes` - Crear paciente (`birthDate` obligatoria en formato YYYY-MM-DD; la edad no se guarda ni se acepta: se calcula siempre a partir de la fecha)
- `PUT /api/pacientes/:id` - Actualizar paciente
- `DELETE /api/pacientes/:id` - Eliminar paciente

### Cumpleaños

Se calculan desde la fecha de nacimiento (no se guardan como eventos). Cada día
se crea un aviso interno por paciente que cumple años (al arrancar y cada hora,
sin duplicados).

- `GET /api/cumpleanos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` - Cumpleaños del rango (máx. 400 días) con la edad que se cumple y si ya se ha felicitado
- `POST /api/cumpleanos/:pacienteId/felicitacion` - Registrar felicitación `{ anio, canal }` (`whatsapp`, `email`, `llamada`, `en_persona`); con `email` además se envía la plantilla "cumpleanos"
- `DELETE /api/cumpleanos/:pacienteId/felicitacion/:anio` - Deshacer felicitación

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

Las medidas corporales y constantes (peso, altura, cintura, cadera,
bioimpedancia, tensión, pulsaciones) de Bio y Nutrición se envían y
devuelven como campos planos de cada registro, pero se guardan en una única
tabla `Medicion` por paciente. IMC e ICC se calculan en el servidor.

### Nutrición (seguimiento con GLP-1 opcional)

- `GET /api/nutricion/programas?pacienteId=` - Programas de un paciente con sus visitas (`pacienteId` obligatorio)
- `POST /api/nutricion/programas` - Iniciar programa (409 si el paciente ya tiene uno activo)
- `GET /api/nutricion/programas/:id` - Programa con visitas y registro de alimentación
- `PUT /api/nutricion/programas/:id` - Actualizar datos de partida o estado
- `POST /api/nutricion/visitas` - Crear visita (la más antigua por fecha es la inicial; el tipo se calcula, no se guarda)
- `GET|PUT|DELETE /api/nutricion/visitas/:id` - Obtener, actualizar o eliminar visita
- `POST /api/nutricion/registros` - Añadir ingesta al registro de alimentación
- `PUT|DELETE /api/nutricion/registros/:id` - Actualizar o eliminar ingesta

## 🛠️ Scripts Disponibles

- `npm run dev` - Servidor en modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor en producción
- `npm run prisma:generate` - Generar cliente de Prisma
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio (GUI para BD)
- `npm run prisma:seed` - Poblar BD con datos de prueba

## 📝 Notas

- La base de datos es SQLite (una instalación de escritorio = una farmacia, sin multi-tenancy)
- Todas las rutas protegidas requieren JSON en el body y cookie JWT (`auth_token`, HttpOnly)
- Las validaciones se hacen con Zod
- `npm run build:desktop` compila el backend y genera `prisma/desktop-template.db`, la plantilla de base de datos que se empaqueta con la app de escritorio (ver [../context/guias/GUIA_DESPLIEGUE.md](../context/guias/GUIA_DESPLIEGUE.md))
