import { prisma } from '../../lib/prisma.js';
import { hoyISO } from '../../lib/fechas.js';

/**
 * Huecos libres que se publican en la reserva online. La app de escritorio es
 * la única fuente de verdad: booking-web solo ofrece lo que se calcula aquí.
 */

/** Servicios que se pueden ofrecer online (los eventos van aparte) */
export const SERVICIOS_RESERVABLES = ['dermo', 'bio', 'nutricion', 'consulta'] as const;
export type ServicioReservable = (typeof SERVICIOS_RESERVABLES)[number];

export const NOMBRES_SERVICIO: Record<ServicioReservable, string> = {
  dermo: 'Dermocosmética',
  bio: 'Análisis bioquímico',
  nutricion: 'Nutrición',
  consulta: 'Consulta farmacéutica',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;
const DURACION_POR_DEFECTO = 30;

/** Plazas libres por hora: { "09:00": 1, "09:30": 1 } */
export type HuecosDia = Record<string, number>;
/** Huecos por tipo ("dermo", "evento:<id>"...) y fecha */
export type Huecos = Record<string, Record<string, HuecosDia>>;

interface Intervalo {
  inicio: number; // minutos desde medianoche
  fin: number;
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function minutosAHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** "09:00-14:00" → intervalo; null si el texto no es un rango válido */
function parsearRango(rango: string): Intervalo | null {
  const m = /^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/.exec(rango);
  if (!m) return null;
  const inicio = horaAMinutos(m[1]);
  const fin = horaAMinutos(m[2]);
  return fin > inicio ? { inicio, fin } : null;
}

/** Inicios de sesión consecutivos de `duracion` minutos que caben enteros en el rango */
function iniciosEnRango(rango: Intervalo, duracion: number): number[] {
  const inicios: number[] = [];
  for (let t = rango.inicio; t + duracion <= rango.fin; t += duracion) inicios.push(t);
  return inicios;
}

function diaSemana(fecha: string): (typeof DIAS)[number] {
  return DIAS[new Date(`${fecha}T12:00:00`).getDay()];
}

function parsearJson<T>(texto: string | null | undefined, porDefecto: T): T {
  try {
    return texto ? (JSON.parse(texto) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

export interface OpcionesHuecos {
  diasVista: number;
  antelacionMinimaHoras: number;
  ahora?: Date;
}

export interface ResultadoHuecos {
  servicios: { id: ServicioReservable; nombre: string; duracion: number }[];
  eventos: { id: string; nombre: string; descripcion: string | null; duracion: number }[];
  huecos: Huecos;
}

/**
 * Calcula los huecos libres de los próximos días.
 * - Servicio: solo los días con horario configurado; un hueco está libre si no
 *   se solapa con ninguna cita (de cualquier tipo) ni solicitud pendiente.
 * - Evento: sesiones según sus fechas y horas, con las plazas que queden.
 */
export async function calcularHuecos({ diasVista, antelacionMinimaHoras, ahora = new Date() }: OpcionesHuecos): Promise<ResultadoHuecos> {
  const hoy = hoyISO(ahora);
  const fechas = Array.from({ length: diasVista + 1 }, (_, i) => {
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() + i);
    return hoyISO(d);
  });
  const ultimaFecha = fechas[fechas.length - 1];

  // Primer instante reservable, como fecha + minutos locales
  const limite = new Date(ahora.getTime() + antelacionMinimaHoras * 3600_000);
  const fechaLimite = hoyISO(limite);
  const minutoLimite = limite.getHours() * 60 + limite.getMinutes();
  const esReservable = (fecha: string, inicio: number) =>
    fecha > fechaLimite || (fecha === fechaLimite && inicio >= minutoLimite);

  const [config, eventosActivos, citas, pendientes] = await Promise.all([
    prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } }),
    prisma.evento.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.cita.findMany({
      where: { fecha: { gte: hoy, lte: `${ultimaFecha}￿` }, estado: { not: 'cancelada' } },
      select: { fecha: true, hora: true, tipo: true },
    }),
    prisma.solicitudOnline.findMany({
      where: { estado: 'pendiente', fecha: { gte: hoy } },
      select: { fecha: true, hora: true, tipo: true },
    }),
  ]);

  const horarios = parsearJson<Record<string, Record<string, string[]>>>(config?.horariosPorTipo, {});
  const duraciones = parsearJson<Record<string, number>>(config?.duracionPorTipo, {});
  const fechasBloqueadas = new Set(parsearJson<string[]>(config?.fechasBloqueadas, []));
  const horasBloqueadas = parsearJson<Record<string, string[]>>(config?.horasBloqueadas, {});
  const duracionEvento = new Map(eventosActivos.map((e) => [`evento:${e.id}`, e.duracion]));
  const duracionDe = (tipo: string) => duracionEvento.get(tipo) ?? duraciones[tipo] ?? DURACION_POR_DEFECTO;

  // Ocupación por fecha: citas y solicitudes pendientes (reservan su hueco hasta resolverse)
  const ocupado = new Map<string, Intervalo[]>();
  const asistentes = new Map<string, number>(); // "evento:id|fecha|hora" → personas
  for (const c of [...citas, ...pendientes]) {
    const fecha = c.fecha.slice(0, 10);
    const inicio = horaAMinutos(c.hora);
    ocupado.set(fecha, [...(ocupado.get(fecha) ?? []), { inicio, fin: inicio + duracionDe(c.tipo) }]);
    if (c.tipo.startsWith('evento:')) {
      const clave = `${c.tipo}|${fecha}|${c.hora}`;
      asistentes.set(clave, (asistentes.get(clave) ?? 0) + 1);
    }
  }

  const huecos: Huecos = {};
  const servicios: ResultadoHuecos['servicios'] = [];

  for (const servicio of SERVICIOS_RESERVABLES) {
    const horarioSemana = horarios[servicio] ?? {};
    const tieneHorario = Object.values(horarioSemana).some((rangos) => rangos.some((r) => parsearRango(r)));
    if (!tieneHorario) continue;

    const duracion = duracionDe(servicio);
    servicios.push({ id: servicio, nombre: NOMBRES_SERVICIO[servicio], duracion });
    const porFecha: Record<string, HuecosDia> = {};

    for (const fecha of fechas) {
      if (fechasBloqueadas.has(fecha)) continue;
      const bloqueadas = new Set(horasBloqueadas[fecha] ?? []);
      const ocupados = ocupado.get(fecha) ?? [];
      const dia: HuecosDia = {};
      for (const rango of (horarioSemana[diaSemana(fecha)] ?? []).map(parsearRango)) {
        if (!rango) continue;
        for (const inicio of iniciosEnRango(rango, duracion)) {
          const hora = minutosAHora(inicio);
          const fin = inicio + duracion;
          if (!esReservable(fecha, inicio) || bloqueadas.has(hora)) continue;
          if (ocupados.some((o) => inicio < o.fin && fin > o.inicio)) continue;
          dia[hora] = 1;
        }
      }
      if (Object.keys(dia).length) porFecha[fecha] = dia;
    }
    huecos[servicio] = porFecha;
  }

  const eventos: ResultadoHuecos['eventos'] = [];
  for (const evento of eventosActivos) {
    const tipo = `evento:${evento.id}`;
    const rangos = parsearJson<string[]>(evento.horas, []).map(parsearRango).filter((r): r is Intervalo => r !== null);
    const porFecha: Record<string, HuecosDia> = {};

    for (const fecha of parsearJson<string[]>(evento.fechas, [])) {
      if (fecha < hoy || fecha > ultimaFecha || fechasBloqueadas.has(fecha)) continue;
      const dia: HuecosDia = {};
      for (const rango of rangos) {
        for (const inicio of iniciosEnRango(rango, evento.duracion)) {
          const hora = minutosAHora(inicio);
          if (!esReservable(fecha, inicio)) continue;
          const libres = evento.maxAsistentes - (asistentes.get(`${tipo}|${fecha}|${hora}`) ?? 0);
          if (libres > 0) dia[hora] = libres;
        }
      }
      if (Object.keys(dia).length) porFecha[fecha] = dia;
    }
    if (Object.keys(porFecha).length === 0) continue;
    eventos.push({ id: evento.id, nombre: evento.nombre, descripcion: evento.descripcion, duracion: evento.duracion });
    huecos[tipo] = porFecha;
  }

  return { servicios, eventos, huecos };
}

/** ¿Sigue libre este hueco? (para aceptar solicitudes sin pisar otra cita) */
export async function huecoSigueLibre(tipo: string, fecha: string, hora: string, ignorarSolicitudId?: string): Promise<boolean> {
  const config = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });
  const duraciones = parsearJson<Record<string, number>>(config?.duracionPorTipo, {});
  const [citas, pendientes, evento] = await Promise.all([
    prisma.cita.findMany({
      where: { fecha: { gte: fecha, lte: `${fecha}￿` }, estado: { not: 'cancelada' } },
      select: { hora: true, tipo: true },
    }),
    prisma.solicitudOnline.findMany({
      where: { estado: 'pendiente', fecha, ...(ignorarSolicitudId ? { id: { not: ignorarSolicitudId } } : {}) },
      select: { hora: true, tipo: true },
    }),
    tipo.startsWith('evento:') ? prisma.evento.findUnique({ where: { id: tipo.slice(7) } }) : null,
  ]);
  const ocupantes = [...citas, ...pendientes];

  if (evento) {
    const apuntados = ocupantes.filter((o) => o.tipo === tipo && o.hora === hora).length;
    return apuntados < evento.maxAsistentes;
  }

  const eventos = await prisma.evento.findMany({ select: { id: true, duracion: true } });
  const duracionEvento = new Map(eventos.map((e) => [`evento:${e.id}`, e.duracion]));
  const duracionDe = (t: string) => duracionEvento.get(t) ?? duraciones[t] ?? DURACION_POR_DEFECTO;
  const inicio = horaAMinutos(hora);
  const fin = inicio + duracionDe(tipo);
  return !ocupantes.some((o) => {
    const oi = horaAMinutos(o.hora);
    return inicio < oi + duracionDe(o.tipo) && fin > oi;
  });
}
