import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/**
 * Obtener notificaciones no leídas
 */
export async function obtenerNotificaciones(req: Request, res: Response) {
  try {
    const { leidas, limit } = req.query;
    const limite = limit ? parseInt(limit as string) : 50;

    const notificaciones = await prisma.notificacion.findMany({
      where: {
        leida: leidas === 'true' ? true : leidas === 'false' ? false : undefined,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        cita: {
          select: {
            id: true,
            titulo: true,
            fecha: true,
            hora: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limite,
    });

    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
}

/**
 * Marcar notificación como leída
 */
export async function marcarNotificacionLeida(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const notificacion = await prisma.notificacion.update({
      where: { id },
      data: {
        leida: true,
        fechaLectura: new Date(),
      },
    });

    res.json(notificacion);
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ error: 'Error al marcar notificación como leída' });
  }
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function marcarTodasLeidas(req: Request, res: Response) {
  try {
    await prisma.notificacion.updateMany({
      where: {
        leida: false,
      },
      data: {
        leida: true,
        fechaLectura: new Date(),
      },
    });

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas' });
  }
}

/**
 * Obtener contador de notificaciones no leídas
 */
export async function obtenerContadorNotificaciones(req: Request, res: Response) {
  try {
    const count = await prisma.notificacion.count({
      where: {
        leida: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Error al obtener contador:', error);
    res.status(500).json({ error: 'Error al obtener contador de notificaciones' });
  }
}

/**
 * Crear notificación (para uso interno del sistema)
 */
export async function crearNotificacion(req: Request, res: Response) {
  try {
    const schema = z.object({
      tipo: z.enum(['cita', 'revision', 'recordatorio', 'alerta']),
      pacienteId: z.string().optional(),
      citaId: z.string().optional(),
      analisisId: z.string().optional(),
      titulo: z.string(),
      mensaje: z.string(),
      canal: z.enum(['email', 'sms', 'whatsapp', 'interno']).default('interno'),
    });

    const datos = schema.parse(req.body);

    const notificacion = await prisma.notificacion.create({
      data: datos,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(notificacion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
}
