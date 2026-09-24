import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { publicacionSchema } from '../publicacion.js';

/**
 * Rutas que usa la app de escritorio (token SYNC_TOKEN en Authorization).
 * La app siempre inicia la conexión: la farmacia no expone nada a internet.
 */
export const rutasSincronizacion = Router();

/** Lo que la app no recoja en este plazo se borra (p. ej. si se desinstala) */
const DIAS_RETENCION = 30;

function resumen(texto: string): Buffer {
  return createHash('sha256').update(texto).digest();
}

function exigirToken(req: Request, res: Response, next: NextFunction) {
  const esperado = process.env.SYNC_TOKEN;
  if (!esperado || esperado.length < 16) {
    return res.status(503).json({ error: 'Falta configurar SYNC_TOKEN (al menos 16 caracteres) en booking-web' });
  }
  const recibido = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  // Comparación en tiempo constante (sobre resúmenes para igualar longitudes)
  if (!timingSafeEqual(resumen(recibido), resumen(esperado))) {
    return res.status(401).json({ error: 'Token de sincronización incorrecto' });
  }
  next();
}

rutasSincronizacion.use(exigirToken);

rutasSincronizacion.put('/publicacion', async (req: Request, res: Response) => {
  const parse = publicacionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Publicación no válida', detalles: parse.error.errors.slice(0, 5) });
  }
  const datos = JSON.stringify(parse.data);
  await prisma.publicacion.upsert({ where: { id: 'singleton' }, update: { datos }, create: { id: 'singleton', datos } });
  res.json({ ok: true });
});

rutasSincronizacion.get('/buzon', async (_req: Request, res: Response) => {
  const limite = new Date(Date.now() - DIAS_RETENCION * 86_400_000);
  await Promise.all([
    prisma.solicitud.deleteMany({ where: { createdAt: { lt: limite } } }),
    prisma.cancelacion.deleteMany({ where: { createdAt: { lt: limite } } }),
  ]);
  const [solicitudes, cancelaciones] = await Promise.all([
    prisma.solicitud.findMany({ orderBy: { createdAt: 'asc' }, take: 500 }),
    prisma.cancelacion.findMany({ orderBy: { createdAt: 'asc' }, take: 500 }),
  ]);
  res.json({
    solicitudes: solicitudes.map((s) => ({ id: s.id, tipo: s.tipo, fecha: s.fecha, hora: s.hora, sobre: JSON.parse(s.sobre), creadaEn: s.createdAt })),
    cancelaciones: cancelaciones.map((c) => ({ id: c.id, token: c.token, creadaEn: c.createdAt })),
  });
});

/** La app ya ha guardado estos elementos: se borran del servidor */
rutasSincronizacion.post('/buzon/recibido', async (req: Request, res: Response) => {
  const parse = z
    .object({ solicitudes: z.array(z.string()).max(1000), cancelaciones: z.array(z.string()).max(1000) })
    .safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Datos no válidos' });
  const [s, c] = await Promise.all([
    prisma.solicitud.deleteMany({ where: { id: { in: parse.data.solicitudes } } }),
    prisma.cancelacion.deleteMany({ where: { id: { in: parse.data.cancelaciones } } }),
  ]);
  res.json({ borradas: { solicitudes: s.count, cancelaciones: c.count } });
});
