import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verificarDisponibilidad } from '../services/disponibilidadService.js';
import { getQueryString, getParamString } from '../lib/queryHelpers.js';
import { obtenerFarmaciaIdRequerido, obtenerFarmaciaIdOpcional } from '../middleware/tenant.js';

/**
 * Obtener todas las solicitudes con filtro opcional por estado
 * GET /api/solicitudes?estado=pendiente
 */
export async function obtenerSolicitudes(req: Request, res: Response) {
  try {
    const farmaciaId = obtenerFarmaciaIdOpcional(req);
    const estado = getQueryString(req.query.estado);

    const where: Record<string, unknown> = {};
    if (farmaciaId) where.farmaciaId = farmaciaId;
    if (estado) where.estado = estado;

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
    const id = getParamString(req.params.id);

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
    const farmaciaId = obtenerFarmaciaIdRequerido(req);
    const id = getParamString(req.params.id);

    // Obtener la solicitud con el paciente incluido
    const solicitudConPaciente = await prisma.solicitudCita.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!solicitudConPaciente) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Verificar que la solicitud pertenece a esta farmacia
    if (solicitudConPaciente.farmaciaId !== farmaciaId) {
      return res.status(403).json({ error: 'No tienes acceso a esta solicitud' });
    }

    if (solicitudConPaciente.estado !== 'pendiente') {
      return res.status(400).json({
        error: `La solicitud ya está ${solicitudConPaciente.estado}`,
      });
    }

    // Verificar disponibilidad (por si acaso cambió desde que se creó)
    const disponible = await verificarDisponibilidad(
      solicitudConPaciente.tipo,
      solicitudConPaciente.fecha,
      solicitudConPaciente.hora
    );

    if (!disponible) {
      return res.status(400).json({
        error: 'La fecha y hora ya no están disponibles',
      });
    }

    // Buscar o crear paciente
    let paciente = solicitudConPaciente.paciente;

    if (!paciente) {
      // Si no tiene paciente asociado, buscarlo por email o crearlo
      paciente = await prisma.paciente.findFirst({
        where: {
          farmaciaId,
          email: solicitudConPaciente.emailCliente,
        },
      });

      if (!paciente) {
        // Crear paciente con datos de la solicitud
        paciente = await prisma.paciente.create({
          data: {
            farmaciaId,
            name: solicitudConPaciente.nombreCliente,
            email: solicitudConPaciente.emailCliente,
            phone: solicitudConPaciente.telefonoCliente,
            age: 0, // Se puede actualizar después
            sex: 'O', // Por defecto "Otro"
          },
        });
      }
    }

    // Crear la cita
    const cita = await prisma.cita.create({
      data: {
        farmaciaId,
        titulo: `Cita ${solicitudConPaciente.tipo} - ${solicitudConPaciente.nombreCliente}`,
        pacienteId: paciente.id,
        fecha: solicitudConPaciente.fecha,
        hora: solicitudConPaciente.hora,
        tipo: solicitudConPaciente.tipo,
        notas: solicitudConPaciente.notas || `Solicitud aprobada desde panel de administración`,
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
          contains: `solicitado una cita ${solicitudConPaciente.tipo}`,
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
          titulo: `Cita ${solicitudConPaciente.tipo} aprobada`,
          mensaje: `Se ha aprobado la solicitud de cita ${solicitudConPaciente.tipo} para ${solicitudConPaciente.nombreCliente} el ${solicitudConPaciente.fecha} a las ${solicitudConPaciente.hora}`,
          leida: false,
        },
      });
    } else {
      // Crear nueva notificación
      await prisma.notificacion.create({
        data: {
          farmaciaId,
          tipo: 'cita',
          pacienteId: paciente.id,
          citaId: cita.id,
          titulo: `Cita ${solicitudConPaciente.tipo} aprobada`,
          mensaje: `Se ha aprobado la solicitud de cita ${solicitudConPaciente.tipo} para ${solicitudConPaciente.nombreCliente} el ${solicitudConPaciente.fecha} a las ${solicitudConPaciente.hora}`,
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
    const id = getParamString(req.params.id);
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

    // Opcional - enviar email al cliente informando del rechazo
    // (Comentado por defecto, descomentar si se desea activar)
    // const { enviarRechazoSolicitud } = await import('../services/emailService.js');
    // await enviarRechazoSolicitud(solicitud.emailCliente, {
    //   tipo: solicitud.tipo,
    //   fecha: solicitud.fecha,
    //   hora: solicitud.hora,
    //   nombreCliente: solicitud.nombreCliente,
    //   motivo: motivo,
    // });

    res.json({
      solicitud: solicitudActualizada,
      mensaje: 'Solicitud rechazada correctamente',
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
}
