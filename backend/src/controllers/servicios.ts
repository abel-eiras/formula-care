import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { crearNotificacionRevision } from '../services/notificacionesService.js';

// Esquema de validación para análisis dermocosmético (plantilla completa)
const crearAnalisisDermoSchema = z.object({
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fecha: z.string(),
  // Nuevos campos de la plantilla
  motivoConsulta: z.string().optional(),
  valoracionPiel: z.array(z.string()).default([]),
  habitos: z.array(z.string()).default([]),
  medicacionHabitual: z.string().optional(),
  patologias: z.string().optional(),
  etapaHormonal: z.string().optional(),
  rutinaDia: z.object({
    higiene: z.string().optional(),
    contornoOjos: z.string().optional(),
    productoIntensivo: z.string().optional(),
    hidratacion: z.string().optional(),
    proteccionSolar: z.string().optional(),
  }).optional(),
  rutinaNoche: z.object({
    limpieza: z.string().optional(),
    contornoOjos: z.string().optional(),
    productoIntensivo: z.string().optional(),
    hidratacion: z.string().optional(),
  }).optional(),
  cuidadosSemanales: z.object({
    exfoliante: z.string().optional(),
    mascarilla: z.string().optional(),
  }).optional(),
  suplementacionOral: z.string().optional(),
  proximaRevision: z.string().optional(),
  farmaceutico: z.string().optional(),
  // Campos legacy (mantener para compatibilidad)
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
  // Parámetros básicos
  glucemia: z.number().positive().optional(),
  cholesterol: z.number().positive().optional(),
  cholesterolHDL: z.number().positive().optional(),
  cholesterolLDL: z.number().positive().optional(),
  triglycerides: z.number().positive().optional(),
  // Parámetros avanzados
  hemoglobinaGlucosilada: z.number().positive().optional(),
  proteinaCReactiva: z.number().positive().optional(),
  vitaminaD: z.number().positive().optional(),
  ferritina: z.number().positive().optional(),
  // Tensión arterial y pulsaciones
  systolic: z.number().int().positive().optional(),
  diastolic: z.number().int().positive().optional(),
  pulsaciones: z.number().int().positive().optional(),
  // Medidas corporales
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  // Observaciones y recomendaciones
  observaciones: z.string().optional(),
  recomendaciones: z.string().optional(),
  // Campo legacy para compatibilidad
  glucose: z.number().positive().optional(),
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
        // Convertir arrays y objetos a JSON strings
        valoracionPiel: JSON.stringify(datos.valoracionPiel || []),
        habitos: JSON.stringify(datos.habitos || []),
        concerns: JSON.stringify(datos.concerns || []),
        rutinaDia: datos.rutinaDia ? JSON.stringify(datos.rutinaDia) : null,
        rutinaNoche: datos.rutinaNoche ? JSON.stringify(datos.rutinaNoche) : null,
        cuidadosSemanales: datos.cuidadosSemanales ? JSON.stringify(datos.cuidadosSemanales) : null,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Crear notificación si hay próxima revisión
    if (analisis.proximaRevision) {
      crearNotificacionRevision(analisis.id, analisis.pacienteId, analisis.proximaRevision).catch(
        (err) => console.error('Error al crear notificación:', err)
      );
    }

    // Parsear JSON strings de vuelta a objetos/arrays
    res.status(201).json({
      ...analisis,
      valoracionPiel: JSON.parse(analisis.valoracionPiel),
      habitos: JSON.parse(analisis.habitos),
      concerns: JSON.parse(analisis.concerns),
      rutinaDia: analisis.rutinaDia ? JSON.parse(analisis.rutinaDia) : null,
      rutinaNoche: analisis.rutinaNoche ? JSON.parse(analisis.rutinaNoche) : null,
      cuidadosSemanales: analisis.cuidadosSemanales ? JSON.parse(analisis.cuidadosSemanales) : null,
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

    // Parsear todos los campos JSON
    res.json({
      ...analisis,
      valoracionPiel: JSON.parse(analisis.valoracionPiel),
      habitos: JSON.parse(analisis.habitos),
      concerns: JSON.parse(analisis.concerns),
      rutinaDia: analisis.rutinaDia ? JSON.parse(analisis.rutinaDia) : null,
      rutinaNoche: analisis.rutinaNoche ? JSON.parse(analisis.rutinaNoche) : null,
      cuidadosSemanales: analisis.cuidadosSemanales ? JSON.parse(analisis.cuidadosSemanales) : null,
    });
  } catch (error) {
    console.error('Error al obtener análisis dermo:', error);
    res.status(500).json({ error: 'Error al obtener análisis dermocosmético' });
  }
}

/**
 * Obtener todos los análisis dermocosméticos con filtros avanzados
 */
export async function obtenerTodosAnalisisDermo(req: Request, res: Response) {
  try {
    const {
      pacienteId,
      pacienteNombre,
      fechaDesde,
      fechaHasta,
      motivoConsulta,
      ordenarPor = 'fecha',
      orden = 'desc',
      limit,
    } = req.query;

    const condiciones: any[] = [];

    if (pacienteId) {
      condiciones.push({ pacienteId: pacienteId as string });
    }

    if (pacienteNombre) {
      condiciones.push({
        paciente: {
          name: { contains: pacienteNombre as string },
        },
      });
    }

    if (motivoConsulta) {
      condiciones.push({
        motivoConsulta: { contains: motivoConsulta as string },
      });
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: any = {};
      if (fechaDesde) {
        fechaFilter.gte = fechaDesde as string;
      }
      if (fechaHasta) {
        fechaFilter.lte = fechaHasta as string;
      }
      condiciones.push({ fecha: fechaFilter });
    }

    const where = condiciones.length > 0 ? { AND: condiciones } : {};

    const analisis = await prisma.analisisDermo.findMany({
      where,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        [ordenarPor as string]: orden === 'asc' ? 'asc' : 'desc',
      },
      take: limit ? parseInt(limit as string) : undefined,
    });

    // Parsear campos JSON
    const analisisParsed = analisis.map((a) => ({
      ...a,
      valoracionPiel: JSON.parse(a.valoracionPiel),
      habitos: JSON.parse(a.habitos),
      concerns: JSON.parse(a.concerns),
      rutinaDia: a.rutinaDia ? JSON.parse(a.rutinaDia) : null,
      rutinaNoche: a.rutinaNoche ? JSON.parse(a.rutinaNoche) : null,
      cuidadosSemanales: a.cuidadosSemanales ? JSON.parse(a.cuidadosSemanales) : null,
    }));

    res.json(analisisParsed);
  } catch (error) {
    console.error('Error al obtener análisis dermo:', error);
    res.status(500).json({ error: 'Error al obtener análisis dermocosméticos' });
  }
}

/**
 * Obtener todos los análisis dermocosméticos de un paciente
 */
export async function obtenerAnalisisDermoPorPaciente(req: Request, res: Response) {
  try {
    const { pacienteId } = req.params;

    const analisis = await prisma.analisisDermo.findMany({
      where: { pacienteId },
      include: {
        paciente: true,
      },
      orderBy: { fecha: 'desc' },
    });

    res.json(
      analisis.map((a) => ({
        ...a,
        valoracionPiel: JSON.parse(a.valoracionPiel),
        habitos: JSON.parse(a.habitos),
        concerns: JSON.parse(a.concerns),
        rutinaDia: a.rutinaDia ? JSON.parse(a.rutinaDia) : null,
        rutinaNoche: a.rutinaNoche ? JSON.parse(a.rutinaNoche) : null,
        cuidadosSemanales: a.cuidadosSemanales ? JSON.parse(a.cuidadosSemanales) : null,
      }))
    );
  } catch (error) {
    console.error('Error al obtener análisis dermo por paciente:', error);
    res.status(500).json({ error: 'Error al obtener análisis dermocosmético' });
  }
}

/**
 * Actualizar un análisis dermocosmético
 */
export async function actualizarAnalisisDermo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const datos = crearAnalisisDermoSchema.partial().parse(req.body);

    // Verificar que el análisis existe
    const analisisExistente = await prisma.analisisDermo.findUnique({
      where: { id },
    });

    if (!analisisExistente) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    const analisis = await prisma.analisisDermo.update({
      where: { id },
      data: {
        ...datos,
        // Convertir arrays y objetos a JSON strings solo si están presentes
        valoracionPiel: datos.valoracionPiel ? JSON.stringify(datos.valoracionPiel) : undefined,
        habitos: datos.habitos ? JSON.stringify(datos.habitos) : undefined,
        concerns: datos.concerns ? JSON.stringify(datos.concerns) : undefined,
        rutinaDia: datos.rutinaDia ? JSON.stringify(datos.rutinaDia) : undefined,
        rutinaNoche: datos.rutinaNoche ? JSON.stringify(datos.rutinaNoche) : undefined,
        cuidadosSemanales: datos.cuidadosSemanales ? JSON.stringify(datos.cuidadosSemanales) : undefined,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Crear notificación si hay próxima revisión nueva o actualizada
    if (analisis.proximaRevision) {
      crearNotificacionRevision(analisis.id, analisis.pacienteId, analisis.proximaRevision).catch(
        (err) => console.error('Error al crear notificación:', err)
      );
    }

    // Parsear JSON strings de vuelta a objetos/arrays
    res.json({
      ...analisis,
      valoracionPiel: JSON.parse(analisis.valoracionPiel),
      habitos: JSON.parse(analisis.habitos),
      concerns: JSON.parse(analisis.concerns),
      rutinaDia: analisis.rutinaDia ? JSON.parse(analisis.rutinaDia) : null,
      rutinaNoche: analisis.rutinaNoche ? JSON.parse(analisis.rutinaNoche) : null,
      cuidadosSemanales: analisis.cuidadosSemanales ? JSON.parse(analisis.cuidadosSemanales) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar análisis dermo:', error);
    res.status(500).json({ error: 'Error al actualizar análisis dermocosmético' });
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

    // Manejar compatibilidad: si viene glucose, usar como glucemia
    const glucemia = datos.glucemia || datos.glucose;

    const analisis = await prisma.analisisBio.create({
      data: {
        ...datos,
        glucemia,
        glucose: undefined, // No guardar el campo legacy
        imc,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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

/**
 * Obtener todos los análisis bioquímicos con filtros avanzados
 */
export async function obtenerTodosAnalisisBio(req: Request, res: Response) {
  try {
    const {
      pacienteId,
      pacienteNombre,
      fechaDesde,
      fechaHasta,
      parametroAlterado,
      ordenarPor = 'fecha',
      orden = 'desc',
      limit,
    } = req.query;

    const condiciones: any[] = [];

    if (pacienteId) {
      condiciones.push({ pacienteId: pacienteId as string });
    }

    if (pacienteNombre) {
      condiciones.push({
        paciente: {
          name: { contains: pacienteNombre as string },
        },
      });
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: any = {};
      if (fechaDesde) {
        fechaFilter.gte = fechaDesde as string;
      }
      if (fechaHasta) {
        fechaFilter.lte = fechaHasta as string;
      }
      condiciones.push({ fecha: fechaFilter });
    }

    // Nota: parametroAlterado requeriría lógica más compleja para verificar valores fuera de rango
    // Por ahora lo dejamos como placeholder

    const where = condiciones.length > 0 ? { AND: condiciones } : {};

    const analisis = await prisma.analisisBio.findMany({
      where,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        [ordenarPor as string]: orden === 'asc' ? 'asc' : 'desc',
      },
      take: limit ? parseInt(limit as string) : undefined,
    });

    res.json(analisis);
  } catch (error) {
    console.error('Error al obtener análisis bio:', error);
    res.status(500).json({ error: 'Error al obtener análisis bioquímicos' });
  }
}

/**
 * Obtener todos los análisis bioquímicos de un paciente
 */
export async function obtenerAnalisisBioPorPaciente(req: Request, res: Response) {
  try {
    const { pacienteId } = req.params;

    const analisis = await prisma.analisisBio.findMany({
      where: { pacienteId },
      include: {
        paciente: true,
      },
      orderBy: { fecha: 'desc' },
    });

    res.json(analisis);
  } catch (error) {
    console.error('Error al obtener análisis bio por paciente:', error);
    res.status(500).json({ error: 'Error al obtener análisis bioquímico' });
  }
}

/**
 * Actualizar un análisis bioquímico
 */
export async function actualizarAnalisisBio(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const datos = crearAnalisisBioSchema.partial().parse(req.body);

    // Verificar que el análisis existe
    const analisisExistente = await prisma.analisisBio.findUnique({
      where: { id },
    });

    if (!analisisExistente) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    // Calcular IMC si hay peso y altura
    let imc: number | undefined;
    if (datos.weight && datos.height) {
      const heightM = datos.height / 100;
      imc = Number((datos.weight / (heightM * heightM)).toFixed(1));
    }

    // Manejar compatibilidad: si viene glucose, usar como glucemia
    const glucemia = datos.glucemia || datos.glucose;

    const analisis = await prisma.analisisBio.update({
      where: { id },
      data: {
        ...datos,
        glucemia: glucemia !== undefined ? glucemia : undefined,
        glucose: undefined, // No actualizar el campo legacy
        imc: imc !== undefined ? imc : undefined,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json(analisis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar análisis bio:', error);
    res.status(500).json({ error: 'Error al actualizar análisis bioquímico' });
  }
}
