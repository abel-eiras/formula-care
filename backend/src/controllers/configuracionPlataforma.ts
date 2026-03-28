/**
 * Configuración de plataforma (solo superadmin)
 * SMTP/email por defecto para todas las farmacias
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../services/encryptionService.js';
import {
  enviarCorreoPruebaPlataformaConDiagnostico,
  type ResultadoDiagnosticoEmail,
} from '../services/emailService.js';

const actualizarConfiguracionPlataformaSchema = z.object({
  emailProvider: z.enum(['smtp', 'resend']).optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpAcceptSelfSigned: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(), // Solo se envía al guardar; no se devuelve
  smtpFrom: z.string().email().optional().or(z.literal('')).nullable(),
  resendApiKey: z.string().optional().nullable(),
  emailNombreRemitente: z.string().optional().nullable(),
});

const enviarPruebaSchema = z.object({
  email: z.string().email('Email de destino inválido'),
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
        smtpAcceptSelfSigned: false,
        smtpUser: null,
        smtpPass: null, // Nunca devolver contraseña
        smtpFrom: null,
        resendApiKey: null,
        emailNombreRemitente: null,
      });
    }

    const safeConfig = config as Record<string, unknown>;
    res.json({
      id: config.id,
      emailProvider: config.emailProvider,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpAcceptSelfSigned: safeConfig.smtpAcceptSelfSigned === true,
      smtpUser: config.smtpUser,
      smtpPass: null, // No exponer en API
      smtpFrom: config.smtpFrom,
      resendApiKey: config.resendApiKey ? '********' : null, // Máscara si existe
      emailNombreRemitente: config.emailNombreRemitente,
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener configuración plataforma:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'No se pudo cargar la configuración. Comprueba que las migraciones de la BD se hayan aplicado en el deploy.',
    });
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
    data.smtpAcceptSelfSigned = datos.smtpAcceptSelfSigned ?? false;
    if (datos.smtpUser !== undefined) data.smtpUser = datos.smtpUser || null;
    if (datos.smtpPass !== undefined && datos.smtpPass !== '') data.smtpPass = encrypt(datos.smtpPass);
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
          smtpAcceptSelfSigned: datos.smtpAcceptSelfSigned ?? false,
          smtpUser: datos.smtpUser ?? null,
          smtpPass: datos.smtpPass ? encrypt(datos.smtpPass) : null,
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

/** Timeout en ms para el envío del correo de prueba (conexión TLS + verify + send puede tardar en servidores lentos) */
const TIMEOUT_ENVIO_PRUEBA_MS = 30_000;

/** Resultado de diagnóstico cuando hay timeout: el cliente recibe 200 y puede mostrar el mensaje concreto */
const resultadoTimeout: ResultadoDiagnosticoEmail = {
  enviado: false,
  pasos: [
    {
      paso: 'Conectar y enviar correo',
      ok: false,
      mensaje: 'El servidor de correo no respondió a tiempo.',
      sugerencia:
        'Comprueba primero el host y el puerto (que el servidor sea accesible). Si la conexión es correcta, revisa el usuario y la contraseña SMTP.',
    },
  ],
  mensajeError: 'El servidor de correo no respondió a tiempo.',
  sugerencia:
    'Comprueba primero el host y el puerto. Si ya conecta, revisa el usuario y la contraseña.',
};

/**
 * POST /api/admin/configuracion-plataforma/enviar-prueba
 * Envía un correo de prueba a la dirección indicada (superadmin)
 * Siempre responde 200 con diagnóstico (pasos, mensaje, sugerencia) para que el cliente no pierda el detalle
 */
export async function enviarPruebaEmail(req: Request, res: Response) {
  try {
    const { email } = enviarPruebaSchema.parse(req.body);
    const resultado = await Promise.race([
      enviarCorreoPruebaPlataformaConDiagnostico(email),
      new Promise<ResultadoDiagnosticoEmail>((resolve) =>
        setTimeout(() => resolve(resultadoTimeout), TIMEOUT_ENVIO_PRUEBA_MS)
      ),
    ]);
    if (resultado.enviado) {
      return res.json({
        mensaje: 'Correo de prueba enviado correctamente',
        enviado: true,
        pasos: resultado.pasos,
      });
    }
    return res.json({
      mensaje: resultado.mensajeError ?? 'No se pudo enviar el correo',
      enviado: false,
      pasos: resultado.pasos,
      mensajeError: resultado.mensajeError,
      sugerencia: resultado.sugerencia,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Email inválido', detalles: error.errors });
    }
    console.error('Error al enviar correo de prueba:', error);
    const resultadoError: ResultadoDiagnosticoEmail = {
      enviado: false,
      pasos: [
        {
          paso: 'Envío',
          ok: false,
          mensaje: 'Error inesperado del servidor.',
          sugerencia:
            'Comprueba primero los datos del servidor (host y puerto). Si ya conecta, revisa el usuario y la contraseña. Si el problema continúa, revisa los logs del servidor.',
        },
      ],
      mensajeError: 'Error inesperado del servidor.',
      sugerencia:
        'Comprueba los datos del servidor (host, puerto) y, si la conexión es correcta, el usuario y la contraseña.',
    };
    return res.json({
      mensaje: resultadoError.mensajeError,
      enviado: false,
      pasos: resultadoError.pasos,
      mensajeError: resultadoError.mensajeError,
      sugerencia: resultadoError.sugerencia,
    });
  }
}
