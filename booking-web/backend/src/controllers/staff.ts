/**
 * Controlador del panel de personal (staff): login, bandeja de solicitudes
 * pendientes, aprobar/rechazar, y ajustes (Configuracion / ConfiguracionCalendario / Eventos).
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verificarPasswordStaff, generarSesionStaff, getStaffCookieOptions, STAFF_COOKIE_NAME } from '../middleware/staffAuth.js';
import { decryptContactoData, encrypt } from '../services/encryptionService.js';
import { enviarConfirmacionCita, enviarRechazoSolicitud } from '../services/emailService.js';
import { verificarDisponibilidad } from '../services/disponibilidadService.js';
import { getParamString } from '../lib/queryHelpers.js';

// ==========================================
// LOGIN
// ==========================================

const loginSchema = z.object({ password: z.string().min(1) });

export async function loginStaff(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }

  if (!verificarPasswordStaff(parsed.data.password)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = generarSesionStaff();
  res.cookie(STAFF_COOKIE_NAME, token, getStaffCookieOptions());
  res.json({ success: true });
}

export async function logoutStaff(_req: Request, res: Response) {
  res.clearCookie(STAFF_COOKIE_NAME, { path: '/' });
  res.json({ success: true });
}

export async function sesionStaff(_req: Request, res: Response) {
  // Si llega aquí es porque el middleware requireStaff ya validó la cookie
  res.json({ autenticado: true });
}

// ==========================================
// SOLICITUDES
// ==========================================

function serializarSolicitud(s: {
  id: string;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  tipo: string;
  fecha: string;
  hora: string;
  estado: string;
  notas: string | null;
  motivoRechazo: string | null;
  citaId: string | null;
  createdAt: Date;
}) {
  const contacto = decryptContactoData({
    nombreCliente: s.nombreCliente,
    emailCliente: s.emailCliente,
    telefonoCliente: s.telefonoCliente,
  });
  return {
    id: s.id,
    nombreCliente: contacto.nombreCliente,
    emailCliente: contacto.emailCliente,
    telefonoCliente: contacto.telefonoCliente,
    tipo: s.tipo,
    fecha: s.fecha,
    hora: s.hora,
    estado: s.estado,
    notas: s.notas,
    motivoRechazo: s.motivoRechazo,
    citaId: s.citaId,
    createdAt: s.createdAt,
  };
}

/**
 * GET /api/staff/solicitudes?estado=pendiente
 */
export async function listarSolicitudes(req: Request, res: Response) {
  try {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const solicitudes = await prisma.solicitudCita.findMany({
      where: estado ? { estado } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(solicitudes.map(serializarSolicitud));
  } catch (error) {
    console.error('Error al listar solicitudes:', error);
    res.status(500).json({ error: 'Error al listar solicitudes' });
  }
}

/**
 * POST /api/staff/solicitudes/:id/aprobar
 * Crea (o actualiza) la Cita local de booking-web y envía el email de confirmación.
 */
export async function aprobarSolicitud(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id)!;
    const solicitud = await prisma.solicitudCita.findUnique({ where: { id } });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ error: `La solicitud ya está en estado "${solicitud.estado}"` });
    }

    const eventoId = solicitud.tipo.startsWith('evento:') ? solicitud.tipo.split(':')[1] : undefined;
    const tipoBase = solicitud.tipo.startsWith('evento:') ? 'evento' : solicitud.tipo;

    const disponible = await verificarDisponibilidad(tipoBase, solicitud.fecha, solicitud.hora, eventoId);
    if (!disponible) {
      return res.status(400).json({ error: 'Esa fecha/hora ya no está disponible (puede haberse ocupado mientras tanto)' });
    }

    let duracion = 30;
    if (!eventoId) {
      const configCalendario = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });
      const duracionPorTipo = configCalendario ? (JSON.parse(configCalendario.duracionPorTipo || '{}') as Record<string, number>) : {};
      duracion = duracionPorTipo[tipoBase] || 30;
    } else {
      const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
      duracion = evento?.duracion || 60;
    }

    const cita = await prisma.cita.create({
      data: {
        nombreCliente: solicitud.nombreCliente,
        emailCliente: solicitud.emailCliente,
        emailClienteHash: solicitud.emailClienteHash,
        telefonoCliente: solicitud.telefonoCliente,
        fecha: solicitud.fecha,
        hora: solicitud.hora,
        tipo: solicitud.tipo,
        duracion,
        estado: 'pendiente',
        notas: solicitud.notas,
      },
    });

    const solicitudActualizada = await prisma.solicitudCita.update({
      where: { id: solicitud.id },
      data: { estado: 'aprobada', citaId: cita.id },
    });

    const contacto = decryptContactoData({ nombreCliente: solicitud.nombreCliente, emailCliente: solicitud.emailCliente });
    if (contacto.emailCliente) {
      await enviarConfirmacionCita(contacto.emailCliente, {
        citaId: cita.id,
        tipo: solicitud.tipo,
        fecha: solicitud.fecha,
        hora: solicitud.hora,
        nombreCliente: contacto.nombreCliente,
      });
    }

    res.json({ solicitud: serializarSolicitud(solicitudActualizada), cita: { id: cita.id, fecha: cita.fecha, hora: cita.hora, tipo: cita.tipo }, mensaje: 'Solicitud aprobada' });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
}

const rechazarSchema = z.object({ motivo: z.string().optional() });

/**
 * POST /api/staff/solicitudes/:id/rechazar
 */
export async function rechazarSolicitud(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id)!;
    const { motivo } = rechazarSchema.parse(req.body ?? {});

    const solicitud = await prisma.solicitudCita.findUnique({ where: { id } });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ error: `La solicitud ya está en estado "${solicitud.estado}"` });
    }

    const solicitudActualizada = await prisma.solicitudCita.update({
      where: { id: solicitud.id },
      data: { estado: 'rechazada', motivoRechazo: motivo },
    });

    const contacto = decryptContactoData({ nombreCliente: solicitud.nombreCliente, emailCliente: solicitud.emailCliente });
    if (contacto.emailCliente) {
      await enviarRechazoSolicitud(contacto.emailCliente, {
        tipo: solicitud.tipo,
        fecha: solicitud.fecha,
        hora: solicitud.hora,
        nombreCliente: contacto.nombreCliente,
        motivo,
      });
    }

    res.json({ solicitud: serializarSolicitud(solicitudActualizada), mensaje: 'Solicitud rechazada' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
}

// ==========================================
// CONFIGURACIÓN
// ==========================================

export async function obtenerConfiguracion(_req: Request, res: Response) {
  try {
    const config = await prisma.configuracion.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      return res.json(null);
    }
    // No exponer la contraseña SMTP ni la API key de Resend en claro
    const { smtpPass, resendApiKey, ...resto } = config;
    res.json({ ...resto, smtpPassConfigurada: !!smtpPass, resendApiKeyConfigurada: !!resendApiKey });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
}

const configuracionSchema = z.object({
  farmaciaNombre: z.string().optional().nullable(),
  farmaciaDireccion: z.string().optional().nullable(),
  farmaciaCiudad: z.string().optional().nullable(),
  farmaciaTelefono: z.string().optional().nullable(),
  farmaciaEmail: z.string().optional().nullable(),
  farmaciaWeb: z.string().optional().nullable(),
  farmaciaWhatsapp: z.string().optional().nullable(),
  farmaciaLogo: z.string().optional().nullable(),
  temaActivo: z.string().optional().nullable(),
  coloresMarca: z.string().optional().nullable(),
  textoAvisoLegal: z.string().optional().nullable(),
  textoPoliticaPrivacidad: z.string().optional().nullable(),
  textoPoliticaCookies: z.string().optional().nullable(),
  emailProvider: z.enum(['smtp', 'resend']).optional(),
  resendApiKey: z.string().optional().nullable(),
  emailRemitente: z.string().optional().nullable(),
  emailNombreRemitente: z.string().optional().nullable(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpAcceptSelfSigned: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  recaptchaSiteKey: z.string().optional().nullable(),
});

export async function actualizarConfiguracion(req: Request, res: Response) {
  try {
    const datos = configuracionSchema.parse(req.body);

    const data: Record<string, unknown> = { ...datos };
    // No sobrescribir con placeholder si el frontend reenvía el marcador de "ya configurada"
    if (datos.smtpPass === '********') delete data.smtpPass;
    else if (datos.smtpPass) data.smtpPass = encrypt(datos.smtpPass);

    if (datos.resendApiKey === '********') delete data.resendApiKey;

    const config = await prisma.configuracion.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });

    const { smtpPass, resendApiKey, ...resto } = config;
    res.json({ ...resto, smtpPassConfigurada: !!smtpPass, resendApiKeyConfigurada: !!resendApiKey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
}

// ==========================================
// CONFIGURACIÓN DE CALENDARIO
// ==========================================

export async function obtenerConfiguracionCalendario(_req: Request, res: Response) {
  try {
    const config = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });
    if (!config) return res.json(null);
    res.json({
      ...config,
      horariosPorTipo: JSON.parse(config.horariosPorTipo),
      fechasBloqueadas: JSON.parse(config.fechasBloqueadas),
      horasBloqueadas: JSON.parse(config.horasBloqueadas),
      duracionPorTipo: JSON.parse(config.duracionPorTipo),
    });
  } catch (error) {
    console.error('Error al obtener configuración de calendario:', error);
    res.status(500).json({ error: 'Error al obtener configuración de calendario' });
  }
}

const configuracionCalendarioSchema = z.object({
  horariosPorTipo: z.record(z.record(z.array(z.string()))).optional(),
  fechasBloqueadas: z.array(z.string()).optional(),
  horasBloqueadas: z.record(z.array(z.string())).optional(),
  autoAceptar: z.boolean().optional(),
  duracionPorTipo: z.record(z.number()).optional(),
});

export async function actualizarConfiguracionCalendario(req: Request, res: Response) {
  try {
    const datos = configuracionCalendarioSchema.parse(req.body);

    const data: Record<string, unknown> = {};
    if (datos.horariosPorTipo !== undefined) data.horariosPorTipo = JSON.stringify(datos.horariosPorTipo);
    if (datos.fechasBloqueadas !== undefined) data.fechasBloqueadas = JSON.stringify(datos.fechasBloqueadas);
    if (datos.horasBloqueadas !== undefined) data.horasBloqueadas = JSON.stringify(datos.horasBloqueadas);
    if (datos.autoAceptar !== undefined) data.autoAceptar = datos.autoAceptar;
    if (datos.duracionPorTipo !== undefined) data.duracionPorTipo = JSON.stringify(datos.duracionPorTipo);

    const config = await prisma.configuracionCalendario.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        horariosPorTipo: JSON.stringify(datos.horariosPorTipo ?? {}),
        fechasBloqueadas: JSON.stringify(datos.fechasBloqueadas ?? []),
        horasBloqueadas: JSON.stringify(datos.horasBloqueadas ?? {}),
        autoAceptar: datos.autoAceptar ?? false,
        duracionPorTipo: JSON.stringify(datos.duracionPorTipo ?? {}),
      },
      update: data,
    });

    res.json({
      ...config,
      horariosPorTipo: JSON.parse(config.horariosPorTipo),
      fechasBloqueadas: JSON.parse(config.fechasBloqueadas),
      horasBloqueadas: JSON.parse(config.horasBloqueadas),
      duracionPorTipo: JSON.parse(config.duracionPorTipo),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar configuración de calendario:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de calendario' });
  }
}

// ==========================================
// EVENTOS (CRUD mínimo)
// ==========================================

export async function listarEventos(_req: Request, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(
      eventos.map((e) => ({ ...e, fechas: JSON.parse(e.fechas), horas: JSON.parse(e.horas) }))
    );
  } catch (error) {
    console.error('Error al listar eventos:', error);
    res.status(500).json({ error: 'Error al listar eventos' });
  }
}

const eventoSchema = z.object({
  nombre: z.string().min(1),
  activo: z.boolean().optional(),
  fechas: z.array(z.string()).default([]),
  horas: z.array(z.string()).default([]),
  duracion: z.number().int().positive().default(60),
  maxAsistentes: z.number().int().positive().default(1),
  descripcion: z.string().optional().nullable(),
});

export async function crearEvento(req: Request, res: Response) {
  try {
    const datos = eventoSchema.parse(req.body);
    const evento = await prisma.evento.create({
      data: { ...datos, fechas: JSON.stringify(datos.fechas), horas: JSON.stringify(datos.horas) },
    });
    res.status(201).json({ ...evento, fechas: JSON.parse(evento.fechas), horas: JSON.parse(evento.horas) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al crear evento:', error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
}

export async function actualizarEvento(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id)!;
    const datos = eventoSchema.partial().parse(req.body);
    const data: Record<string, unknown> = { ...datos };
    if (datos.fechas !== undefined) data.fechas = JSON.stringify(datos.fechas);
    if (datos.horas !== undefined) data.horas = JSON.stringify(datos.horas);

    const evento = await prisma.evento.update({ where: { id }, data });
    res.json({ ...evento, fechas: JSON.parse(evento.fechas), horas: JSON.parse(evento.horas) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
}

export async function eliminarEvento(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id)!;
    await prisma.evento.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
}
