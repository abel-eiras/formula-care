import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma.js';
import { rutasPublicas } from './rutas/publicas.js';
import { rutasSincronizacion } from './rutas/sincronizacion.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGENES = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : ['http://localhost:5174'];

// Detrás de un proxy (Render, Fly.io, Nginx) para que el límite por IP use la IP real
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable('x-powered-by');

const limitar = (max: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' },
  });

// La app de escritorio no es un navegador: la API de sincronización no necesita CORS
app.use('/api/sync', express.json({ limit: '3mb' }), limitar(300), rutasSincronizacion);

app.use('/api/public', cors({ origin: ORIGENES }), express.json({ limit: '64kb' }));
app.post('/api/public/solicitudes', limitar(10));
app.post('/api/public/cancelaciones', limitar(20));
app.use('/api/public', rutasPublicas);

app.get('/api/health', async (_req, res) => {
  const pub = await prisma.publicacion.findUnique({ where: { id: 'singleton' }, select: { actualizadaEn: true } });
  res.json({ status: 'ok', ultimaPublicacion: pub?.actualizadaEn ?? null });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 booking-web escuchando en http://localhost:${PORT}`);
  console.log(`📡 CORS para: ${ORIGENES.join(', ')}`);
  if (!process.env.SYNC_TOKEN) console.warn('⚠️  SYNC_TOKEN sin configurar: la app de escritorio no podrá sincronizar');
});
