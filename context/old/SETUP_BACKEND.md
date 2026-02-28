# Guía de Setup del Backend

## 📋 Pasos para poner en marcha el backend

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

### 3. Inicializar Prisma

```bash
# Generar el cliente de Prisma
npm run prisma:generate

# Crear la base de datos y ejecutar migraciones
npm run prisma:migrate

# (Opcional) Poblar con datos de prueba
npm run prisma:seed
```

### 4. Iniciar el servidor

```bash
# Modo desarrollo (con hot-reload)
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### 5. Verificar que funciona

Abrir en el navegador o usar curl:

```bash
curl http://localhost:3000/api/health
```

Debería responder: `{"status":"ok","message":"API funcionando correctamente"}`

## 🔗 Conectar Frontend

El frontend ya está configurado para conectarse al backend. Solo asegúrate de que:

1. El backend esté corriendo en `http://localhost:3000`
2. El frontend esté corriendo en `http://localhost:5173` (puerto por defecto de Vite)

Si necesitas cambiar la URL de la API, crear un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3000/api
```

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

Verificar que `CORS_ORIGIN` en `.env` del backend coincida con la URL del frontend.

## 📚 Próximos Pasos

Una vez el backend esté funcionando:

1. Probar crear un paciente desde el frontend
2. Verificar que se guarda en la base de datos
3. Probar las demás funcionalidades

Para ver los datos en la base de datos:

```bash
cd backend
npm run prisma:studio
```

Esto abrirá una interfaz gráfica para ver y editar los datos.
