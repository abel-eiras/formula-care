import { prisma } from '../lib/prisma.js';

// Tipos auxiliares
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface HorariosPorTipo {
  [tipo: string]: {
    [dia in DiaSemana]?: string[]; // Array de rangos horarios: ["09:00-14:00", "16:00-19:00"]
  };
}

export interface DuracionPorTipo {
  [tipo: string]: number; // Duración en minutos
}

/**
 * Obtiene el nombre del día de la semana en español
 */
function obtenerDiaSemana(fecha: string): DiaSemana {
  const dias: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const date = new Date(fecha);
  return dias[date.getDay()];
}

/**
 * Convierte una hora "HH:mm" a minutos desde medianoche
 */
function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Convierte minutos desde medianoche a formato "HH:mm"
 */
function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Genera todas las horas disponibles en un rango horario con intervalos
 */
function generarHorasEnRango(inicio: string, fin: string, intervalo: number = 30): string[] {
  const inicioMinutos = horaAMinutos(inicio);
  const finMinutos = horaAMinutos(fin);
  const horas: string[] = [];

  for (let minutos = inicioMinutos; minutos < finMinutos; minutos += intervalo) {
    horas.push(minutosAHora(minutos));
  }

  return horas;
}

/**
 * Verifica si una hora está dentro de un rango horario
 */
function horaEnRango(hora: string, inicio: string, fin: string): boolean {
  const horaMinutos = horaAMinutos(hora);
  const inicioMinutos = horaAMinutos(inicio);
  const finMinutos = horaAMinutos(fin);
  return horaMinutos >= inicioMinutos && horaMinutos < finMinutos;
}

/**
 * Verifica si dos citas se solapan considerando su duración
 */
function citasSeSolapan(
  hora1: string,
  duracion1: number,
  hora2: string,
  duracion2: number
): boolean {
  const inicio1 = horaAMinutos(hora1);
  const fin1 = inicio1 + duracion1;
  const inicio2 = horaAMinutos(hora2);
  const fin2 = inicio2 + duracion2;

  return (inicio1 < fin2 && fin1 > inicio2);
}

/**
 * Obtiene la configuración del calendario para una farmacia
 * Si no se proporciona farmaciaId, obtiene la primera farmacia activa
 */
async function obtenerConfiguracionCalendario(farmaciaId?: string) {
  // Si no hay farmaciaId, obtener la primera farmacia activa
  let targetFarmaciaId = farmaciaId;
  if (!targetFarmaciaId) {
    const primeraFarmacia = await prisma.farmacia.findFirst({
      where: { activa: true },
      select: { id: true },
    });
    targetFarmaciaId = primeraFarmacia?.id;
  }

  if (!targetFarmaciaId) {
    // No hay farmacias, retornar config vacía
    return null;
  }

  let config = await prisma.configuracionCalendario.findUnique({
    where: { farmaciaId: targetFarmaciaId },
  });

  // Si no existe, crear con valores por defecto
  if (!config) {
    config = await prisma.configuracionCalendario.create({
      data: {
        farmaciaId: targetFarmaciaId,
        horariosPorTipo: '{}',
        fechasBloqueadas: '[]',
        horasBloqueadas: '{}',
        autoAceptar: false,
        duracionPorTipo: JSON.stringify({
          dermo: 45,
          bio: 20,
        }),
      },
    });
  }

  return config;
}

/**
 * Obtiene todas las horas disponibles para un tipo de servicio o evento en una fecha específica
 */
export async function obtenerDisponibilidad(tipo: string, fecha: string, eventoId?: string): Promise<string[]> {
  // Validar tipo
  const tiposValidos = ['dermo', 'bio', 'evento'];
  if (!tiposValidos.includes(tipo)) {
    throw new Error(`Tipo de servicio inválido: ${tipo}`);
  }

  // Si es un evento, obtener configuración del evento
  if (tipo === 'evento' && eventoId) {
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId, activo: true },
    });

    if (!evento) {
      throw new Error('Evento no encontrado o inactivo');
    }

    const fechasEvento: string[] = typeof evento.fechas === 'string' ? JSON.parse(evento.fechas) : evento.fechas;
    const horasEvento: string[] = typeof evento.horas === 'string' ? JSON.parse(evento.horas) : evento.horas;

    // Verificar si el evento está disponible en esta fecha específica
    if (!fechasEvento.includes(fecha)) {
      return [];
    }

    // Usar horarios del evento
    const todasLasHoras: string[] = [];
    for (const rango of horasEvento) {
      const [inicio, fin] = rango.split('-');
      if (inicio && fin) {
        const horas = generarHorasEnRango(inicio, fin, evento.duracion);
        todasLasHoras.push(...horas);
      }
    }

    // Obtener solicitudes existentes para este evento en esta fecha
    const solicitudesEvento = await prisma.solicitudCita.findMany({
      where: {
        fecha,
        tipo: `evento:${eventoId}`,
        estado: { in: ['pendiente', 'aprobada'] },
      },
      select: {
        hora: true,
      },
    });

    // Contar asistentes por hora
    const asistentesPorHora: Record<string, number> = {};
    solicitudesEvento.forEach((s) => {
      asistentesPorHora[s.hora] = (asistentesPorHora[s.hora] || 0) + 1;
    });

    // Filtrar horas disponibles (considerando maxAsistentes)
    const horasDisponibles = todasLasHoras.filter((hora) => {
      const asistentes = asistentesPorHora[hora] || 0;
      return asistentes < evento.maxAsistentes;
    });

    return [...new Set(horasDisponibles)].sort();
  }

  // Validar formato de fecha (ISO: YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error(`Formato de fecha inválido: ${fecha}. Debe ser YYYY-MM-DD`);
  }

  // Obtener configuración
  const config = await obtenerConfiguracionCalendario();
  
  // Si no hay configuración, retornar array vacío
  if (!config) {
    return [];
  }
  
  const horariosPorTipo: HorariosPorTipo = JSON.parse(config.horariosPorTipo || '{}');
  const fechasBloqueadas: string[] = JSON.parse(config.fechasBloqueadas || '[]');
  const horasBloqueadas: Record<string, string[]> = JSON.parse(config.horasBloqueadas || '{}');
  const duracionPorTipo: DuracionPorTipo = JSON.parse(config.duracionPorTipo || '{}');

  // Verificar si la fecha está bloqueada
  if (fechasBloqueadas.includes(fecha)) {
    return [];
  }

  // Obtener horarios para este tipo de servicio
  const horariosTipo = horariosPorTipo[tipo] || {};
  const diaSemana = obtenerDiaSemana(fecha);
  const rangosHorarios = horariosTipo[diaSemana] || [];

  // Si no hay horarios configurados para este día, usar horario por defecto (9:00-18:00)
  // Esto permite que el sistema funcione aunque no se hayan configurado horarios
  if (rangosHorarios.length === 0) {
    rangosHorarios.push('09:00-18:00'); // Horario por defecto
  }

  // Obtener duración del servicio (default: 30 minutos)
  const duracion = duracionPorTipo[tipo] || 30;

  // Generar todas las horas posibles en los rangos configurados
  const todasLasHoras: string[] = [];
  for (const rango of rangosHorarios) {
    const [inicio, fin] = rango.split('-');
    if (inicio && fin) {
      const horas = generarHorasEnRango(inicio, fin, 30); // Intervalo de 30 minutos
      todasLasHoras.push(...horas);
    }
  }

  // Obtener citas existentes del mismo tipo en esa fecha
  // Si el tipo es un evento (formato: "evento:ID"), buscar por ese tipo exacto
  const citasExistentes = await prisma.cita.findMany({
    where: {
      fecha,
      tipo: tipo.startsWith('evento:') ? tipo : tipo,
    },
    select: {
      hora: true,
    },
  });

  // Obtener solicitudes aprobadas del mismo tipo en esa fecha
  const solicitudesAprobadas = await prisma.solicitudCita.findMany({
    where: {
      fecha,
      tipo: tipo.startsWith('evento:') ? tipo : tipo,
      estado: 'aprobada',
    },
    select: {
      hora: true,
    },
  });

  // Combinar citas y solicitudes aprobadas
  const ocupadas = [...citasExistentes, ...solicitudesAprobadas].map((c) => c.hora);

  // Obtener horas bloqueadas para esta fecha específica
  const horasBloqueadasFecha = horasBloqueadas[fecha] || [];

  // Filtrar horas disponibles
  const horasDisponibles = todasLasHoras.filter((hora) => {
    // Excluir si está bloqueada
    if (horasBloqueadasFecha.includes(hora)) {
      return false;
    }

    // Excluir si hay una cita/solicitud aprobada a esa hora exacta
    if (ocupadas.includes(hora)) {
      return false;
    }

    // Excluir si se solapa con alguna cita existente (considerando duración)
    const seSolapa = ocupadas.some((horaOcupada) => {
      return citasSeSolapan(hora, duracion, horaOcupada, duracion);
    });

    return !seSolapa;
  });

  // Eliminar duplicados y ordenar
  return [...new Set(horasDisponibles)].sort();
}

/**
 * Verifica si una fecha y hora específica está disponible para un tipo de servicio
 */
export async function verificarDisponibilidad(
  tipo: string,
  fecha: string,
  hora: string
): Promise<boolean> {
  // Validar formato de hora (HH:mm)
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
    throw new Error(`Formato de hora inválido: ${hora}. Debe ser HH:mm`);
  }

  const horasDisponibles = await obtenerDisponibilidad(tipo, fecha);
  return horasDisponibles.includes(hora);
}
