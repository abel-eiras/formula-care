import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { pacientesRouter } from './routes/pacientes.js';
import { citasRouter } from './routes/citas.js';
import { serviciosRouter } from './routes/servicios.js';
import { nutricionRouter } from './routes/nutricion.js';
import { cumpleanosRouter } from './routes/cumpleanos.js';
import { configuracionRouter } from './routes/configuracion.js';
import { estadisticasRouter } from './routes/estadisticas.js';
import { notificacionesRouter } from './routes/notificaciones.js';
import { eventosRouter } from './routes/eventos.js';
import { authRouter } from './routes/auth.js';
import { plantillasEmailRouter } from './routes/plantillasEmail.js';
import { backupsRouter } from './routes/backups.js';
import { verificarToken } from './middleware/auth.js';
import { iniciarTareasPeriodicas } from './services/tareasProgramadas.js';
import { iniciarSincronizacionReservaOnline } from './services/reservaOnline/sincronizacion.js';
import { reservaOnlineRouter } from './routes/reservaOnline.js';

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

// Límite de intentos solo donde se prueban contraseñas. Cuenta únicamente los
// fallos: /me se consulta en cada carga y la gestión de usuarios no debe agotarlo.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos', mensaje: 'Por favor espera 15 minutos antes de intentarlo de nuevo.' },
});

// Rutas de autenticación (siempre disponibles)
app.use(['/api/auth/login', '/api/auth/setup-inicial', '/api/auth/password'], authRateLimit);
app.use('/api/auth', authRouter);

// Rutas protegidas de la API (requieren autenticación)
app.use('/api/pacientes', verificarToken, pacientesRouter);
app.use('/api/citas', verificarToken, citasRouter);
app.use('/api/servicios', verificarToken, serviciosRouter);
app.use('/api/nutricion', verificarToken, nutricionRouter);
app.use('/api/cumpleanos', verificarToken, cumpleanosRouter);
app.use('/api/configuracion', verificarToken, configuracionRouter);
app.use('/api/estadisticas', verificarToken, estadisticasRouter);
app.use('/api/notificaciones', verificarToken, notificacionesRouter);
app.use('/api/eventos', verificarToken, eventosRouter);
app.use('/api/plantillas-email', verificarToken, plantillasEmailRouter);
app.use('/api/backups', verificarToken, backupsRouter);
app.use('/api/reserva-online', verificarToken, reservaOnlineRouter);

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

  // Copias de seguridad, avisos y recordatorios (al arrancar y cada hora)
  iniciarTareasPeriodicas();
  iniciarSincronizacionReservaOnline();
});
