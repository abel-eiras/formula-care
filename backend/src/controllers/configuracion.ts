import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  PARAMETROS_BIO_CONFIG_DEFAULT,
  PARAMETROS_REFERENCIA_DEFAULT,
} from '../config/parametrosBioDefault.js';
import { derivarClaveCifrado } from '../services/backupService.js';
import { avisarCambioAgenda } from '../services/reservaOnline/sincronizacion.js';

// ID fijo de la fila única de configuración (instalación local de una sola farmacia)
const CONFIG_ID = 'singleton';

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
  temaActivo: z.string().optional(),
  coloresMarca: z.record(z.string(), z.string()).optional(),
});

// Esquema de validación para configuración RGPD
const rgpdSchema = z.object({
  // Datos del responsable
  rgpdRazonSocial: z.string().optional().nullable(),
  rgpdCif: z.string().optional().nullable(),
  rgpdDireccionFiscal: z.string().optional().nullable(),
  rgpdEmailContacto: z.string().email().optional().or(z.literal('')).nullable(),
  rgpdResponsable: z.string().optional().nullable(),
  rgpdDpo: z.string().optional().nullable(),
  // Textos legales
  textoAvisoLegal: z.string().optional().nullable(),
  textoPoliticaPrivacidad: z.string().optional().nullable(),
  textoPoliticaCookies: z.string().optional().nullable(),
  textoConsentimiento: z.string().optional().nullable(),
  // Configuración de consentimiento
  consentimientoRequerido: z.boolean().optional(),
  consentimientoVersion: z.string().optional().nullable(),
  retencionDatosMeses: z.number().int().positive().optional(),
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

// Esquema para actualizar valoración bio
const valoracionBioSchema = z.object({
  valoracionBioActiva: z.boolean(),
});

// Esquema para cada elemento de parametrosBioConfig
const parametroBioConfigItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1),
  grupo: z.enum(['basicos', 'avanzados', 'tension', 'corporales']),
  activo: z.boolean(),
  orden: z.number(),
});
const parametrosBioConfigSchema = z.array(parametroBioConfigItemSchema);

// Esquema para configuración del calendario (todos los campos opcionales)
const fechaYYYYMMDD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD');
const horaHHmm = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:mm');
const configuracionCalendarioSchema = z.object({
  horariosPorTipo: z.record(z.string(), z.unknown()).optional(),
  fechasBloqueadas: z.array(fechaYYYYMMDD).optional(),
  horasBloqueadas: z.record(z.string(), z.array(horaHHmm)).optional(),
  autoAceptar: z.boolean().optional(),
  duracionPorTipo: z.record(z.string(), z.number().positive()).optional(),
});

const bloquearFechaHoraSchema = z.object({
  fecha: fechaYYYYMMDD,
  hora: horaHHmm.optional(),
});

// Esquema para configuración de copias de seguridad
const configBackupSchema = z.object({
  backupPeriodicidad: z.enum(['diaria', 'semanal', 'mensual', 'desactivada']).optional(),
  backupCifrado: z.boolean().optional(),
  // Solo necesaria al activar el cifrado por primera vez o al cambiar la contraseña
  password: z.string().min(4).optional(),
});

/**
 * Obtener la configuración actual (fila única de la instalación)
 */
export async function obtenerConfiguracion(req: Request, res: Response) {
  try {
    let config = await prisma.configuracion.findUnique({
      where: { id: CONFIG_ID },
    });

    // Si no existe, crear con valores por defecto (parámetros de referencia y lista de parámetros bio)
    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          id: CONFIG_ID,
          parametrosReferencia: JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
          parametrosBioConfig: JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
        },
      });
    }

    // Parsear JSON de parámetros
    const parametrosReferencia = typeof config.parametrosReferencia === 'string'
      ? JSON.parse(config.parametrosReferencia)
      : config.parametrosReferencia;

    // Parsear configuración de parámetros bioquímicos
    const parametrosBioConfig = typeof config.parametrosBioConfig === 'string'
      ? JSON.parse(config.parametrosBioConfig)
      : config.parametrosBioConfig || [];

    // Parsear colores de marca (JSON)
    let coloresMarca: Record<string, string> | null = null;
    if (config.coloresMarca) {
      try {
        coloresMarca = typeof config.coloresMarca === 'string'
          ? JSON.parse(config.coloresMarca)
          : (config.coloresMarca as Record<string, string>);
      } catch {
        coloresMarca = null;
      }
    }

    res.json({
      ...config,
      parametrosReferencia,
      parametrosBioConfig,
      coloresMarca,
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

    // Serializar coloresMarca a JSON si viene como objeto
    const dataParaPrisma = { ...datos } as Record<string, unknown>;
    if (dataParaPrisma.coloresMarca != null && typeof dataParaPrisma.coloresMarca === 'object') {
      dataParaPrisma.coloresMarca = JSON.stringify(dataParaPrisma.coloresMarca);
    }

    const config = await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...dataParaPrisma },
      update: dataParaPrisma,
    });

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

    const config = await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        parametrosReferencia: JSON.stringify(parametros),
      },
      update: {
        parametrosReferencia: JSON.stringify(parametros),
      },
    });

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
    const { valoracionBioActiva } = valoracionBioSchema.parse(req.body);

    const config = await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, valoracionBioActiva },
      update: { valoracionBioActiva },
    });

    res.json(config);
  } catch (error) {
    console.error('Error al actualizar valoración bio:', error);
    res.status(500).json({ error: 'Error al actualizar valoración bioquímica' });
  }
}

/**
 * Actualizar configuración de parámetros bioquímicos
 * PUT /api/configuracion/parametros-bio
 */
export async function actualizarParametrosBioConfig(req: Request, res: Response) {
  try {
    const parametrosBioConfig = parametrosBioConfigSchema.parse(req.body);

    const config = await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        parametrosBioConfig: JSON.stringify(parametrosBioConfig),
      },
      update: {
        parametrosBioConfig: JSON.stringify(parametrosBioConfig),
      },
    });

    res.json({
      ...config,
      parametrosBioConfig,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar parámetros bio config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de parámetros bioquímicos' });
  }
}

/**
 * Obtener configuración del calendario
 * GET /api/configuracion/calendario
 */
export async function obtenerConfiguracionCalendario(req: Request, res: Response) {
  try {
    let config = await prisma.configuracionCalendario.findUnique({
      where: { id: CONFIG_ID },
    });

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.configuracionCalendario.create({
        data: {
          id: CONFIG_ID,
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
    const datos = configuracionCalendarioSchema.parse(req.body);
    const {
      horariosPorTipo,
      fechasBloqueadas,
      horasBloqueadas,
      autoAceptar,
      duracionPorTipo,
    } = datos;

    // Obtener configuración actual
    let config = await prisma.configuracionCalendario.findUnique({
      where: { id: CONFIG_ID },
    });

    // Preparar datos para actualizar
    const datosActualizar: {
      horariosPorTipo?: string;
      fechasBloqueadas?: string;
      horasBloqueadas?: string;
      autoAceptar?: boolean;
      duracionPorTipo?: string;
    } = {};

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
          id: CONFIG_ID,
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
        where: { id: CONFIG_ID },
        data: datosActualizar,
      });
      avisarCambioAgenda();
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
    console.error('Error al actualizar configuración del calendario:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Error al actualizar la configuración del calendario',
      });
    }
    res.status(500).json({ error: 'Error al actualizar configuración del calendario' });
  }
}

/**
 * Bloquear una fecha/hora específica
 * POST /api/configuracion/calendario/bloquear
 */
export async function bloquearFechaHora(req: Request, res: Response) {
  try {
    const { fecha, hora } = bloquearFechaHoraSchema.parse(req.body);

    // Obtener configuración actual
    let config = await prisma.configuracionCalendario.findUnique({
      where: { id: CONFIG_ID },
    });

    if (!config) {
      config = await prisma.configuracionCalendario.create({
        data: {
          id: CONFIG_ID,
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
      where: { id: CONFIG_ID },
      data: {
        fechasBloqueadas: JSON.stringify(fechasBloqueadas),
        horasBloqueadas: JSON.stringify(horasBloqueadas),
      },
    });
    avisarCambioAgenda();

    res.json({
      mensaje: hora ? `Hora ${hora} del ${fecha} bloqueada` : `Fecha ${fecha} bloqueada`,
      fechasBloqueadas: JSON.parse(config.fechasBloqueadas),
      horasBloqueadas: JSON.parse(config.horasBloqueadas),
    });
  } catch (error) {
    console.error('Error al bloquear fecha/hora:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
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
      where: { id: CONFIG_ID },
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
      where: { id: CONFIG_ID },
      data: {
        fechasBloqueadas: JSON.stringify(fechasBloqueadas),
        horasBloqueadas: JSON.stringify(horasBloqueadas),
      },
    });
    avisarCambioAgenda();

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

/**
 * Obtener configuración RGPD
 * GET /api/configuracion/rgpd
 */
export async function obtenerRgpd(req: Request, res: Response) {
  try {
    let config = await prisma.configuracion.findUnique({
      where: { id: CONFIG_ID },
      select: {
        rgpdRazonSocial: true,
        rgpdCif: true,
        rgpdDireccionFiscal: true,
        rgpdEmailContacto: true,
        rgpdResponsable: true,
        rgpdDpo: true,
        textoAvisoLegal: true,
        textoPoliticaPrivacidad: true,
        textoPoliticaCookies: true,
        textoConsentimiento: true,
        consentimientoRequerido: true,
        consentimientoVersion: true,
        retencionDatosMeses: true,
      },
    });

    if (!config) {
      // Crear configuración por defecto
      await prisma.configuracion.create({
        data: { id: CONFIG_ID },
      });
      config = {
        rgpdRazonSocial: null,
        rgpdCif: null,
        rgpdDireccionFiscal: null,
        rgpdEmailContacto: null,
        rgpdResponsable: null,
        rgpdDpo: null,
        textoAvisoLegal: null,
        textoPoliticaPrivacidad: null,
        textoPoliticaCookies: null,
        textoConsentimiento: null,
        consentimientoRequerido: true,
        consentimientoVersion: 'v1.0',
        retencionDatosMeses: 60,
      };
    }

    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración RGPD:', error);
    res.status(500).json({ error: 'Error al obtener configuración RGPD' });
  }
}

/**
 * Actualizar configuración RGPD
 * PUT /api/configuracion/rgpd
 */
export async function actualizarRgpd(req: Request, res: Response) {
  try {
    const datos = rgpdSchema.parse(req.body);

    const config = await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...datos },
      update: datos,
    });

    // Devolver solo campos RGPD
    res.json({
      rgpdRazonSocial: config.rgpdRazonSocial,
      rgpdCif: config.rgpdCif,
      rgpdDireccionFiscal: config.rgpdDireccionFiscal,
      rgpdEmailContacto: config.rgpdEmailContacto,
      rgpdResponsable: config.rgpdResponsable,
      rgpdDpo: config.rgpdDpo,
      textoAvisoLegal: config.textoAvisoLegal,
      textoPoliticaPrivacidad: config.textoPoliticaPrivacidad,
      textoPoliticaCookies: config.textoPoliticaCookies,
      textoConsentimiento: config.textoConsentimiento,
      consentimientoRequerido: config.consentimientoRequerido,
      consentimientoVersion: config.consentimientoVersion,
      retencionDatosMeses: config.retencionDatosMeses,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar configuración RGPD:', error);
    res.status(500).json({ error: 'Error al actualizar configuración RGPD' });
  }
}

/**
 * Obtener la configuración de copias de seguridad
 * GET /api/configuracion/backup
 */
export async function obtenerConfigBackup(req: Request, res: Response) {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: CONFIG_ID },
      select: {
        backupPeriodicidad: true,
        backupCifrado: true,
        backupUltimaEjecucion: true,
      },
    });

    res.json({
      backupPeriodicidad: config?.backupPeriodicidad || 'diaria',
      backupCifrado: config?.backupCifrado ?? false,
      backupUltimaEjecucion: config?.backupUltimaEjecucion ?? null,
    });
  } catch (error) {
    console.error('Error al obtener configuración de copias de seguridad:', error);
    res.status(500).json({ error: 'Error al obtener configuración de copias de seguridad' });
  }
}

/**
 * Actualizar la configuración de copias de seguridad
 * PUT /api/configuracion/backup
 */
export async function actualizarConfigBackup(req: Request, res: Response) {
  try {
    const datos = configBackupSchema.parse(req.body);
    const { password, ...resto } = datos;

    const dataParaPrisma: Record<string, unknown> = { ...resto };

    if (resto.backupCifrado) {
      if (password) {
        const { clave, salt } = derivarClaveCifrado(password);
        dataParaPrisma.backupCifradoClave = clave;
        dataParaPrisma.backupCifradoSalt = salt;
      } else {
        const actual = await prisma.configuracion.findUnique({
          where: { id: CONFIG_ID },
          select: { backupCifradoClave: true },
        });
        if (!actual?.backupCifradoClave) {
          return res.status(400).json({
            error: 'Datos inválidos',
            mensaje: 'Hace falta una contraseña para activar el cifrado de copias de seguridad',
          });
        }
      }
    } else if (resto.backupCifrado === false) {
      dataParaPrisma.backupCifradoClave = null;
      dataParaPrisma.backupCifradoSalt = null;
    }

    const config = await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...dataParaPrisma },
      update: dataParaPrisma,
    });

    res.json({
      backupPeriodicidad: config.backupPeriodicidad,
      backupCifrado: config.backupCifrado,
      backupUltimaEjecucion: config.backupUltimaEjecucion,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar configuración de copias de seguridad:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de copias de seguridad' });
  }
}
