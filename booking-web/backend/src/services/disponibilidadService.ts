/**
 * Servicio de disponibilidad de citas (adaptado del backend original, single-tenant).
 *
 * Calcula huecos libres a partir de ConfiguracionCalendario (singleton) y de las
 * Cita/SolicitudCita ya registradas en ESTA base de datos. No tiene en cuenta
 * citas creadas solo en la app de escritorio (ver limitación documentada en el README).
 */

import { prisma } from '../lib/prisma.js';

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface HorariosPorTipo {
  [tipo: string]: {
    [dia in DiaSemana]?: string[]; // Rangos horarios: ["09:00-14:00", "16:00-19:00"]
  };
}

export interface DuracionPorTipo {
  [tipo: string]: number; // minutos
}

function obtenerDiaSemana(fecha: string): DiaSemana {
  const dias: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const date = new Date(fecha + 'T00:00:00');
  return dias[date.getDay()];
}

function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function generarHorasEnRango(inicio: string, fin: string, intervalo = 30): string[] {
  const inicioMinutos = horaAMinutos(inicio);
  const finMinutos = horaAMinutos(fin);
  const horas: string[] = [];
  for (let minutos = inicioMinutos; minutos < finMinutos; minutos += intervalo) {
    horas.push(minutosAHora(minutos));
  }
  return horas;
}

function citasSeSolapan(hora1: string, duracion1: number, hora2: string, duracion2: number): boolean {
  const inicio1 = horaAMinutos(hora1);
  const fin1 = inicio1 + duracion1;
  const inicio2 = horaAMinutos(hora2);
  const fin2 = inicio2 + duracion2;
  return inicio1 < fin2 && fin1 > inicio2;
}

/**
 * Obtiene (o crea con valores por defecto) la configuración de calendario singleton.
 */
async function obtenerConfiguracionCalendario() {
  let config = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });

  if (!config) {
    config = await prisma.configuracionCalendario.create({
      data: {
        id: 'singleton',
        horariosPorTipo: '{}',
        fechasBloqueadas: '[]',
        horasBloqueadas: '{}',
        autoAceptar: false,
        duracionPorTipo: JSON.stringify({ dermo: 45, bio: 20, consulta: 30, seguimiento: 20 }),
      },
    });
  }

  return config;
}

/**
 * Obtiene todas las horas disponibles para un tipo de servicio (o evento) en una fecha.
 */
export async function obtenerDisponibilidad(tipo: string, fecha: string, eventoId?: string): Promise<string[]> {
  const tiposValidos = ['dermo', 'bio', 'consulta', 'seguimiento', 'evento'];
  if (!tiposValidos.includes(tipo)) {
    throw new Error(`Tipo de servicio inválido: ${tipo}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error(`Formato de fecha inválido: ${fecha}. Debe ser YYYY-MM-DD`);
  }

  // Evento personalizado: usa sus propios horarios/aforo
  if (tipo === 'evento' && eventoId) {
    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento || !evento.activo) {
      throw new Error('Evento no encontrado o inactivo');
    }

    const fechasEvento: string[] = JSON.parse(evento.fechas);
    const horasEvento: string[] = JSON.parse(evento.horas);

    if (!fechasEvento.includes(fecha)) {
      return [];
    }

    const todasLasHoras: string[] = [];
    for (const rango of horasEvento) {
      const [inicio, fin] = rango.split('-');
      if (inicio && fin) {
        todasLasHoras.push(...generarHorasEnRango(inicio, fin, evento.duracion));
      }
    }

    const tipoCompuesto = `evento:${eventoId}`;

    const [solicitudes, citas] = await Promise.all([
      prisma.solicitudCita.findMany({
        where: { fecha, tipo: tipoCompuesto, estado: { in: ['pendiente', 'aprobada'] } },
        select: { hora: true },
      }),
      prisma.cita.findMany({
        where: { fecha, tipo: tipoCompuesto, estado: { not: 'cancelada' } },
        select: { hora: true },
      }),
    ]);

    const asistentesPorHora: Record<string, number> = {};
    [...solicitudes, ...citas].forEach((c) => {
      asistentesPorHora[c.hora] = (asistentesPorHora[c.hora] || 0) + 1;
    });

    const horasDisponibles = todasLasHoras.filter((hora) => (asistentesPorHora[hora] || 0) < evento.maxAsistentes);

    return [...new Set(horasDisponibles)].sort();
  }

  // Tipo de servicio estándar
  const config = await obtenerConfiguracionCalendario();

  const horariosPorTipo: HorariosPorTipo = JSON.parse(config.horariosPorTipo || '{}');
  const fechasBloqueadas: string[] = JSON.parse(config.fechasBloqueadas || '[]');
  const horasBloqueadas: Record<string, string[]> = JSON.parse(config.horasBloqueadas || '{}');
  const duracionPorTipo: DuracionPorTipo = JSON.parse(config.duracionPorTipo || '{}');

  if (fechasBloqueadas.includes(fecha)) {
    return [];
  }

  const horariosTipo = horariosPorTipo[tipo] || {};
  const diaSemana = obtenerDiaSemana(fecha);
  const rangosHorarios = horariosTipo[diaSemana] || [];

  // Sin horarios configurados para este día: usar horario por defecto 9:00-18:00
  if (rangosHorarios.length === 0) {
    rangosHorarios.push('09:00-18:00');
  }

  const duracion = duracionPorTipo[tipo] || 30;

  const todasLasHoras: string[] = [];
  for (const rango of rangosHorarios) {
    const [inicio, fin] = rango.split('-');
    if (inicio && fin) {
      todasLasHoras.push(...generarHorasEnRango(inicio, fin, 30));
    }
  }

  const [citasExistentes, solicitudesAprobadas] = await Promise.all([
    prisma.cita.findMany({
      where: { fecha, tipo, estado: { not: 'cancelada' } },
      select: { hora: true, duracion: true },
    }),
    prisma.solicitudCita.findMany({
      where: { fecha, tipo, estado: 'aprobada' },
      select: { hora: true },
    }),
  ]);

  const ocupadas: { hora: string; duracion: number }[] = [
    ...citasExistentes.map((c) => ({ hora: c.hora, duracion: c.duracion })),
    ...solicitudesAprobadas.map((s) => ({ hora: s.hora, duracion })),
  ];

  const horasBloqueadasFecha = horasBloqueadas[fecha] || [];

  const horasDisponibles = todasLasHoras.filter((hora) => {
    if (horasBloqueadasFecha.includes(hora)) return false;
    const seSolapa = ocupadas.some((o) => citasSeSolapan(hora, duracion, o.hora, o.duracion));
    return !seSolapa;
  });

  return [...new Set(horasDisponibles)].sort();
}

/**
 * Verifica si una fecha/hora concretas están disponibles para un tipo de servicio.
 */
export async function verificarDisponibilidad(
  tipo: string,
  fecha: string,
  hora: string,
  eventoId?: string
): Promise<boolean> {
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
    throw new Error(`Formato de hora inválido: ${hora}. Debe ser HH:mm`);
  }
  const horasDisponibles = await obtenerDisponibilidad(tipo, fecha, eventoId);
  return horasDisponibles.includes(hora);
}

export { obtenerConfiguracionCalendario };
