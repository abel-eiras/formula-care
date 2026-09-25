import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getQueryString, getParamString, getQueryNumber, getQueryLimit } from '../lib/queryHelpers.js';
import { normalizarBusqueda } from '../lib/textoBusqueda.js';
import { aplanarMedicion, guardarMedicion, medicionSchema, separarMedicion } from '../services/medicionService.js';

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

// Esquema de validación para análisis bioquímico. Las medidas corporales y la
// tensión (peso, altura, cintura, systolic, diastolic, pulsaciones...) se
// validan con medicionSchema y se guardan en la tabla única Medicion.
const crearAnalisisBioSchema = z
  .object({
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
    // Riesgo cardiovascular y de diabetes
    fumador: z.boolean().nullable().optional(),
    findrisc: z
      .record(z.string(), z.object({ valor: z.string(), puntos: z.number().int().min(0).max(5) }))
      .nullable()
      .optional()
      .transform((respuestas) => (respuestas === undefined ? undefined : respuestas && JSON.stringify(respuestas))),
    // Observaciones y recomendaciones
    observaciones: z.string().optional(),
    recomendaciones: z.string().optional(),
  })
  .merge(medicionSchema);

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

    // Parsear JSON strings de vuelta a objetos/arrays
    res.status(201).json({
      ...analisis,
      paciente: analisis.paciente,
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
    const id = getParamString(req.params.id);

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
      paciente: analisis.paciente,
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
    const pacienteId = getQueryString(req.query.pacienteId);
    const pacienteNombre = getQueryString(req.query.pacienteNombre);
    const fechaDesde = getQueryString(req.query.fechaDesde);
    const fechaHasta = getQueryString(req.query.fechaHasta);
    const motivoConsulta = getQueryString(req.query.motivoConsulta);
    const ordenarPor = getQueryString(req.query.ordenarPor) ?? 'fecha';
    const orden = getQueryString(req.query.orden) ?? 'desc';
    const limit = getQueryLimit(req.query.limit, 50, 500);

    const condiciones: Prisma.AnalisisDermoWhereInput[] = [];

    if (pacienteId) {
      condiciones.push({ pacienteId });
    }

    if (pacienteNombre) {
      condiciones.push({
        paciente: {
          textoBusqueda: { contains: normalizarBusqueda(pacienteNombre) },
        },
      });
    }

    if (motivoConsulta) {
      condiciones.push({
        motivoConsulta: { contains: motivoConsulta },
      });
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: { gte?: string; lte?: string } = {};
      if (fechaDesde) {
        fechaFilter.gte = fechaDesde;
      }
      if (fechaHasta) {
        fechaFilter.lte = fechaHasta;
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
        [ordenarPor]: orden === 'asc' ? 'asc' : 'desc',
      },
      take: limit,
    });

    // Parsear campos JSON
    const analisisParsed = analisis.map((a) => ({
      ...a,
      paciente: a.paciente,
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
    const pacienteId = getParamString(req.params.pacienteId);

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
        paciente: a.paciente,
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
    const id = getParamString(req.params.id);
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

    // Parsear JSON strings de vuelta a objetos/arrays
    res.json({
      ...analisis,
      paciente: analisis.paciente,
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

const INCLUDE_BIO = {
  paciente: { select: { id: true, name: true, email: true, phone: true } },
  medicion: true,
} as const;

type AnalisisBioConRelaciones = Prisma.AnalisisBioGetPayload<{ include: typeof INCLUDE_BIO }>;

/** Respuesta de Bio: las medidas de su Medicion se devuelven como campos planos */
function serializarAnalisisBio({ medicion, ...analisis }: AnalisisBioConRelaciones) {
  return { ...analisis, ...aplanarMedicion(medicion) };
}

/**
 * Crear un análisis bioquímico
 */
export async function crearAnalisisBio(req: Request, res: Response) {
  try {
    const datos = crearAnalisisBioSchema.parse(req.body);

    const paciente = await prisma.paciente.findUnique({
      where: { id: datos.pacienteId },
      select: { id: true },
    });
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const { medicion, resto } = separarMedicion(datos);

    // Análisis y medición se guardan juntos o no se guarda ninguno
    const id = await prisma.$transaction(async (tx) => {
      const analisis = await tx.analisisBio.create({ data: resto });
      await guardarMedicion(
        tx,
        { origen: 'bio', analisisBioId: analisis.id, pacienteId: analisis.pacienteId, fecha: analisis.fecha },
        medicion
      );
      return analisis.id;
    });

    const analisis = await prisma.analisisBio.findUniqueOrThrow({ where: { id }, include: INCLUDE_BIO });
    res.status(201).json(serializarAnalisisBio(analisis));
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
    const id = getParamString(req.params.id);

    const analisis = await prisma.analisisBio.findUnique({ where: { id }, include: INCLUDE_BIO });

    if (!analisis) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    res.json(serializarAnalisisBio(analisis));
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
    const pacienteId = getQueryString(req.query.pacienteId);
    const pacienteNombre = getQueryString(req.query.pacienteNombre);
    const fechaDesde = getQueryString(req.query.fechaDesde);
    const fechaHasta = getQueryString(req.query.fechaHasta);
    const ordenarPor = getQueryString(req.query.ordenarPor) ?? 'fecha';
    const orden = getQueryString(req.query.orden) ?? 'desc';
    const limit = getQueryLimit(req.query.limit, 50, 500);

    const condiciones: Prisma.AnalisisBioWhereInput[] = [];

    if (pacienteId) {
      condiciones.push({ pacienteId });
    }

    if (pacienteNombre) {
      condiciones.push({
        paciente: { textoBusqueda: { contains: normalizarBusqueda(pacienteNombre) } },
      });
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: { gte?: string; lte?: string } = {};
      if (fechaDesde) {
        fechaFilter.gte = fechaDesde;
      }
      if (fechaHasta) {
        fechaFilter.lte = fechaHasta;
      }
      condiciones.push({ fecha: fechaFilter });
    }

    const where = condiciones.length > 0 ? { AND: condiciones } : {};

    const analisis = await prisma.analisisBio.findMany({
      where,
      include: INCLUDE_BIO,
      orderBy: {
        [ordenarPor]: orden === 'asc' ? 'asc' : 'desc',
      },
      take: limit,
    });

    res.json(analisis.map(serializarAnalisisBio));
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
    const pacienteId = getParamString(req.params.pacienteId);

    const analisis = await prisma.analisisBio.findMany({
      where: { pacienteId },
      include: INCLUDE_BIO,
      orderBy: { fecha: 'desc' },
    });

    res.json(analisis.map(serializarAnalisisBio));
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
    const id = getParamString(req.params.id);
    // El paciente de un análisis no se puede cambiar
    const { pacienteId: _pacienteId, ...datos } = crearAnalisisBioSchema.partial().parse(req.body);

    const existente = await prisma.analisisBio.findUnique({ where: { id }, select: { id: true } });
    if (!existente) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    const { medicion, resto } = separarMedicion(datos);

    await prisma.$transaction(async (tx) => {
      const analisis = await tx.analisisBio.update({ where: { id }, data: resto });
      // Siempre se llama: aunque no cambien las medidas, la fecha puede haber cambiado
      await guardarMedicion(
        tx,
        { origen: 'bio', analisisBioId: id, pacienteId: analisis.pacienteId, fecha: analisis.fecha },
        medicion
      );
    });

    const analisis = await prisma.analisisBio.findUniqueOrThrow({ where: { id }, include: INCLUDE_BIO });
    res.json(serializarAnalisisBio(analisis));
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
