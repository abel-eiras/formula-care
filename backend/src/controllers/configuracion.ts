import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// Esquema de validación para datos de farmacia
const farmaciaSchema = z.object({
  farmaciaNombre: z.string().optional(),
  farmaciaDireccion: z.string().optional(),
  farmaciaCiudad: z.string().optional(),
  farmaciaTelefono: z.string().optional(),
  farmaciaEmail: z.string().email().optional().or(z.literal('')),
  farmaciaWeb: z.string().optional(),
  farmaciaWhatsapp: z.string().optional(),
  farmaciaLogo: z.string().optional(),
});

// Esquema de validación para rango de parámetro
const rangoParametroSchema = z.object({
  normalMin: z.number(),
  normalMax: z.number(),
  advertenciaMin: z.number().optional(),
  advertenciaMax: z.number().optional(),
  advertenciaMin2: z.number().optional(),
  advertenciaMax2: z.number().optional(),
  criticoMin: z.number().optional(),
  criticoMax: z.number().optional(),
  criticoMin2: z.number().optional(),
  criticoMax2: z.number().optional(),
});

// Esquema de validación para parámetros de referencia
const parametrosReferenciaSchema = z.record(z.string(), rangoParametroSchema);

/**
 * Obtener la configuración actual
 */
export async function obtenerConfiguracion(req: Request, res: Response) {
  try {
    let config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
    });

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          id: 'config',
          parametrosReferencia: JSON.stringify({
            glucemia: { normalMin: 70, normalMax: 100, advertenciaMin: 100, advertenciaMax: 125, criticoMin: 0, criticoMax: 70, criticoMin2: 125, criticoMax2: 999 },
            cholesterol: { normalMin: 0, normalMax: 200, advertenciaMin: 200, advertenciaMax: 240, criticoMin: 240, criticoMax: 999 },
            cholesterolHDL: { normalMin: 40, normalMax: 999, advertenciaMin: 35, advertenciaMax: 40, criticoMin: 0, criticoMax: 35 },
            cholesterolLDL: { normalMin: 0, normalMax: 100, advertenciaMin: 100, advertenciaMax: 160, criticoMin: 160, criticoMax: 999 },
            triglycerides: { normalMin: 0, normalMax: 150, advertenciaMin: 150, advertenciaMax: 200, criticoMin: 200, criticoMax: 999 },
            hemoglobinaGlucosilada: { normalMin: 0, normalMax: 5.7, advertenciaMin: 5.7, advertenciaMax: 6.4, criticoMin: 6.4, criticoMax: 999 },
            proteinaCReactiva: { normalMin: 0, normalMax: 3, advertenciaMin: 3, advertenciaMax: 10, criticoMin: 10, criticoMax: 999 },
            vitaminaD: { normalMin: 30, normalMax: 100, advertenciaMin: 20, advertenciaMax: 30, criticoMin: 0, criticoMax: 20 },
            ferritina: { normalMin: 15, normalMax: 200, advertenciaMin: 10, advertenciaMax: 15, advertenciaMin2: 200, advertenciaMax2: 300, criticoMin: 0, criticoMax: 10, criticoMin2: 300, criticoMax2: 999 },
            systolic: { normalMin: 90, normalMax: 120, advertenciaMin: 120, advertenciaMax: 140, criticoMin: 0, criticoMax: 90, criticoMin2: 140, criticoMax2: 999 },
            diastolic: { normalMin: 60, normalMax: 80, advertenciaMin: 80, advertenciaMax: 90, criticoMin: 0, criticoMax: 60, criticoMin2: 90, criticoMax2: 999 },
            pulsaciones: { normalMin: 60, normalMax: 100, advertenciaMin: 50, advertenciaMax: 60, advertenciaMin2: 100, advertenciaMax2: 120, criticoMin: 0, criticoMax: 50, criticoMin2: 120, criticoMax2: 999 },
            imc: { normalMin: 18.5, normalMax: 25, advertenciaMin: 17, advertenciaMax: 18.5, advertenciaMin2: 25, advertenciaMax2: 30, criticoMin: 0, criticoMax: 17, criticoMin2: 30, criticoMax2: 999 },
          }),
        },
      });
    }

    // Parsear JSON de parámetros
    const parametrosReferencia = typeof config.parametrosReferencia === 'string'
      ? JSON.parse(config.parametrosReferencia)
      : config.parametrosReferencia;

    res.json({
      ...config,
      parametrosReferencia,
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
}

/**
 * Actualizar datos de la farmacia
 */
export async function actualizarFarmacia(req: Request, res: Response) {
  try {
    const datos = farmaciaSchema.parse(req.body);

    // Verificar que existe la configuración
    let config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
    });

    if (!config) {
      // Crear si no existe
      config = await prisma.configuracion.create({
        data: {
          id: 'config',
          ...datos,
        },
      });
    } else {
      // Actualizar
      config = await prisma.configuracion.update({
        where: { id: 'config' },
        data: datos,
      });
    }

    res.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar datos de farmacia:', error);
    res.status(500).json({ error: 'Error al actualizar datos de farmacia' });
  }
}

/**
 * Actualizar parámetros de referencia bioquímicos
 */
export async function actualizarParametrosReferencia(req: Request, res: Response) {
  try {
    const parametros = parametrosReferenciaSchema.parse(req.body);

    // Verificar que existe la configuración
    let config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
    });

    if (!config) {
      // Crear si no existe
      config = await prisma.configuracion.create({
        data: {
          id: 'config',
          parametrosReferencia: JSON.stringify(parametros),
        },
      });
    } else {
      // Actualizar
      config = await prisma.configuracion.update({
        where: { id: 'config' },
        data: {
          parametrosReferencia: JSON.stringify(parametros),
        },
      });
    }

    // Parsear JSON para respuesta
    const parametrosReferencia = typeof config.parametrosReferencia === 'string'
      ? JSON.parse(config.parametrosReferencia)
      : config.parametrosReferencia;

    res.json({
      ...config,
      parametrosReferencia,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar parámetros de referencia:', error);
    res.status(500).json({ error: 'Error al actualizar parámetros de referencia' });
  }
}

/**
 * Actualizar estado de valoración bioquímica
 */
export async function actualizarValoracionBio(req: Request, res: Response) {
  try {
    const { valoracionBioActiva } = req.body;

    if (typeof valoracionBioActiva !== 'boolean') {
      return res.status(400).json({ error: 'valoracionBioActiva debe ser un booleano' });
    }

    // Verificar que existe la configuración
    let config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
    });

    if (!config) {
      // Crear si no existe
      config = await prisma.configuracion.create({
        data: {
          id: 'config',
          valoracionBioActiva,
        },
      });
    } else {
      // Actualizar
      config = await prisma.configuracion.update({
        where: { id: 'config' },
        data: { valoracionBioActiva },
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error al actualizar valoración bio:', error);
    res.status(500).json({ error: 'Error al actualizar valoración bioquímica' });
  }
}

/**
 * Obtener configuración del calendario
 * GET /api/configuracion/calendario
 */
export async function obtenerConfiguracionCalendario(req: Request, res: Response) {
  try {
    let config = await prisma.configuracionCalendario.findUnique({
      where: { id: 'calendario' },
    });

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.configuracionCalendario.create({
        data: {
          id: 'calendario',
          horariosPorTipo: '{}',
          fechasBloqueadas: '[]',
          horasBloqueadas: '{}',
          autoAceptar: false,
          duracionPorTipo: JSON.stringify({
            dermo: 45,
            bio: 20,
          }),
        },
      });
    }

    // Parsear JSON para respuesta
    const horariosPorTipo = typeof config.horariosPorTipo === 'string'
      ? JSON.parse(config.horariosPorTipo)
      : config.horariosPorTipo;
    const fechasBloqueadas = typeof config.fechasBloqueadas === 'string'
      ? JSON.parse(config.fechasBloqueadas)
      : config.fechasBloqueadas;
    const horasBloqueadas = typeof config.horasBloqueadas === 'string'
      ? JSON.parse(config.horasBloqueadas)
      : config.horasBloqueadas;
    const duracionPorTipo = typeof config.duracionPorTipo === 'string'
      ? JSON.parse(config.duracionPorTipo)
      : config.duracionPorTipo;

    res.json({
      ...config,
      horariosPorTipo,
      fechasBloqueadas,
      horasBloqueadas,
      duracionPorTipo,
    });
  } catch (error) {
    console.error('Error al obtener configuración del calendario:', error);
    res.status(500).json({ error: 'Error al obtener configuración del calendario' });
  }
}

/**
 * Actualizar configuración del calendario
 * PUT /api/configuracion/calendario
 */
export async function actualizarConfiguracionCalendario(req: Request, res: Response) {
  try {
    const {
      horariosPorTipo,
      fechasBloqueadas,
      horasBloqueadas,
      autoAceptar,
      duracionPorTipo,
    } = req.body;

    // Validar formato de horariosPorTipo si se proporciona
    if (horariosPorTipo !== undefined) {
      if (typeof horariosPorTipo !== 'object' || Array.isArray(horariosPorTipo)) {
        return res.status(400).json({ error: 'horariosPorTipo debe ser un objeto' });
      }
    }

    // Validar formato de fechasBloqueadas si se proporciona
    if (fechasBloqueadas !== undefined) {
      if (!Array.isArray(fechasBloqueadas)) {
        return res.status(400).json({ error: 'fechasBloqueadas debe ser un array' });
      }
      // Validar formato de fechas (YYYY-MM-DD)
      for (const fecha of fechasBloqueadas) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          return res.status(400).json({
            error: `Formato de fecha inválido: ${fecha}. Debe ser YYYY-MM-DD`,
          });
        }
      }
    }

    // Validar formato de horasBloqueadas si se proporciona
    if (horasBloqueadas !== undefined) {
      if (typeof horasBloqueadas !== 'object' || Array.isArray(horasBloqueadas)) {
        return res.status(400).json({ error: 'horasBloqueadas debe ser un objeto' });
      }
      // Validar formato de horas en el objeto
      for (const [fecha, horas] of Object.entries(horasBloqueadas)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          return res.status(400).json({
            error: `Formato de fecha inválido: ${fecha}. Debe ser YYYY-MM-DD`,
          });
        }
        if (!Array.isArray(horas)) {
          return res.status(400).json({
            error: `horasBloqueadas[${fecha}] debe ser un array`,
          });
        }
        for (const hora of horas) {
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
            return res.status(400).json({
              error: `Formato de hora inválido: ${hora}. Debe ser HH:mm`,
            });
          }
        }
      }
    }

    // Validar autoAceptar si se proporciona
    if (autoAceptar !== undefined && typeof autoAceptar !== 'boolean') {
      return res.status(400).json({ error: 'autoAceptar debe ser un booleano' });
    }

    // Validar formato de duracionPorTipo si se proporciona
    if (duracionPorTipo !== undefined) {
      if (typeof duracionPorTipo !== 'object' || Array.isArray(duracionPorTipo)) {
        return res.status(400).json({ error: 'duracionPorTipo debe ser un objeto' });
      }
      // Validar que los valores sean números
      for (const [tipo, duracion] of Object.entries(duracionPorTipo)) {
        if (typeof duracion !== 'number' || duracion <= 0) {
          return res.status(400).json({
            error: `duracionPorTipo[${tipo}] debe ser un número positivo`,
          });
        }
      }
    }

    // Obtener configuración actual
    let config = await prisma.configuracionCalendario.findUnique({
      where: { id: 'calendario' },
    });

    // Preparar datos para actualizar
    const datosActualizar: any = {};

    if (horariosPorTipo !== undefined) {
      datosActualizar.horariosPorTipo = JSON.stringify(horariosPorTipo);
    }
    if (fechasBloqueadas !== undefined) {
      datosActualizar.fechasBloqueadas = JSON.stringify(fechasBloqueadas);
    }
    if (horasBloqueadas !== undefined) {
      datosActualizar.horasBloqueadas = JSON.stringify(horasBloqueadas);
    }
    if (autoAceptar !== undefined) {
      datosActualizar.autoAceptar = autoAceptar;
    }
    if (duracionPorTipo !== undefined) {
      datosActualizar.duracionPorTipo = JSON.stringify(duracionPorTipo);
    }

    if (!config) {
      // Crear si no existe
      config = await prisma.configuracionCalendario.create({
        data: {
          id: 'calendario',
          horariosPorTipo: datosActualizar.horariosPorTipo || '{}',
          fechasBloqueadas: datosActualizar.fechasBloqueadas || '[]',
          horasBloqueadas: datosActualizar.horasBloqueadas || '{}',
          autoAceptar: datosActualizar.autoAceptar ?? false,
          duracionPorTipo: datosActualizar.duracionPorTipo || JSON.stringify({
            dermo: 45,
            bio: 20,
          }),
        },
      });
    } else {
      // Actualizar
      config = await prisma.configuracionCalendario.update({
        where: { id: 'calendario' },
        data: datosActualizar,
      });
    }

    // Parsear JSON para respuesta
    const horariosPorTipoResp = typeof config.horariosPorTipo === 'string'
      ? JSON.parse(config.horariosPorTipo)
      : config.horariosPorTipo;
    const fechasBloqueadasResp = typeof config.fechasBloqueadas === 'string'
      ? JSON.parse(config.fechasBloqueadas)
      : config.fechasBloqueadas;
    const horasBloqueadasResp = typeof config.horasBloqueadas === 'string'
      ? JSON.parse(config.horasBloqueadas)
      : config.horasBloqueadas;
    const duracionPorTipoResp = typeof config.duracionPorTipo === 'string'
      ? JSON.parse(config.duracionPorTipo)
      : config.duracionPorTipo;

    res.json({
      ...config,
      horariosPorTipo: horariosPorTipoResp,
      fechasBloqueadas: fechasBloqueadasResp,
      horasBloqueadas: horasBloqueadasResp,
      duracionPorTipo: duracionPorTipoResp,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }
    console.error('Error al actualizar configuración del calendario:', error);
    res.status(500).json({ error: 'Error al actualizar configuración del calendario' });
  }
}

/**
 * Bloquear una fecha/hora específica
 * POST /api/configuracion/calendario/bloquear
 */
export async function bloquearFechaHora(req: Request, res: Response) {
  try {
    const { fecha, hora } = req.body;

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' });
    }

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        error: 'Formato de fecha inválido. Debe ser YYYY-MM-DD',
      });
    }

    // Validar formato de hora si se proporciona
    if (hora && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
      return res.status(400).json({
        error: 'Formato de hora inválido. Debe ser HH:mm',
      });
    }

    // Obtener configuración actual
    let config = await prisma.configuracionCalendario.findUnique({
      where: { id: 'calendario' },
    });

    if (!config) {
      config = await prisma.configuracionCalendario.create({
        data: {
          id: 'calendario',
          horariosPorTipo: '{}',
          fechasBloqueadas: '[]',
          horasBloqueadas: '{}',
          autoAceptar: false,
          duracionPorTipo: JSON.stringify({
            dermo: 45,
            bio: 20,
          }),
        },
      });
    }

    const fechasBloqueadas: string[] = JSON.parse(config.fechasBloqueadas || '[]');
    const horasBloqueadas: Record<string, string[]> = JSON.parse(config.horasBloqueadas || '{}');

    if (hora) {
      // Bloquear hora específica
      if (!horasBloqueadas[fecha]) {
        horasBloqueadas[fecha] = [];
      }
      if (!horasBloqueadas[fecha].includes(hora)) {
        horasBloqueadas[fecha].push(hora);
        horasBloqueadas[fecha].sort(); // Ordenar horas
      }
    } else {
      // Bloquear todo el día
      if (!fechasBloqueadas.includes(fecha)) {
        fechasBloqueadas.push(fecha);
        fechasBloqueadas.sort(); // Ordenar fechas
      }
      // Eliminar horas bloqueadas de ese día si existían (el día completo está bloqueado)
      delete horasBloqueadas[fecha];
    }

    // Actualizar configuración
    config = await prisma.configuracionCalendario.update({
      where: { id: 'calendario' },
      data: {
        fechasBloqueadas: JSON.stringify(fechasBloqueadas),
        horasBloqueadas: JSON.stringify(horasBloqueadas),
      },
    });

    res.json({
      mensaje: hora ? `Hora ${hora} del ${fecha} bloqueada` : `Fecha ${fecha} bloqueada`,
      fechasBloqueadas: JSON.parse(config.fechasBloqueadas),
      horasBloqueadas: JSON.parse(config.horasBloqueadas),
    });
  } catch (error) {
    console.error('Error al bloquear fecha/hora:', error);
    res.status(500).json({ error: 'Error al bloquear fecha/hora' });
  }
}

/**
 * Desbloquear una fecha/hora específica
 * DELETE /api/configuracion/calendario/desbloquear?fecha=2026-01-20&hora=10:00
 */
export async function desbloquearFechaHora(req: Request, res: Response) {
  try {
    const { fecha, hora } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' });
    }

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha as string)) {
      return res.status(400).json({
        error: 'Formato de fecha inválido. Debe ser YYYY-MM-DD',
      });
    }

    // Validar formato de hora si se proporciona
    if (hora && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora as string)) {
      return res.status(400).json({
        error: 'Formato de hora inválido. Debe ser HH:mm',
      });
    }

    // Obtener configuración actual
    const config = await prisma.configuracionCalendario.findUnique({
      where: { id: 'calendario' },
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración del calendario no encontrada' });
    }

    const fechasBloqueadas: string[] = JSON.parse(config.fechasBloqueadas || '[]');
    const horasBloqueadas: Record<string, string[]> = JSON.parse(config.horasBloqueadas || '{}');

    if (hora) {
      // Desbloquear hora específica
      if (horasBloqueadas[fecha as string]) {
        horasBloqueadas[fecha as string] = horasBloqueadas[fecha as string].filter(
          (h) => h !== hora
        );
        if (horasBloqueadas[fecha as string].length === 0) {
          delete horasBloqueadas[fecha as string];
        }
      }
    } else {
      // Desbloquear todo el día
      const index = fechasBloqueadas.indexOf(fecha as string);
      if (index > -1) {
        fechasBloqueadas.splice(index, 1);
      }
      // También eliminar horas bloqueadas de ese día
      delete horasBloqueadas[fecha as string];
    }

    // Actualizar configuración
    const configActualizada = await prisma.configuracionCalendario.update({
      where: { id: 'calendario' },
      data: {
        fechasBloqueadas: JSON.stringify(fechasBloqueadas),
        horasBloqueadas: JSON.stringify(horasBloqueadas),
      },
    });

    res.json({
      mensaje: hora ? `Hora ${hora} del ${fecha} desbloqueada` : `Fecha ${fecha} desbloqueada`,
      fechasBloqueadas: JSON.parse(configActualizada.fechasBloqueadas),
      horasBloqueadas: JSON.parse(configActualizada.horasBloqueadas),
    });
  } catch (error) {
    console.error('Error al desbloquear fecha/hora:', error);
    res.status(500).json({ error: 'Error al desbloquear fecha/hora' });
  }
}

