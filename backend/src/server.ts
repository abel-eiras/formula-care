import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pacientesRouter } from './routes/pacientes.js';
import { citasRouter } from './routes/citas.js';
import { serviciosRouter } from './routes/servicios.js';
import { configuracionRouter } from './routes/configuracion.js';
import { estadisticasRouter } from './routes/estadisticas.js';
import { notificacionesRouter } from './routes/notificaciones.js';
import { publicRouter } from './routes/public.js';
import { solicitudesRouter } from './routes/solicitudes.js';
import { eventosRouter } from './routes/eventos.js';
import { authRouter } from './routes/auth.js';
import { verificarToken } from './middleware/auth.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Determinar si estamos en modo desarrollo (sin autenticación obligatoria)
const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

// Orígenes permitidos para CORS (desarrollo)
const CORS_ORIGINS = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174'];

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));
app.use(express.json());

// Middleware de logging simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de autenticación (siempre disponibles)
app.use('/api/auth', authRouter);

// Rutas públicas (sin autenticación)
app.use('/api/public', publicRouter);

// Middleware de autenticación para rutas protegidas
// En desarrollo (SKIP_AUTH=true), permite acceso sin token
const authMiddleware = SKIP_AUTH 
  ? (req: express.Request, res: express.Response, next: express.NextFunction) => next()
  : verificarToken;

// Rutas protegidas de la API (requieren autenticación en producción)
app.use('/api/pacientes', authMiddleware, pacientesRouter);
app.use('/api/citas', authMiddleware, citasRouter);
app.use('/api/servicios', authMiddleware, serviciosRouter);
app.use('/api/configuracion', authMiddleware, configuracionRouter);
app.use('/api/estadisticas', authMiddleware, estadisticasRouter);
app.use('/api/notificaciones', authMiddleware, notificacionesRouter);
app.use('/api/solicitudes', authMiddleware, solicitudesRouter);
app.use('/api/eventos', authMiddleware, eventosRouter);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando correctamente' });
});

// Manejo de errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 CORS habilitado para: ${CORS_ORIGINS.join(', ')}`);
});
