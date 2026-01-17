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
 * Actualizar credenciales OAuth de Google Calendar
 */
export async function actualizarCredencialesGoogle(req: Request, res: Response) {
  try {
    const schema = z.object({
      googleClientId: z.string().min(1, 'Client ID es requerido'),
      googleClientSecret: z.string().min(1, 'Client Secret es requerido'),
      googleRedirectUri: z.string().url().optional(),
    });

    const datos = schema.parse(req.body);

    // Si no se proporciona redirectUri, calcularlo automáticamente
    let redirectUri = datos.googleRedirectUri;
    if (!redirectUri) {
      const protocol = req.protocol;
      const host = req.get('host');
      redirectUri = `${protocol}://${host}/api/google-calendar/callback`;
    }

    const config = await prisma.configuracion.update({
      where: { id: 'config' },
      data: {
        googleClientId: datos.googleClientId,
        googleClientSecret: datos.googleClientSecret,
        googleRedirectUri: redirectUri,
      },
    });

    res.json({
      message: 'Credenciales guardadas correctamente',
      redirectUri: redirectUri, // Devolver la URI calculada para mostrarla al usuario
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar credenciales Google:', error);
    res.status(500).json({ error: 'Error al actualizar credenciales de Google Calendar' });
  }
}

/**
 * Obtener redirect URI sugerido
 */
export async function obtenerRedirectUri(req: Request, res: Response) {
  try {
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/google-calendar/callback`;
    
    res.json({ redirectUri });
  } catch (error) {
    console.error('Error al obtener redirect URI:', error);
    res.status(500).json({ error: 'Error al obtener redirect URI' });
  }
}
