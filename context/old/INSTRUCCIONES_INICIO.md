# 🚀 Instrucciones de Inicio - Farmacia Pontevea

## ✅ Backend Implementado

El backend está completamente implementado y listo para usar. Sigue estos pasos:

## 📋 Pasos para Iniciar

### 1. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env` en la carpeta `backend/`:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

### 3. Inicializar base de datos

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Crear base de datos y ejecutar migraciones
npm run prisma:migrate

# (Opcional) Poblar con datos de prueba
npm run prisma:seed
```

### 4. Iniciar el servidor backend

```bash
npm run dev
```

El servidor estará en `http://localhost:3000`

### 5. Iniciar el frontend (en otra terminal)

```bash
# Desde la raíz del proyecto
npm run dev
```

El frontend estará en `http://localhost:5173`

## 🎯 Verificar que Funciona

1. **Backend**: Abrir `http://localhost:3000/api/health`
   - Debería mostrar: `{"status":"ok","message":"API funcionando correctamente"}`

2. **Frontend**: Abrir `http://localhost:5173`
   - Debería cargar la aplicación
   - Ir a "Pacientes" y verificar que se conecta con el backend

## 📁 Estructura Creada

```
backend/
├── src/
│   ├── server.ts              ✅ Servidor Express
│   ├── routes/                ✅ Rutas de la API
│   │   ├── pacientes.ts
│   │   ├── citas.ts
│   │   └── servicios.ts
│   ├── controllers/           ✅ Lógica de negocio
│   │   ├── pacientes.ts
│   │   ├── citas.ts
│   │   └── servicios.ts
│   └── lib/
│       └── prisma.ts          ✅ Cliente de Prisma
├── prisma/
│   ├── schema.prisma          ✅ Esquema de BD
│   └── seed.ts                ✅ Datos de prueba
└── package.json               ✅ Dependencias
```

## 🔌 Endpoints Disponibles

### Pacientes
- `GET /api/pacientes` - Listar pacientes
- `GET /api/pacientes/:id` - Obtener paciente
- `POST /api/pacientes` - Crear paciente
- `PUT /api/pacientes/:id` - Actualizar paciente
- `DELETE /api/pacientes/:id` - Eliminar paciente

### Citas
- `GET /api/citas?fecha=YYYY-MM-DD` - Listar citas
- `GET /api/citas/:id` - Obtener cita
- `POST /api/citas` - Crear cita
- `PUT /api/citas/:id` - Actualizar cita
- `DELETE /api/citas/:id` - Eliminar cita

### Servicios
- `POST /api/servicios/dermo` - Crear análisis dermo
- `GET /api/servicios/dermo/:id` - Obtener análisis dermo
- `POST /api/servicios/bio` - Crear análisis bio
- `GET /api/servicios/bio/:id` - Obtener análisis bio

## 🛠️ Comandos Útiles

### Backend
```bash
cd backend

# Desarrollo
npm run dev

# Ver base de datos (GUI)
npm run prisma:studio

# Resetear base de datos
rm prisma/dev.db
npm run prisma:migrate
npm run prisma:seed
```

### Frontend
```bash
# Desarrollo
npm run dev

# Build
npm run build
```

## ✅ Estado del Proyecto

- ✅ Backend completamente implementado
- ✅ Frontend conectado con backend
- ✅ Base de datos configurada (SQLite)
- ✅ Validación de datos (Zod)
- ✅ Manejo de errores
- ✅ CORS configurado

## 🐛 Solución de Problemas

### Error: "Cannot find module '@prisma/client'"
```bash
cd backend
npm run prisma:generate
```

### Error: "Database file does not exist"
```bash
cd backend
npm run prisma:migrate
```

### Error de CORS
Verificar que `CORS_ORIGIN` en `.env` del backend sea `http://localhost:5173`

### El frontend no se conecta al backend
1. Verificar que el backend esté corriendo en puerto 3000
2. Verificar la consola del navegador para errores
3. Verificar que no haya errores en la terminal del backend

## 📚 Próximos Pasos

1. ✅ Backend implementado
2. ⏭️ Probar todas las funcionalidades
3. ⏭️ Implementar autenticación (opcional)
4. ⏭️ Mejorar validaciones
5. ⏭️ Agregar tests

---

**¡El proyecto está listo para usar!** 🎉
