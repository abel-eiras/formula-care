import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// Esquema de validación para crear paciente
const crearPacienteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  age: z.number().int().positive().max(150),
  sex: z.enum(['M', 'F', 'O']),
  phone: z.string().min(9, 'El teléfono debe tener al menos 9 caracteres'),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema de validación para actualizar paciente
const actualizarPacienteSchema = crearPacienteSchema.partial();

/**
 * Obtener todos los pacientes con búsqueda opcional
 */
export async function obtenerPacientes(req: Request, res: Response) {
  try {
    const { busqueda } = req.query;
    
    // SQLite no soporta mode: 'insensitive', usar toLowerCase en el código
    const busquedaLower = busqueda ? (busqueda as string).toLowerCase() : '';
    const where = busqueda
      ? {
          OR: [
            { name: { contains: busqueda as string } },
            { phone: { contains: busqueda as string } },
          ],
        }
      : {};

    const pacientes = await prisma.paciente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            analisisDermo: true,
            analisisBio: true,
            citas: true,
          },
        },
      },
    });

    res.json(pacientes);
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
}

/**
 * Obtener un paciente específico por ID
 */
export async function obtenerPaciente(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        analisisDermo: {
          orderBy: { fecha: 'desc' },
          take: 10, // Últimos 10 análisis
        },
        analisisBio: {
          orderBy: { fecha: 'desc' },
          take: 10, // Últimos 10 análisis
        },
        citas: {
          orderBy: { fecha: 'desc' },
          take: 10, // Próximas 10 citas
        },
      },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json(paciente);
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
}

/**
 * Crear un nuevo paciente
 */
export async function crearPaciente(req: Request, res: Response) {
  try {
    const datos = crearPacienteSchema.parse(req.body);

    const paciente = await prisma.paciente.create({
      data: {
        ...datos,
        email: datos.email || undefined,
      },
    });

    res.status(201).json(paciente);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear paciente:', error);
    res.status(500).json({ error: 'Error al crear paciente' });
  }
}

/**
 * Actualizar un paciente existente
 */
export async function actualizarPaciente(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const datos = actualizarPacienteSchema.parse(req.body);

    const paciente = await prisma.paciente.update({
      where: { id },
      data: datos,
    });

    res.json(paciente);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    // Error de Prisma cuando no existe el registro
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    console.error('Error al actualizar paciente:', error);
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
}

/**
 * Eliminar un paciente
 */
export async function eliminarPaciente(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.paciente.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    // Error de Prisma cuando no existe el registro
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    console.error('Error al eliminar paciente:', error);
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
}
