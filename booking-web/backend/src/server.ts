import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { publicRouter } from './routes/public.js';
import { staffRouter } from './routes/staff.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const CORS_ORIGINS = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5174'];

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);
app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rate limiting: rutas públicas de escritura (evitar spam de solicitudes) y login de staff
const solicitarCitaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.' },
});

const staffLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos', mensaje: 'Espera 15 minutos antes de volver a intentarlo.' },
});

app.post('/api/public/solicitar-cita', solicitarCitaRateLimit);
app.post('/api/staff/login', staffLoginRateLimit);

app.use('/api/public', publicRouter);
app.use('/api/staff', staffRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'booking-web backend funcionando' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 booking-web backend corriendo en http://localhost:${PORT}`);
  console.log(`📡 CORS habilitado para: ${CORS_ORIGINS.join(', ')}`);
});
