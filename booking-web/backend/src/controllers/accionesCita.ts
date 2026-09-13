/**
 * Controlador de Acciones de Cita
 * Rutas públicas para confirmar, modificar y cancelar citas desde enlaces de email.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verificarToken, marcarTokenUsado } from '../services/tokenService.js';
import { enviarCancelacionCita, enviarModificacionCita } from '../services/emailService.js';
import { decryptContactoData } from '../services/encryptionService.js';
import { verificarDisponibilidad } from '../services/disponibilidadService.js';
import { getParamString } from '../lib/queryHelpers.js';

const modificarCitaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida'),
});

const cancelarCitaSchema = z.object({
  motivo: z.string().optional(),
});

/**
 * GET /api/public/cita/verificar/:token
 */
export async function verificarTokenCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    const resultado = await verificarToken(token);
    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ valido: false, error: resultado.error });
    }

    const { cita, tipo, expiraEn } = resultado.data;
    const contacto = decryptContactoData({
      nombreCliente: cita.nombreCliente,
      emailCliente: cita.emailCliente,
      telefonoCliente: cita.telefonoCliente,
    });

    res.json({
      valido: true,
      tipo,
      expiraEn,
      cita: {
        id: cita.id,
        fecha: cita.fecha,
        hora: cita.hora,
        tipo: cita.tipo,
        estado: cita.estado,
        notas: cita.notas,
      },
      paciente: {
        nombre: contacto.nombreCliente,
        email: contacto.emailCliente,
        telefono: contacto.telefonoCliente,
      },
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
}

/**
 * POST /api/public/cita/confirmar/:token
 */
export async function confirmarCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) return res.status(400).json({ success: false, error: 'Token requerido' });

    const resultado = await verificarToken(token);
    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ success: false, error: resultado.error });
    }

    const { cita, tipo } = resultado.data;

    if (tipo !== 'confirmar') {
      return res.status(400).json({ success: false, error: 'Token no válido para esta acción' });
    }
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ success: false, error: 'Esta cita ya ha sido cancelada' });
    }

    await prisma.cita.update({ where: { id: cita.id }, data: { estado: 'confirmada' } });
    await marcarTokenUsado(token);

    res.json({
      success: true,
      message: 'Tu asistencia ha sido confirmada correctamente',
      cita: { fecha: cita.fecha, hora: cita.hora, tipo: cita.tipo },
    });
  } catch (error) {
    console.error('Error al confirmar cita:', error);
    res.status(500).json({ error: 'Error al confirmar cita' });
  }
}

/**
 * GET /api/public/cita/modificar/:token
 */
export async function obtenerDatosModificacion(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) return res.status(400).json({ valido: false, error: 'Token requerido' });

    const resultado = await verificarToken(token);
    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ valido: false, error: resultado.error });
    }

    const { cita, tipo } = resultado.data;

    if (tipo !== 'modificar') {
      return res.status(400).json({ valido: false, error: 'Token no válido para esta acción' });
    }
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ valido: false, error: 'Esta cita ya ha sido cancelada' });
    }

    const contacto = decryptContactoData({ nombreCliente: cita.nombreCliente });
    const configCalendario = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });

    res.json({
      valido: true,
      cita: { id: cita.id, fecha: cita.fecha, hora: cita.hora, tipo: cita.tipo },
      paciente: { nombre: contacto.nombreCliente },
      configuracion: {
        horariosPorTipo: configCalendario?.horariosPorTipo ? JSON.parse(configCalendario.horariosPorTipo) : {},
        fechasBloqueadas: configCalendario?.fechasBloqueadas ? JSON.parse(configCalendario.fechasBloqueadas) : [],
      },
    });
  } catch (error) {
    console.error('Error al obtener datos de modificación:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
}

/**
 * POST /api/public/cita/modificar/:token
 */
export async function modificarCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) return res.status(400).json({ success: false, error: 'Token requerido' });

    const validacion = modificarCitaSchema.safeParse(req.body);
    if (!validacion.success) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: validacion.error.errors });
    }

    const resultado = await verificarToken(token);
    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ success: false, error: resultado.error });
    }

    const { cita, tipo } = resultado.data;

    if (tipo !== 'modificar') {
      return res.status(400).json({ success: false, error: 'Token no válido para esta acción' });
    }
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ success: false, error: 'Esta cita ya ha sido cancelada' });
    }

    const { fecha, hora } = validacion.data;

    // El tipo base (sin "evento:") es el que se usa para comprobar disponibilidad estándar;
    // los eventos personalizados no admiten reprogramación por autoservicio.
    if (cita.tipo.startsWith('evento:')) {
      return res.status(400).json({ success: false, error: 'Las citas de eventos no se pueden reprogramar. Contacta con la farmacia.' });
    }

    const disponible = await verificarDisponibilidad(cita.tipo, fecha, hora);
    if (!disponible) {
      return res.status(400).json({ success: false, error: 'La fecha y hora seleccionadas no están disponibles' });
    }

    await prisma.cita.update({
      where: { id: cita.id },
      data: { fecha, hora, estado: 'pendiente', confirmacionEnviada: false },
    });

    await marcarTokenUsado(token);

    const contacto = decryptContactoData({ nombreCliente: cita.nombreCliente, emailCliente: cita.emailCliente });
    if (contacto.emailCliente) {
      enviarModificacionCita(contacto.emailCliente, {
        citaId: cita.id,
        tipo: cita.tipo,
        fecha,
        hora,
        nombreCliente: contacto.nombreCliente,
      }).catch((err) => console.error('Error al enviar email de modificación:', err));
    }

    res.json({ success: true, message: 'Tu cita ha sido modificada correctamente', cita: { fecha, hora, tipo: cita.tipo } });
  } catch (error) {
    console.error('Error al modificar cita:', error);
    res.status(500).json({ error: 'Error al modificar cita' });
  }
}

/**
 * POST /api/public/cita/cancelar/:token
 */
export async function cancelarCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) return res.status(400).json({ success: false, error: 'Token requerido' });

    const validacion = cancelarCitaSchema.safeParse(req.body);
    const motivo = validacion.success ? validacion.data.motivo : undefined;

    const resultado = await verificarToken(token);
    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ success: false, error: resultado.error });
    }

    const { cita, tipo } = resultado.data;

    if (tipo !== 'cancelar') {
      return res.status(400).json({ success: false, error: 'Token no válido para esta acción' });
    }
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ success: false, error: 'Esta cita ya ha sido cancelada' });
    }

    await prisma.cita.update({
      where: { id: cita.id },
      data: {
        estado: 'cancelada',
        notas: motivo ? `${cita.notas ? cita.notas + '\n' : ''}[Cancelada por paciente] ${motivo}` : `${cita.notas ? cita.notas + '\n' : ''}[Cancelada por paciente]`,
      },
    });

    await marcarTokenUsado(token);

    const contacto = decryptContactoData({ nombreCliente: cita.nombreCliente, emailCliente: cita.emailCliente });
    if (contacto.emailCliente) {
      await enviarCancelacionCita(contacto.emailCliente, {
        tipo: cita.tipo,
        fecha: cita.fecha,
        hora: cita.hora,
        nombreCliente: contacto.nombreCliente,
        motivoRechazo: motivo || 'Cancelada a solicitud del paciente',
      });
    }

    res.json({ success: true, message: 'Tu cita ha sido cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ error: 'Error al cancelar cita' });
  }
}
