import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Recibir webhook de Cal.com
 * Verifica la firma y procesa los eventos de reserva
 */
export async function recibirWebhook(req: Request, res: Response) {
  try {
    // Obtener configuración para verificar el secret
    const config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
      select: {
        calComWebhookSecret: true,
        calComEnabled: true,
      },
    });

    if (!config?.calComEnabled) {
      return res.status(503).json({ error: 'Cal.com no está habilitado' });
    }

    // Verificar firma del webhook
    const signature = req.headers['x-cal-signature-256'] as string;
    if (!signature || !config.calComWebhookSecret) {
      return res.status(401).json({ error: 'Firma no proporcionada o secret no configurado' });
    }

    const rawBody = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', config.calComWebhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== computedSignature) {
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const { triggerEvent, payload } = req.body;

    // Procesar según el tipo de evento
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        await procesarReservaCreada(payload);
        break;
      case 'BOOKING_RESCHEDULED':
        await procesarReservaReagendada(payload);
        break;
      case 'BOOKING_CANCELLED':
        await procesarReservaCancelada(payload);
        break;
      default:
        console.log(`Evento no manejado: ${triggerEvent}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error al procesar webhook de Cal.com:', error);
    res.status(500).json({ error: 'Error al procesar webhook' });
  }
}

/**
 * Procesar reserva creada
 */
async function procesarReservaCreada(payload: any) {
  const { id, title, startTime, endTime, attendees, eventType } = payload;

  // Buscar paciente por email o nombre
  const attendee = attendees?.[0];
  const email = attendee?.email;
  const nombre = attendee?.name || title;

  // Buscar paciente existente o crear uno nuevo
  let paciente = null;
  if (email) {
    paciente = await prisma.paciente.findFirst({
      where: { email },
    });
  }

  if (!paciente && nombre) {
    // Crear paciente si no existe
    paciente = await prisma.paciente.create({
      data: {
        nombre,
        email: email || undefined,
        telefono: attendee?.phoneNumber || undefined,
      },
    });
  }

  // Crear cita en el sistema
  const fecha = new Date(startTime);
  const fechaStr = fecha.toISOString().split('T')[0];
  const horaStr = fecha.toTimeString().slice(0, 5);

  await prisma.cita.create({
    data: {
      titulo: title || 'Consulta Dermocosmética',
      fecha: fechaStr,
      hora: horaStr,
      tipo: 'dermo',
      pacienteId: paciente?.id || undefined,
      notas: `Reserva desde Cal.com (ID: ${id})`,
    },
  });

  console.log(`Reserva creada desde Cal.com: ${id} para ${nombre}`);
}

/**
 * Procesar reserva reagendada
 */
async function procesarReservaReagendada(payload: any) {
  const { id, startTime, endTime } = payload;

  // Buscar cita por notas (que contiene el ID de Cal.com)
  const citas = await prisma.cita.findMany({
    where: {
      notas: {
        contains: id,
      },
    },
  });

  if (citas.length > 0) {
    const fecha = new Date(startTime);
    const fechaStr = fecha.toISOString().split('T')[0];
    const horaStr = fecha.toTimeString().slice(0, 5);

    await prisma.cita.update({
      where: { id: citas[0].id },
      data: {
        fecha: fechaStr,
        hora: horaStr,
      },
    });

    console.log(`Reserva reagendada desde Cal.com: ${id}`);
  }
}

/**
 * Procesar reserva cancelada
 */
async function procesarReservaCancelada(payload: any) {
  const { id } = payload;

  // Buscar cita por notas (que contiene el ID de Cal.com)
  const citas = await prisma.cita.findMany({
    where: {
      notas: {
        contains: id,
      },
    },
  });

  if (citas.length > 0) {
    await prisma.cita.delete({
      where: { id: citas[0].id },
    });

    console.log(`Reserva cancelada desde Cal.com: ${id}`);
  }
}
