import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
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
import { plantillasEmailRouter } from './routes/plantillasEmail.js';
import adminRouter from './routes/admin.js';
import { verificarToken } from './middleware/auth.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Orígenes permitidos para CORS
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());

// Middleware de logging simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rate limiting para rutas de autenticación (login)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos', mensaje: 'Por favor espera 15 minutos antes de intentarlo de nuevo.' },
});

// Rate limiting para rutas públicas (formulario de solicitudes)
const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones', mensaje: 'Por favor espera un momento antes de continuar.' },
});

// Rutas de autenticación (siempre disponibles, con rate limit en login)
app.use('/api/auth', authRateLimit, authRouter);

// Rutas públicas (sin autenticación, con rate limit)
app.use('/api/public', publicRateLimit, publicRouter);

// Rutas protegidas de la API (requieren autenticación)
app.use('/api/pacientes', verificarToken, pacientesRouter);
app.use('/api/citas', verificarToken, citasRouter);
app.use('/api/servicios', verificarToken, serviciosRouter);
app.use('/api/configuracion', verificarToken, configuracionRouter);
app.use('/api/estadisticas', verificarToken, estadisticasRouter);
app.use('/api/notificaciones', verificarToken, notificacionesRouter);
app.use('/api/solicitudes', verificarToken, solicitudesRouter);
app.use('/api/eventos', verificarToken, eventosRouter);
app.use('/api/plantillas-email', verificarToken, plantillasEmailRouter);

// Rutas de administración de plataforma (superadmin)
// Nota: el router ya incluye verificarToken + superadminMiddleware
app.use('/api/admin', adminRouter);

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
