/**
 * Configuración de plataforma (solo superadmin)
 * SMTP/email por defecto para todas las farmacias
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const actualizarConfiguracionPlataformaSchema = z.object({
  emailProvider: z.enum(['smtp', 'resend']).optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(), // Solo se envía al guardar; no se devuelve
  smtpFrom: z.string().email().optional().or(z.literal('')).nullable(),
  resendApiKey: z.string().optional().nullable(),
  emailNombreRemitente: z.string().optional().nullable(),
});

/**
 * GET /api/admin/configuracion-plataforma
 * Obtener configuración SMTP/email de la plataforma (sin contraseña)
 */
export async function obtenerConfiguracionPlataforma(req: Request, res: Response) {
  try {
    const config = await prisma.configuracionPlataforma.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!config) {
      return res.json({
        emailProvider: 'smtp',
        smtpHost: null,
        smtpPort: null,
        smtpSecure: false,
        smtpUser: null,
        smtpPass: null, // Nunca devolver contraseña
        smtpFrom: null,
        resendApiKey: null,
        emailNombreRemitente: null,
      });
    }

    res.json({
      id: config.id,
      emailProvider: config.emailProvider,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPass: null, // No exponer en API
      smtpFrom: config.smtpFrom,
      resendApiKey: config.resendApiKey ? '********' : null, // Máscara si existe
      emailNombreRemitente: config.emailNombreRemitente,
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener configuración plataforma:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/admin/configuracion-plataforma
 * Actualizar configuración SMTP/email de la plataforma
 */
export async function actualizarConfiguracionPlataforma(req: Request, res: Response) {
  try {
    const datos = actualizarConfiguracionPlataformaSchema.parse(req.body);

    const data: Record<string, unknown> = {};
    if (datos.emailProvider !== undefined) data.emailProvider = datos.emailProvider;
    if (datos.smtpHost !== undefined) data.smtpHost = datos.smtpHost || null;
    if (datos.smtpPort !== undefined) data.smtpPort = datos.smtpPort ?? null;
    if (datos.smtpSecure !== undefined) data.smtpSecure = datos.smtpSecure;
    if (datos.smtpUser !== undefined) data.smtpUser = datos.smtpUser || null;
    if (datos.smtpPass !== undefined && datos.smtpPass !== '') data.smtpPass = datos.smtpPass;
    if (datos.smtpFrom !== undefined) data.smtpFrom = datos.smtpFrom || null;
    if (datos.resendApiKey !== undefined) data.resendApiKey = datos.resendApiKey || null;
    if (datos.emailNombreRemitente !== undefined) data.emailNombreRemitente = datos.emailNombreRemitente || null;

    const config = await prisma.configuracionPlataforma.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    let result;
    if (config) {
      result = await prisma.configuracionPlataforma.update({
        where: { id: config.id },
        data: data as Parameters<typeof prisma.configuracionPlataforma.update>[0]['data'],
      });
    } else {
      result = await prisma.configuracionPlataforma.create({
        data: {
          emailProvider: (datos.emailProvider as 'smtp' | 'resend') || 'smtp',
          smtpHost: datos.smtpHost ?? null,
          smtpPort: datos.smtpPort ?? null,
          smtpSecure: datos.smtpSecure ?? false,
          smtpUser: datos.smtpUser ?? null,
          smtpPass: datos.smtpPass ?? null,
          smtpFrom: datos.smtpFrom ?? null,
          resendApiKey: datos.resendApiKey ?? null,
          emailNombreRemitente: datos.emailNombreRemitente ?? null,
        },
      });
    }

    // No devolver contraseña
    const { smtpPass: _, ...sinPassword } = result;
    res.json({
      ...sinPassword,
      smtpPass: null,
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar configuración plataforma:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
