import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// Esquema de validación para crear/actualizar evento
const eventoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  activo: z.boolean().optional().default(true),
  fechas: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')).min(1, 'Debe haber al menos una fecha'),
  horas: z.array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido: debe ser HH:mm-HH:mm')).min(1, 'Debe haber al menos un horario'),
  duracion: z.number().int().positive('La duración debe ser un número positivo'),
  maxAsistentes: z.number().int().positive('El número de asistentes debe ser positivo'),
  descripcion: z.string().optional(),
});

/**
 * Obtener todos los eventos
 * GET /api/eventos
 */
export async function obtenerEventos(req: Request, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: { nombre: 'asc' },
    });

    // Parsear JSON fields
    const eventosParsed = eventos.map((evento) => ({
      ...evento,
      fechas: typeof evento.fechas === 'string' ? JSON.parse(evento.fechas) : evento.fechas,
      horas: typeof evento.horas === 'string' ? JSON.parse(evento.horas) : evento.horas,
    }));

    res.json(eventosParsed);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
}

/**
 * Obtener eventos activos (para página pública)
 * GET /api/eventos/activos
 */
export async function obtenerEventosActivos(req: Request, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });

    // Parsear JSON fields
    const eventosParsed = eventos.map((evento) => ({
      ...evento,
      fechas: typeof evento.fechas === 'string' ? JSON.parse(evento.fechas) : evento.fechas,
      horas: typeof evento.horas === 'string' ? JSON.parse(evento.horas) : evento.horas,
    }));

    res.json(eventosParsed);
  } catch (error) {
    console.error('Error al obtener eventos activos:', error);
    res.status(500).json({ error: 'Error al obtener eventos activos' });
  }
}

/**
 * Obtener un evento por ID
 * GET /api/eventos/:id
 */
export async function obtenerEvento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const evento = await prisma.evento.findUnique({
      where: { id },
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Parsear JSON fields
    const eventoParsed = {
      ...evento,
      fechas: typeof evento.fechas === 'string' ? JSON.parse(evento.fechas) : evento.fechas,
      horas: typeof evento.horas === 'string' ? JSON.parse(evento.horas) : evento.horas,
    };

    res.json(eventoParsed);
  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({ error: 'Error al obtener evento' });
  }
}

/**
 * Crear un nuevo evento
 * POST /api/eventos
 */
export async function crearEvento(req: Request, res: Response) {
  try {
    const datos = eventoSchema.parse(req.body);

    const evento = await prisma.evento.create({
      data: {
        nombre: datos.nombre,
        activo: datos.activo ?? true,
        fechas: JSON.stringify(datos.fechas),
        horas: JSON.stringify(datos.horas),
        duracion: datos.duracion,
        maxAsistentes: datos.maxAsistentes,
        descripcion: datos.descripcion,
      },
    });

    // Parsear JSON fields para respuesta
    const eventoParsed = {
      ...evento,
      fechas: typeof evento.fechas === 'string' ? JSON.parse(evento.fechas) : evento.fechas,
      horas: typeof evento.horas === 'string' ? JSON.parse(evento.horas) : evento.horas,
    };

    res.status(201).json(eventoParsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }
    console.error('Error al crear evento:', error);
    // Incluir más detalles del error para debugging
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Detalles del error:', { errorMessage, errorStack, body: req.body });
    res.status(500).json({ 
      error: 'Error al crear evento',
      detalles: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

/**
 * Actualizar un evento
 * PUT /api/eventos/:id
 */
export async function actualizarEvento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const datos = eventoSchema.partial().parse(req.body);

    // Verificar que el evento existe
    const eventoExistente = await prisma.evento.findUnique({
      where: { id },
    });

    if (!eventoExistente) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Preparar datos para actualizar
    const datosActualizar: {
      nombre?: string;
      activo?: boolean;
      fechas?: string;
      horas?: string;
      duracion?: number;
      maxAsistentes?: number;
      descripcion?: string;
    } = {};
    if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
    if (datos.activo !== undefined) datosActualizar.activo = datos.activo;
    if (datos.fechas !== undefined) datosActualizar.fechas = JSON.stringify(datos.fechas);
    if (datos.horas !== undefined) datosActualizar.horas = JSON.stringify(datos.horas);
    if (datos.duracion !== undefined) datosActualizar.duracion = datos.duracion;
    if (datos.maxAsistentes !== undefined) datosActualizar.maxAsistentes = datos.maxAsistentes;
    if (datos.descripcion !== undefined) datosActualizar.descripcion = datos.descripcion;

    const evento = await prisma.evento.update({
      where: { id },
      data: datosActualizar,
    });

    // Parsear JSON fields para respuesta
    const eventoParsed = {
      ...evento,
      fechas: typeof evento.fechas === 'string' ? JSON.parse(evento.fechas) : evento.fechas,
      horas: typeof evento.horas === 'string' ? JSON.parse(evento.horas) : evento.horas,
    };

    res.json(eventoParsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
}

/**
 * Eliminar un evento
 * DELETE /api/eventos/:id
 */
export async function eliminarEvento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const evento = await prisma.evento.findUnique({
      where: { id },
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    await prisma.evento.delete({
      where: { id },
    });

    res.json({ mensaje: 'Evento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
}
