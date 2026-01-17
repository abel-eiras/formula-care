import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  listarEventosDeCalendar,
  obtenerEventoDeCalendar,
} from '../services/googleCalendar.js';

/**
 * Sincronizar citas desde Google Calendar
 * Busca eventos en Google Calendar y los compara con citas locales
 */
export async function sincronizarDesdeGoogleCalendar(req: Request, res: Response) {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
      select: { googleCalendarEnabled: true, googleCalendarId: true },
    });

    if (!config?.googleCalendarEnabled) {
      return res.status(400).json({ error: 'Google Calendar no está habilitado' });
    }

    // Obtener eventos de los próximos 30 días
    const fechaDesde = new Date();
    const fechaHasta = new Date();
    fechaHasta.setDate(fechaHasta.getDate() + 30);

    const eventos = await listarEventosDeCalendar(fechaDesde, fechaHasta);

    // Obtener todas las citas con googleEventId en el mismo rango
    const citasLocales = await prisma.cita.findMany({
      where: {
        googleEventId: { not: null },
        fecha: {
          gte: fechaDesde.toISOString().split('T')[0],
          lte: fechaHasta.toISOString().split('T')[0],
        },
      },
      include: {
        paciente: true,
      },
    });

    const eventosMap = new Map(eventos.map((e) => [e.id, e]));
    const citasMap = new Map(citasLocales.map((c) => [c.googleEventId, c]));

    const cambios: string[] = [];

    // Verificar eventos que fueron eliminados en Google Calendar
    for (const cita of citasLocales) {
      if (cita.googleEventId && !eventosMap.has(cita.googleEventId)) {
        // El evento fue eliminado en Google Calendar, eliminar la cita local
        await prisma.cita.delete({ where: { id: cita.id } });
        cambios.push(`Cita eliminada (evento eliminado en Google Calendar): ${cita.titulo}`);
      }
    }

    // Verificar eventos modificados en Google Calendar
    for (const evento of eventos) {
      if (!evento.id) continue;

      const cita = citasMap.get(evento.id);
      if (!cita) {
        // Evento nuevo en Google Calendar - podríamos crear la cita, pero por ahora solo logueamos
        cambios.push(`Evento nuevo en Google Calendar (no sincronizado automáticamente): ${evento.summary}`);
        continue;
      }

      // Verificar si el evento fue modificado
      const startDate = evento.start?.dateTime || evento.start?.date;
      if (startDate) {
        const fechaEvento = new Date(startDate);
        const fechaCita = new Date(`${cita.fecha}T${cita.hora}:00`);

        if (
          Math.abs(fechaEvento.getTime() - fechaCita.getTime()) > 60000 || // Más de 1 minuto de diferencia
          evento.summary !== `${cita.titulo} - ${cita.paciente.name}` ||
          evento.description !== (cita.notas || `Cita con ${cita.paciente.name}`)
        ) {
          // Actualizar la cita local con datos del evento
          const fechaISO = fechaEvento.toISOString().split('T')[0];
          const hora = fechaEvento.toTimeString().slice(0, 5);

          // Extraer tipo del extendedProperties si está disponible
          const tipo = (evento.extendedProperties?.private?.tipo as string) || cita.tipo;

          await prisma.cita.update({
            where: { id: cita.id },
            data: {
              fecha: fechaISO,
              hora,
              titulo: evento.summary?.replace(` - ${cita.paciente.name}`, '') || cita.titulo,
              notas: evento.description || cita.notas,
              tipo: tipo,
            },
          });

          cambios.push(`Cita actualizada desde Google Calendar: ${cita.titulo}`);
        }
      }
    }

    res.json({
      message: 'Sincronización completada',
      cambios: cambios.length,
      detalles: cambios,
    });
  } catch (error) {
    console.error('Error al sincronizar desde Google Calendar:', error);
    res.status(500).json({ error: 'Error al sincronizar desde Google Calendar' });
  }
}

/**
 * Webhook para recibir notificaciones de cambios en Google Calendar
 * Google Calendar puede enviar notificaciones push cuando hay cambios
 */
export async function webhookGoogleCalendar(req: Request, res: Response) {
  try {
    // Google Calendar envía un challenge cuando se configura el webhook
    if (req.headers['x-goog-resource-state'] === 'sync') {
      // Primera sincronización - responder con el challenge
      const challenge = req.query['x-goog-challenge'] as string;
      if (challenge) {
        return res.status(200).send(challenge);
      }
    }

    // Notificación de cambio
    if (req.headers['x-goog-resource-state'] === 'exists') {
      // Hay cambios en el calendario - sincronizar
      // Por ahora solo respondemos OK, la sincronización real se hace manualmente
      // En producción, aquí podríamos procesar los cambios inmediatamente
      console.log('Cambio detectado en Google Calendar');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en webhook de Google Calendar:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
}

/**
 * Obtener estado de sincronización
 */
export async function obtenerEstadoSincronizacion(req: Request, res: Response) {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
      select: { googleCalendarEnabled: true },
    });

    if (!config?.googleCalendarEnabled) {
      return res.json({
        enabled: false,
        citasSincronizadas: 0,
        totalCitas: 0,
      });
    }

    const totalCitas = await prisma.cita.count();
    const citasSincronizadas = await prisma.cita.count({
      where: { googleEventId: { not: null } },
    });

    res.json({
      enabled: true,
      citasSincronizadas,
      totalCitas,
      porcentaje: totalCitas > 0 ? Math.round((citasSincronizadas / totalCitas) * 100) : 0,
    });
  } catch (error) {
    console.error('Error al obtener estado de sincronización:', error);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
}
