import { iniciarRegistro } from './lib/registro.js';
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
import { registroAccesosRouter } from './routes/registroAccesos.js';
import { registrarAccesos } from './services/registroAccesos.js';
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
import { exportarDiagnostico } from './controllers/diagnostico.js';
import { enviarInforme, guardarPdf } from './controllers/informes.js';
import { exportarCsv } from './controllers/exportaciones.js';
import { verificarRol } from './middleware/auth.js';
import { RESERVA_ONLINE_DISPONIBLE } from './config/funciones.js';

// Cargar variables de entorno
dotenv.config();
// Registro en fichero (app de escritorio): antes que nada para no perder errores de arranque
iniciarRegistro();

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
// Los informes en PDF viajan en base64: límite mayor solo para esas rutas (antes del general)
app.use('/api/informes', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());

// Middleware de logging simple
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
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

// Registro de accesos a datos de pacientes (anota al terminar cada petición)
app.use('/api', registrarAccesos);

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
app.use('/api/registro-accesos', verificarToken, verificarRol('admin'), registroAccesosRouter);
app.post('/api/informes/enviar', verificarToken, enviarInforme);
app.post('/api/informes/guardar', verificarToken, guardarPdf);
app.get('/api/exportar/:tipo', verificarToken, exportarCsv);
app.post('/api/exportar/:tipo', verificarToken, exportarCsv);
app.get('/api/diagnostico', verificarToken, verificarRol('admin'), exportarDiagnostico);
app.post('/api/diagnostico', verificarToken, verificarRol('admin'), exportarDiagnostico);
if (RESERVA_ONLINE_DISPONIBLE) app.use('/api/reserva-online', verificarToken, reservaOnlineRouter);

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

// Solo este equipo: la API no debe ser accesible desde otros ordenadores de
// la red de la farmacia (HOST permite cambiarlo en desarrollo si hiciera falta)
const HOST = process.env.HOST || '127.0.0.1';
const REINTENTOS_PUERTO = 10;

/**
 * Arranca el servidor. Si el puerto sigue ocupado (p. ej. el backend de una
 * sesión anterior que aún se está cerrando), reintenta unos segundos.
 */
function arrancar(intento = 1) {
  const servidor = app.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`📡 CORS habilitado para: ${CORS_ORIGINS.join(', ')}`);

    // Copias de seguridad, avisos y recordatorios (al arrancar y cada hora)
    iniciarTareasPeriodicas();
    if (RESERVA_ONLINE_DISPONIBLE) iniciarSincronizacionReservaOnline();
  });
  servidor.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && intento < REINTENTOS_PUERTO) {
      console.warn(`⚠️  Puerto ${PORT} ocupado, reintentando (${intento}/${REINTENTOS_PUERTO})…`);
      setTimeout(() => arrancar(intento + 1), 1000);
      return;
    }
    console.error('❌ No se pudo arrancar el servidor:', error);
    process.exit(1);
  });
}

arrancar();

// En la app de escritorio: si el proceso de la app desaparece (cierre forzoso
// o caída), este backend se cierra también para no quedarse con el puerto
const pidApp = Number(process.env.PID_APP);
if (pidApp > 0) {
  setInterval(() => {
    try {
      process.kill(pidApp, 0); // Solo comprueba que existe
    } catch (error) {
      // EPERM: existe pero es de otro usuario (no es nuestro caso, pero no es una caída)
      if ((error as NodeJS.ErrnoException).code === 'EPERM') return;
      console.log('La app de escritorio se ha cerrado: cerrando el backend');
      process.exit(0);
    }
  }, 5000).unref();
}
