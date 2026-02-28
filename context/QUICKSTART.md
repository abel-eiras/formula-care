# Inicio rápido - Farmacia Pontevea

Comandos y pasos mínimos para desarrollar en local y verificar que todo funciona.

## Requisitos

- **Node.js** 18+ (recomendado 20 LTS)
- **npm** (el proyecto usa `package-lock.json`)

## Desarrollo en local

### 1. Backend

```bash
cd backend
npm install
```

Crear `backend/.env` (puedes basarte en `backend/.env.example`):

```env
DATABASE_URL="file:./dev.db"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

Inicializar base de datos:

```bash
npm run prisma:generate
npm run prisma:migrate
# Opcional: datos de prueba
npm run prisma:seed
```

Arrancar el servidor:

```bash
npm run dev
```

El backend quedará en **http://localhost:3000**.

### 2. Frontend

Desde la **raíz** del proyecto:

```bash
npm install
npm run dev
```

El frontend quedará en **http://localhost:5173**.

## Verificar que funciona

1. **Backend:** Abre `http://localhost:3000/api/health`  
   Debe responder algo como: `{"status":"ok","message":"API funcionando correctamente"}`

2. **Frontend:** Abre `http://localhost:5173`, navega (por ejemplo a Pacientes) y comprueba que no hay errores de red en la consola.

## Comandos útiles

| Dónde | Comando | Descripción |
|-------|---------|-------------|
| Raíz | `npm run dev` | Dev frontend (Vite) |
| Raíz | `npm run build` | Build frontend |
| Raíz | `npm run lint` | Lint frontend |
| Backend | `npm run dev` | Dev backend (Express) |
| Backend | `npm run prisma:studio` | Abrir Prisma Studio (BD) |
| Backend | `npm run prisma:migrate` | Aplicar migraciones |

## Más información

- Variables de entorno completas del backend y API: [../backend/README.md](../backend/README.md)
- Configuración de email: [../backend/EMAIL_CONFIG.md](../backend/EMAIL_CONFIG.md)
- Despliegue: [guias/GUIA_DESPLIEGUE.md](guias/GUIA_DESPLIEGUE.md)
