import { prisma } from '../lib/prisma.js';

/**
 * Crear notificación de próxima revisión cuando se crea/actualiza un análisis dermo
 */
export async function crearNotificacionRevision(analisisId: string, pacienteId: string, fechaRevision: string) {
  try {
    // Verificar si ya existe una notificación para esta revisión
    const existe = await prisma.notificacion.findFirst({
      where: {
        tipo: 'revision',
        analisisId,
        pacienteId,
        leida: false,
      },
    });

    if (existe) {
      return; // Ya existe, no crear duplicado
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { name: true },
    });

    await prisma.notificacion.create({
      data: {
        tipo: 'revision',
        pacienteId,
        analisisId,
        titulo: 'Próxima revisión programada',
        mensaje: `Revisión programada para ${paciente?.name || 'el paciente'} el ${new Date(fechaRevision).toLocaleDateString('es-ES')}`,
        canal: 'interno',
      },
    });
  } catch (error) {
    console.error('Error al crear notificación de revisión:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Crear notificación de recordatorio de cita (24 horas antes)
 */
export async function crearNotificacionRecordatorioCita(citaId: string) {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: {
          select: { name: true },
        },
      },
    });

    if (!cita || cita.recordatorioEnviado) {
      return;
    }

    const fechaCita = new Date(cita.fecha);
    const ahora = new Date();
    const diffHoras = (fechaCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    // Crear notificación si la cita es en las próximas 24 horas
    if (diffHoras > 0 && diffHoras <= 24) {
      await prisma.notificacion.create({
        data: {
          tipo: 'recordatorio',
          pacienteId: cita.pacienteId,
          citaId: cita.id,
          titulo: 'Recordatorio de cita',
          mensaje: `Cita "${cita.titulo}" con ${cita.paciente.name} el ${fechaCita.toLocaleDateString('es-ES')} a las ${cita.hora}`,
          canal: 'interno',
        },
      });

      // Marcar como enviado
      await prisma.cita.update({
        where: { id: citaId },
        data: { recordatorioEnviado: true },
      });
    }
  } catch (error) {
    console.error('Error al crear notificación de recordatorio:', error);
  }
}

/**
 * Verificar y crear notificaciones de revisiones próximas (ejecutar periódicamente)
 */
export async function verificarRevisionesProximas() {
  try {
    const hoy = new Date();
    const en7Dias = new Date();
    en7Dias.setDate(hoy.getDate() + 7);

    // Buscar análisis con revisiones en los próximos 7 días
    const analisisConRevision = await prisma.analisisDermo.findMany({
      where: {
        proximaRevision: {
          not: null,
          gte: hoy.toISOString().split('T')[0],
          lte: en7Dias.toISOString().split('T')[0],
        },
      },
      include: {
        paciente: {
          select: { name: true },
        },
      },
    });

    for (const analisis of analisisConRevision) {
      if (!analisis.proximaRevision) continue;

      // Verificar si ya existe notificación
      const existe = await prisma.notificacion.findFirst({
        where: {
          tipo: 'revision',
          analisisId: analisis.id,
          pacienteId: analisis.pacienteId,
        },
      });

      if (!existe) {
        await prisma.notificacion.create({
          data: {
            tipo: 'revision',
            pacienteId: analisis.pacienteId,
            analisisId: analisis.id,
            titulo: 'Revisión próxima',
            mensaje: `Revisión programada para ${analisis.paciente.name} el ${new Date(analisis.proximaRevision).toLocaleDateString('es-ES')}`,
            canal: 'interno',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error al verificar revisiones próximas:', error);
  }
}
