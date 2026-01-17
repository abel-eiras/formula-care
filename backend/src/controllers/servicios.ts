import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// Esquema de validación para análisis dermocosmético
const crearAnalisisDermoSchema = z.object({
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fecha: z.string(),
  skinType: z.string().optional(),
  phototype: z.string().optional(),
  concerns: z.array(z.string()).default([]),
  hydration: z.number().min(0).max(100).optional(),
  sebum: z.number().min(0).max(100).optional(),
  elasticity: z.number().min(0).max(100).optional(),
  spots: z.number().min(0).max(10).optional(),
  ph: z.number().min(0).max(14).optional(),
  treatment: z.string().optional(),
  cleaning: z.string().optional(),
  sunProtection: z.string().optional(),
  supplements: z.string().optional(),
});

// Esquema de validación para análisis bioquímico
const crearAnalisisBioSchema = z.object({
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fecha: z.string(),
  glucose: z.number().positive().optional(),
  cholesterol: z.number().positive().optional(),
  triglycerides: z.number().positive().optional(),
  systolic: z.number().int().positive().optional(),
  diastolic: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

/**
 * Crear un análisis dermocosmético
 */
export async function crearAnalisisDermo(req: Request, res: Response) {
  try {
    const datos = crearAnalisisDermoSchema.parse(req.body);

    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: datos.pacienteId },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const analisis = await prisma.analisisDermo.create({
      data: {
        ...datos,
        concerns: JSON.stringify(datos.concerns), // Guardar como JSON string
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      ...analisis,
      concerns: JSON.parse(analisis.concerns), // Devolver como array
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear análisis dermo:', error);
    res.status(500).json({ error: 'Error al crear análisis dermocosmético' });
  }
}

/**
 * Obtener un análisis dermocosmético por ID
 */
export async function obtenerAnalisisDermo(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const analisis = await prisma.analisisDermo.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!analisis) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    res.json({
      ...analisis,
      concerns: JSON.parse(analisis.concerns),
    });
  } catch (error) {
    console.error('Error al obtener análisis dermo:', error);
    res.status(500).json({ error: 'Error al obtener análisis dermocosmético' });
  }
}

/**
 * Crear un análisis bioquímico
 */
export async function crearAnalisisBio(req: Request, res: Response) {
  try {
    const datos = crearAnalisisBioSchema.parse(req.body);

    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: datos.pacienteId },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Calcular IMC si hay peso y altura
    let imc: number | undefined;
    if (datos.weight && datos.height) {
      const heightM = datos.height / 100;
      imc = Number((datos.weight / (heightM * heightM)).toFixed(1));
    }

    const analisis = await prisma.analisisBio.create({
      data: {
        ...datos,
        imc,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(analisis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear análisis bio:', error);
    res.status(500).json({ error: 'Error al crear análisis bioquímico' });
  }
}

/**
 * Obtener un análisis bioquímico por ID
 */
export async function obtenerAnalisisBio(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const analisis = await prisma.analisisBio.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!analisis) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    res.json(analisis);
  } catch (error) {
    console.error('Error al obtener análisis bio:', error);
    res.status(500).json({ error: 'Error al obtener análisis bioquímico' });
  }
}
