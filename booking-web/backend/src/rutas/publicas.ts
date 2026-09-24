import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { huecosVigentes, publicacionSchema, type Publicacion } from '../publicacion.js';
import { captchaActivo, verificarCaptcha } from '../captcha.js';

/** Rutas públicas: página de reserva, textos legales, solicitudes y cancelaciones */
export const rutasPublicas = Router();

async function leerPublicacion(): Promise<{ pub: Publicacion; actualizadaEn: Date } | null> {
  const fila = await prisma.publicacion.findUnique({ where: { id: 'singleton' } });
  if (!fila) return null;
  return { pub: publicacionSchema.parse(JSON.parse(fila.datos)), actualizadaEn: fila.actualizadaEn };
}

const SIN_PUBLICAR = { error: 'La reserva online todavía no está disponible. Inténtalo más tarde.' };

rutasPublicas.get('/reserva', async (_req: Request, res: Response) => {
  try {
    const leida = await leerPublicacion();
    if (!leida) return res.status(503).json(SIN_PUBLICAR);
    const pendientes = await prisma.solicitud.findMany({ select: { tipo: true, fecha: true, hora: true } });
    const { pub, actualizadaEn } = leida;
    res.json({
      farmacia: pub.farmacia,
      servicios: pub.servicios,
      eventos: pub.eventos,
      clavePublica: pub.clavePublica,
      huecos: huecosVigentes(pub, pendientes),
      hayTextosLegales: { avisoLegal: !!pub.legal.avisoLegal, privacidad: !!pub.legal.privacidad, cookies: !!pub.legal.cookies },
      captcha: captchaActivo() ? process.env.RECAPTCHA_SITE_KEY : null,
      actualizadaEn,
    });
  } catch (error) {
    console.error('Error al leer la publicación:', error);
    res.status(500).json({ error: 'Error al cargar la reserva' });
  }
});

const CAMPOS_LEGALES = { 'aviso-legal': 'avisoLegal', privacidad: 'privacidad', cookies: 'cookies' } as const;
const TITULOS_LEGALES = { 'aviso-legal': 'Aviso legal', privacidad: 'Política de privacidad', cookies: 'Política de cookies' };

rutasPublicas.get('/legal/:tipo', async (req: Request, res: Response) => {
  const tipo = req.params.tipo as keyof typeof CAMPOS_LEGALES;
  if (!(tipo in CAMPOS_LEGALES)) return res.status(404).json({ error: 'Documento no encontrado' });
  const leida = await leerPublicacion();
  if (!leida) return res.status(503).json(SIN_PUBLICAR);
  res.json({
    titulo: TITULOS_LEGALES[tipo],
    farmacia: leida.pub.farmacia.nombre,
    contenido: leida.pub.legal[CAMPOS_LEGALES[tipo]],
  });
});

const b64 = z.string().regex(/^[A-Za-z0-9+/]+=*$/);
const solicitudSchema = z.object({
  tipo: z.string().regex(/^(dermo|bio|nutricion|consulta|evento:[\w-]+)$/),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  sobre: z.object({
    v: z.literal(1),
    epk: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: z.string().max(64), y: z.string().max(64) }),
    sal: b64.max(64),
    iv: b64.max(64),
    datos: b64.max(20_000),
  }),
  captchaToken: z.string().max(5000).optional(),
});

class HuecoOcupado extends Error {}

/**
 * Guarda una solicitud cifrada si el hueco sigue libre. El control y la
 * inserción van en una transacción serializable para que dos personas no se
 * queden a la vez con la última plaza.
 */
rutasPublicas.post('/solicitudes', async (req: Request, res: Response) => {
  try {
    const datos = solicitudSchema.parse(req.body);
    if (captchaActivo() && !(await verificarCaptcha(datos.captchaToken))) {
      return res.status(400).json({ error: 'La verificación de seguridad ha fallado. Inténtalo de nuevo.' });
    }
    const leida = await leerPublicacion();
    if (!leida) return res.status(503).json(SIN_PUBLICAR);

    const solicitud = await prisma.$transaction(
      async (tx) => {
        const pendientes = await tx.solicitud.findMany({ select: { tipo: true, fecha: true, hora: true } });
        const libres = huecosVigentes(leida.pub, pendientes)[datos.tipo]?.[datos.fecha]?.[datos.hora] ?? 0;
        if (libres < 1) throw new HuecoOcupado();
        return tx.solicitud.create({
          data: { tipo: datos.tipo, fecha: datos.fecha, hora: datos.hora, sobre: JSON.stringify(datos.sobre) },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    res.status(201).json({ id: solicitud.id });
  } catch (error) {
    const conflicto =
      error instanceof HuecoOcupado ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034');
    if (conflicto) {
      return res.status(409).json({ error: 'Ese horario acaba de ocuparse. Elige otro, por favor.' });
    }
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Solicitud no válida' });
    console.error('Error al guardar la solicitud:', error);
    res.status(500).json({ error: 'No se ha podido enviar la solicitud' });
  }
});

/** El token del enlace del email; solo la app sabe si corresponde a una cita */
rutasPublicas.post('/cancelaciones', async (req: Request, res: Response) => {
  const parse = z.object({ token: z.string().regex(/^[\w-]{20,100}$/) }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Enlace de cancelación no válido' });
  try {
    await prisma.cancelacion.upsert({
      where: { token: parse.data.token },
      update: {},
      create: { token: parse.data.token },
    });
    res.status(202).json({ recibida: true });
  } catch (error) {
    console.error('Error al registrar la cancelación:', error);
    res.status(500).json({ error: 'No se ha podido registrar la cancelación' });
  }
});
