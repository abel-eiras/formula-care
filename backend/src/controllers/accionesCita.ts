/**
 * Controlador de Acciones de Cita
 * Rutas públicas para confirmar, modificar y cancelar citas desde emails
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verificarToken, marcarTokenUsado } from '../services/tokenService.js';
import { enviarCancelacionCita } from '../services/emailService.js';
import { getParamString } from '../lib/queryHelpers.js';

// ==========================================
// ESQUEMAS DE VALIDACIÓN
// ==========================================

const modificarCitaSchema = z.object({
  fecha: z.string().min(1, 'Fecha requerida'),
  hora: z.string().min(1, 'Hora requerida'),
});

const cancelarCitaSchema = z.object({
  motivo: z.string().optional(),
});

// ==========================================
// CONTROLADORES
// ==========================================

/**
 * Verifica un token y retorna los datos de la cita
 * GET /api/public/cita/verificar/:token
 */
export async function verificarTokenCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const resultado = await verificarToken(token);

    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ 
        valido: false, 
        error: resultado.error 
      });
    }

    const { cita, paciente, tipo, expiraEn } = resultado.data;

    res.json({
      valido: true,
      tipo,
      expiraEn,
      cita: {
        id: cita.id,
        titulo: cita.titulo,
        fecha: cita.fecha,
        hora: cita.hora,
        tipo: cita.tipo,
        estado: cita.estado,
        notas: cita.notas,
      },
      paciente: {
        nombre: paciente.name,
        email: paciente.email,
        telefono: paciente.phone,
      },
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
}

/**
 * Confirma la asistencia a una cita
 * POST /api/public/cita/confirmar/:token
 */
export async function confirmarCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const resultado = await verificarToken(token);

    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ 
        success: false, 
        error: resultado.error 
      });
    }

    const { cita, tipo } = resultado.data;

    // Verificar que el token sea del tipo correcto
    if (tipo !== 'confirmar') {
      return res.status(400).json({ 
        success: false, 
        error: 'Token no válido para esta acción' 
      });
    }

    // Verificar que la cita no esté ya cancelada
    if (cita.estado === 'cancelada') {
      return res.status(400).json({ 
        success: false, 
        error: 'Esta cita ya ha sido cancelada' 
      });
    }

    // Actualizar estado de la cita
    await prisma.cita.update({
      where: { id: cita.id },
      data: { estado: 'confirmada' },
    });

    // Marcar token como usado
    await marcarTokenUsado(token);

    res.json({
      success: true,
      message: 'Tu asistencia ha sido confirmada correctamente',
      cita: {
        fecha: cita.fecha,
        hora: cita.hora,
        tipo: cita.tipo,
      },
    });
  } catch (error) {
    console.error('Error al confirmar cita:', error);
    res.status(500).json({ error: 'Error al confirmar cita' });
  }
}

/**
 * Obtiene datos para modificar una cita
 * GET /api/public/cita/modificar/:token
 */
export async function obtenerDatosModificacion(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const resultado = await verificarToken(token);

    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ 
        valido: false, 
        error: resultado.error 
      });
    }

    const { cita, paciente, tipo } = resultado.data;

    if (tipo !== 'modificar') {
      return res.status(400).json({ 
        valido: false, 
        error: 'Token no válido para esta acción' 
      });
    }

    if (cita.estado === 'cancelada') {
      return res.status(400).json({ 
        valido: false, 
        error: 'Esta cita ya ha sido cancelada' 
      });
    }

    // Obtener horarios disponibles (simplificado - en producción sería más complejo)
    const configCalendario = await prisma.configuracionCalendario.findUnique({
      where: { id: 'calendario' },
    });

    res.json({
      valido: true,
      cita: {
        id: cita.id,
        titulo: cita.titulo,
        fecha: cita.fecha,
        hora: cita.hora,
        tipo: cita.tipo,
      },
      paciente: {
        nombre: paciente.name,
      },
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
 * Modifica una cita
 * POST /api/public/cita/modificar/:token
 */
export async function modificarCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const validacion = modificarCitaSchema.safeParse(req.body);
    if (!validacion.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        detalles: validacion.error.errors 
      });
    }

    const resultado = await verificarToken(token);

    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ 
        success: false, 
        error: resultado.error 
      });
    }

    const { cita, tipo } = resultado.data;

    if (tipo !== 'modificar') {
      return res.status(400).json({ 
        success: false, 
        error: 'Token no válido para esta acción' 
      });
    }

    if (cita.estado === 'cancelada') {
      return res.status(400).json({ 
        success: false, 
        error: 'Esta cita ya ha sido cancelada' 
      });
    }

    const { fecha, hora } = validacion.data;

    // Actualizar la cita
    await prisma.cita.update({
      where: { id: cita.id },
      data: { 
        fecha, 
        hora,
        estado: 'pendiente', // Vuelve a pendiente tras modificación
        confirmacionEnviada: false, // Se enviará nuevo email
      },
    });

    // Marcar token como usado
    await marcarTokenUsado(token);

    res.json({
      success: true,
      message: 'Tu cita ha sido modificada correctamente',
      cita: {
        fecha,
        hora,
        tipo: cita.tipo,
      },
    });
  } catch (error) {
    console.error('Error al modificar cita:', error);
    res.status(500).json({ error: 'Error al modificar cita' });
  }
}

/**
 * Cancela una cita
 * POST /api/public/cita/cancelar/:token
 */
export async function cancelarCita(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const validacion = cancelarCitaSchema.safeParse(req.body);
    const motivo = validacion.success ? validacion.data.motivo : undefined;

    const resultado = await verificarToken(token);

    if (!resultado.valido || !resultado.data) {
      return res.status(400).json({ 
        success: false, 
        error: resultado.error 
      });
    }

    const { cita, paciente, tipo } = resultado.data;

    if (tipo !== 'cancelar') {
      return res.status(400).json({ 
        success: false, 
        error: 'Token no válido para esta acción' 
      });
    }

    if (cita.estado === 'cancelada') {
      return res.status(400).json({ 
        success: false, 
        error: 'Esta cita ya ha sido cancelada' 
      });
    }

    // Actualizar estado de la cita
    await prisma.cita.update({
      where: { id: cita.id },
      data: { 
        estado: 'cancelada',
        notas: motivo 
          ? `${cita.notas ? cita.notas + '\n' : ''}[Cancelada por paciente] ${motivo}`
          : `${cita.notas ? cita.notas + '\n' : ''}[Cancelada por paciente]`,
      },
    });

    // Marcar token como usado
    await marcarTokenUsado(token);

    // Enviar confirmación de cancelación por email
    if (paciente.email) {
      await enviarCancelacionCita(paciente.email, {
        tipo: cita.tipo,
        fecha: cita.fecha,
        hora: cita.hora,
        nombreCliente: paciente.name,
        motivoRechazo: motivo || 'Cancelada a solicitud del paciente',
        citaId: cita.id,
      });
    }

    res.json({
      success: true,
      message: 'Tu cita ha sido cancelada correctamente',
    });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ error: 'Error al cancelar cita' });
  }
}
