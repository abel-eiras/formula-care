import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verificarDisponibilidad } from '../services/disponibilidadService.js';

/**
 * Obtener todas las solicitudes con filtro opcional por estado
 * GET /api/solicitudes?estado=pendiente
 */
export async function obtenerSolicitudes(req: Request, res: Response) {
  try {
    const { estado } = req.query;

    const where = estado
      ? {
          estado: estado as string,
        }
      : {};

    const solicitudes = await prisma.solicitudCita.findMany({
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
        cita: {
          select: {
            id: true,
            titulo: true,
            fecha: true,
            hora: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
}

/**
 * Obtener una solicitud específica por ID
 * GET /api/solicitudes/:id
 */
export async function obtenerSolicitud(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const solicitud = await prisma.solicitudCita.findUnique({
      where: { id },
      include: {
        paciente: true,
        cita: true,
      },
    });

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
}

/**
 * Aprobar una solicitud pendiente
 * POST /api/solicitudes/:id/aprobar
 */
export async function aprobarSolicitud(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Obtener la solicitud
    const solicitud = await prisma.solicitudCita.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({
        error: `La solicitud ya está ${solicitud.estado}`,
      });
    }

    // Verificar disponibilidad (por si acaso cambió desde que se creó)
    const disponible = await verificarDisponibilidad(
      solicitud.tipo,
      solicitud.fecha,
      solicitud.hora
    );

    if (!disponible) {
      return res.status(400).json({
        error: 'La fecha y hora ya no están disponibles',
      });
    }

    // Buscar o crear paciente
    let paciente = solicitud.paciente;

    if (!paciente) {
      // Si no tiene paciente asociado, buscarlo por email o crearlo
      paciente = await prisma.paciente.findFirst({
        where: {
          email: solicitud.emailCliente,
        },
      });

      if (!paciente) {
        // Crear paciente con datos de la solicitud
        paciente = await prisma.paciente.create({
          data: {
            name: solicitud.nombreCliente,
            email: solicitud.emailCliente,
            phone: solicitud.telefonoCliente,
            age: 0, // Se puede actualizar después
            sex: 'O', // Por defecto "Otro"
          },
        });
      }
    }

    // Crear la cita
    const cita = await prisma.cita.create({
      data: {
        titulo: `Cita ${solicitud.tipo} - ${solicitud.nombreCliente}`,
        pacienteId: paciente.id,
        fecha: solicitud.fecha,
        hora: solicitud.hora,
        tipo: solicitud.tipo,
        notas: solicitud.notas || `Solicitud aprobada desde panel de administración`,
      },
    });

    // Actualizar solicitud
    const solicitudActualizada = await prisma.solicitudCita.update({
      where: { id },
      data: {
        estado: 'aprobada',
        pacienteId: paciente.id,
        citaId: cita.id,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        cita: {
          select: {
            id: true,
            titulo: true,
            fecha: true,
            hora: true,
          },
        },
      },
    });

    // Buscar notificaciones relacionadas con esta solicitud y actualizarlas
    const notificacionesRelacionadas = await prisma.notificacion.findMany({
      where: {
        pacienteId: paciente.id,
        tipo: 'cita',
        mensaje: {
          contains: `solicitado una cita ${solicitud.tipo}`,
        },
      },
    });

    if (notificacionesRelacionadas.length > 0) {
      // Actualizar notificaciones existentes
      await prisma.notificacion.updateMany({
        where: {
          id: {
            in: notificacionesRelacionadas.map((n) => n.id),
          },
        },
        data: {
          citaId: cita.id,
          titulo: `Cita ${solicitud.tipo} aprobada`,
          mensaje: `Se ha aprobado la solicitud de cita ${solicitud.tipo} para ${solicitud.nombreCliente} el ${solicitud.fecha} a las ${solicitud.hora}`,
          leida: false,
        },
      });
    } else {
      // Crear nueva notificación
      await prisma.notificacion.create({
        data: {
          tipo: 'cita',
          pacienteId: paciente.id,
          citaId: cita.id,
          titulo: `Cita ${solicitud.tipo} aprobada`,
          mensaje: `Se ha aprobado la solicitud de cita ${solicitud.tipo} para ${solicitud.nombreCliente} el ${solicitud.fecha} a las ${solicitud.hora}`,
          canal: 'interno',
          enviada: false,
          leida: false,
        },
      });
    }

    // TODO: Enviar email de confirmación (se implementará en Fase 5)

    res.json({
      solicitud: solicitudActualizada,
      cita,
      mensaje: 'Solicitud aprobada correctamente',
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
}

/**
 * Rechazar una solicitud pendiente
 * POST /api/solicitudes/:id/rechazar
 */
export async function rechazarSolicitud(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { motivo } = req.body; // Opcional: motivo del rechazo

    // Obtener la solicitud
    const solicitud = await prisma.solicitudCita.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({
        error: `La solicitud ya está ${solicitud.estado}`,
      });
    }

    // Actualizar solicitud
    const solicitudActualizada = await prisma.solicitudCita.update({
      where: { id },
      data: {
        estado: 'rechazada',
        notas: motivo
          ? `${solicitud.notas || ''}\n[Motivo del rechazo: ${motivo}]`.trim()
          : solicitud.notas,
      },
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
    });

    // Marcar notificaciones relacionadas como leídas
    if (solicitud.pacienteId) {
      await prisma.notificacion.updateMany({
        where: {
          pacienteId: solicitud.pacienteId,
          tipo: 'cita',
          mensaje: {
            contains: `solicitado una cita ${solicitud.tipo}`,
          },
          leida: false,
        },
        data: {
          leida: true,
          fechaLectura: new Date(),
        },
      });
    }

    // TODO: Opcional - enviar email al cliente informando del rechazo

    res.json({
      solicitud: solicitudActualizada,
      mensaje: 'Solicitud rechazada correctamente',
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
}
