import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import {
  crearEventoEnCalendar,
  actualizarEventoEnCalendar,
  eliminarEventoEnCalendar,
} from '../services/googleCalendar.js';

// Esquema de validación para crear cita
const crearCitaSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fecha: z.string(), // Fecha en formato ISO
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'),
  tipo: z.enum(['dermo', 'bio', 'consulta', 'seguimiento']),
  notas: z.string().optional(),
});

// Esquema de validación para actualizar cita
const actualizarCitaSchema = crearCitaSchema.partial();

/**
 * Obtener citas con filtro de fecha opcional
 */
export async function obtenerCitas(req: Request, res: Response) {
  try {
    const { fecha } = req.query;

    const where = fecha
      ? {
          fecha: fecha as string,
        }
      : {};

    const citas = await prisma.cita.findMany({
      where,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { fecha: 'asc' },
        { hora: 'asc' },
      ],
    });

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
}

/**
 * Obtener una cita específica por ID
 */
export async function obtenerCita(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const cita = await prisma.cita.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    res.json(cita);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
}

/**
 * Crear una nueva cita
 */
export async function crearCita(req: Request, res: Response) {
  try {
    const datos = crearCitaSchema.parse(req.body);

    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: datos.pacienteId },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const cita = await prisma.cita.create({
      data: datos,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json(cita);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear cita:', error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
}

/**
 * Actualizar una cita existente
 */
export async function actualizarCita(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const datos = actualizarCitaSchema.parse(req.body);

    // Si se actualiza el pacienteId, verificar que existe
    if (datos.pacienteId) {
      const paciente = await prisma.paciente.findUnique({
        where: { id: datos.pacienteId },
      });

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }
    }

    const cita = await prisma.cita.update({
      where: { id },
      data: datos,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    res.json(cita);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
}

/**
 * Eliminar una cita
 */
export async function eliminarCita(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.cita.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    console.error('Error al eliminar cita:', error);
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
}
