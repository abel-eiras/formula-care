import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { obtenerDisponibilidad, verificarDisponibilidad } from '../services/disponibilidadService.js';

// Esquema de validación para solicitar cita
const solicitarCitaSchema = z.object({
  nombreCliente: z.string().min(1, 'El nombre es requerido'),
  emailCliente: z.string().email('Email inválido'),
  telefonoCliente: z.string().min(1, 'El teléfono es requerido'),
  tipo: z.enum(['dermo', 'bio', 'consulta', 'seguimiento']),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'),
  notas: z.string().optional(),
});

/**
 * Obtener disponibilidad para un tipo de servicio en una fecha
 * GET /api/public/disponibilidad?tipo=dermo&fecha=2026-01-20
 */
export async function obtenerDisponibilidadPublica(req: Request, res: Response) {
  try {
    const { tipo, fecha } = req.query;

    if (!tipo || !fecha) {
      return res.status(400).json({
        error: 'Parámetros requeridos: tipo y fecha',
      });
    }

    const horasDisponibles = await obtenerDisponibilidad(tipo as string, fecha as string);

    res.json({
      disponible: horasDisponibles.length > 0,
      horasDisponibles,
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
}

/**
 * Crear solicitud de cita desde página pública
 * POST /api/public/solicitar-cita
 */
export async function solicitarCita(req: Request, res: Response) {
  try {
    const datos = solicitarCitaSchema.parse(req.body);

    // Verificar disponibilidad
    const disponible = await verificarDisponibilidad(datos.tipo, datos.fecha, datos.hora);
    if (!disponible) {
      return res.status(400).json({
        error: 'La fecha y hora seleccionadas no están disponibles',
      });
    }

    // Obtener configuración del calendario
    let configCalendario = await prisma.configuracionCalendario.findUnique({
      where: { id: 'calendario' },
    });

    // Si no existe, crear con valores por defecto
    if (!configCalendario) {
      configCalendario = await prisma.configuracionCalendario.create({
        data: {
          id: 'calendario',
          horariosPorTipo: '{}',
          fechasBloqueadas: '[]',
          horasBloqueadas: '{}',
          autoAceptar: false,
          duracionPorTipo: JSON.stringify({
            dermo: 30,
            bio: 45,
            consulta: 30,
            seguimiento: 20,
          }),
        },
      });
    }

    const autoAceptar = configCalendario.autoAceptar;

    // Buscar si el paciente ya existe por email
    let paciente = await prisma.paciente.findFirst({
      where: {
        email: datos.emailCliente,
      },
    });

    // Si no existe, crear el paciente (con datos mínimos)
    if (!paciente) {
      // Extraer edad aproximada del nombre si es posible, sino usar 0
      paciente = await prisma.paciente.create({
        data: {
          name: datos.nombreCliente,
          email: datos.emailCliente,
          phone: datos.telefonoCliente,
          age: 0, // Se puede actualizar después
          sex: 'O', // Por defecto "Otro"
        },
      });
    }

    let solicitud;
    let cita = null;

    if (autoAceptar) {
      // Auto-aceptar: crear solicitud como aprobada y crear la cita
      solicitud = await prisma.solicitudCita.create({
        data: {
          nombreCliente: datos.nombreCliente,
          emailCliente: datos.emailCliente,
          telefonoCliente: datos.telefonoCliente,
          tipo: datos.tipo,
          fecha: datos.fecha,
          hora: datos.hora,
          estado: 'aprobada',
          notas: datos.notas,
          pacienteId: paciente.id,
        },
      });

      // Crear la cita
      cita = await prisma.cita.create({
        data: {
          titulo: `Cita ${datos.tipo} - ${datos.nombreCliente}`,
          pacienteId: paciente.id,
          fecha: datos.fecha,
          hora: datos.hora,
          tipo: datos.tipo,
          notas: datos.notas || `Solicitud auto-aprobada desde página pública`,
        },
      });

      // Actualizar solicitud con el ID de la cita
      solicitud = await prisma.solicitudCita.update({
        where: { id: solicitud.id },
        data: { citaId: cita.id },
      });

      // Crear notificación
      await prisma.notificacion.create({
        data: {
          tipo: 'cita',
          pacienteId: paciente.id,
          citaId: cita.id,
          titulo: `Cita ${datos.tipo} auto-aprobada`,
          mensaje: `Se ha creado una nueva cita ${datos.tipo} para ${datos.nombreCliente} el ${datos.fecha} a las ${datos.hora}`,
          canal: 'interno',
          enviada: false,
          leida: false,
        },
      });

      // TODO: Enviar email de confirmación (se implementará en Fase 5)
    } else {
      // Crear solicitud como pendiente
      solicitud = await prisma.solicitudCita.create({
        data: {
          nombreCliente: datos.nombreCliente,
          emailCliente: datos.emailCliente,
          telefonoCliente: datos.telefonoCliente,
          tipo: datos.tipo,
          fecha: datos.fecha,
          hora: datos.hora,
          estado: 'pendiente',
          notas: datos.notas,
          pacienteId: paciente.id,
        },
      });

      // Crear notificación para que el equipo la revise
      await prisma.notificacion.create({
        data: {
          tipo: 'cita',
          pacienteId: paciente.id,
          titulo: `Nueva solicitud de cita ${datos.tipo}`,
          mensaje: `${datos.nombreCliente} ha solicitado una cita ${datos.tipo} para el ${datos.fecha} a las ${datos.hora}`,
          canal: 'interno',
          enviada: false,
          leida: false,
        },
      });
    }

    res.status(201).json({
      id: solicitud.id,
      estado: solicitud.estado,
      mensaje: autoAceptar
        ? 'Tu solicitud ha sido aprobada automáticamente. Recibirás un email de confirmación.'
        : 'Tu solicitud ha sido recibida. Te contactaremos pronto para confirmar la cita.',
      cita: cita
        ? {
            id: cita.id,
            fecha: cita.fecha,
            hora: cita.hora,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    console.error('Error al crear solicitud de cita:', error);
    res.status(500).json({ error: 'Error al crear solicitud de cita' });
  }
}
