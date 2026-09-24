import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hoyISO } from '../lib/fechas.js';

/**
 * Cumpleaños de pacientes. No se guardan como eventos: se calculan a partir
 * de Paciente.birthDate para cualquier rango de fechas, así nunca quedan
 * desfasados si se corrige una fecha de nacimiento.
 */

/** Rango máximo consultable (un año + margen para las semanas de relleno del calendario) */
export const MAX_DIAS_RANGO = 400;

export interface Cumpleanos {
  pacienteId: string;
  nombre: string;
  telefono: string;
  email: string | null;
  fechaNacimiento: string;
  /** Día en que se celebra dentro del rango pedido (YYYY-MM-DD) */
  fecha: string;
  /** Años que cumple ese día */
  edad: number;
  felicitacion: { canal: string; usuario: string | null; fecha: string } | null;
}

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Días (YYYY-MM-DD) entre dos fechas incluidas. Se trabaja en UTC para no depender del horario de verano. */
export function diasEntre(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const actual = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (actual <= fin && dias.length <= MAX_DIAS_RANGO) {
    dias.push(actual.toISOString().slice(0, 10));
    actual.setUTCDate(actual.getUTCDate() + 1);
  }
  return dias;
}

/**
 * Para cada "MM-DD" de nacimiento, los días del rango en que se celebra.
 * Quien nació un 29 de febrero lo celebra el 28 en los años no bisiestos.
 */
export function mapaCelebraciones(dias: string[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  const anadir = (mmdd: string, dia: string) => mapa.set(mmdd, [...(mapa.get(mmdd) ?? []), dia]);
  for (const dia of dias) {
    const mmdd = dia.slice(5);
    anadir(mmdd, dia);
    if (mmdd === '02-28' && !esBisiesto(Number(dia.slice(0, 4)))) {
      anadir('02-29', dia);
    }
  }
  return mapa;
}

/** Cumpleaños de pacientes entre dos fechas (incluidas), ordenados por fecha y nombre */
export async function obtenerCumpleanos(desde: string, hasta: string): Promise<Cumpleanos[]> {
  const celebraciones = mapaCelebraciones(diasEntre(desde, hasta));
  if (celebraciones.size === 0) return [];

  // Filtrado por mes-día en SQL (usa la columna, no carga todos los pacientes)
  const pacientes = await prisma.$queryRaw<
    { id: string; name: string; phone: string; email: string | null; birthDate: string }[]
  >`SELECT "id", "name", "phone", "email", "birthDate" FROM "Paciente"
    WHERE substr("birthDate", 6, 5) IN (${Prisma.join([...celebraciones.keys()])})`;
  if (pacientes.length === 0) return [];

  const felicitaciones = await prisma.felicitacionCumpleanos.findMany({
    where: { pacienteId: { in: pacientes.map((p) => p.id) } },
  });
  const felicitacionDe = (pacienteId: string, anio: number) =>
    felicitaciones.find((f) => f.pacienteId === pacienteId && f.anio === anio);

  const resultado: Cumpleanos[] = [];
  for (const p of pacientes) {
    for (const fecha of celebraciones.get(p.birthDate.slice(5, 10)) ?? []) {
      const anio = Number(fecha.slice(0, 4));
      const edad = anio - Number(p.birthDate.slice(0, 4));
      if (edad < 1) continue; // el propio día de nacimiento no es un cumpleaños
      const f = felicitacionDe(p.id, anio);
      resultado.push({
        pacienteId: p.id,
        nombre: p.name,
        telefono: p.phone,
        email: p.email,
        fechaNacimiento: p.birthDate,
        fecha,
        edad,
        felicitacion: f ? { canal: f.canal, usuario: f.usuario, fecha: f.createdAt.toISOString() } : null,
      });
    }
  }

  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Crea un aviso interno por cada paciente que cumple años hoy (una sola vez
 * al día aunque se llame varias veces). Se ejecuta al arrancar y cada hora.
 */
export async function generarAvisosCumpleanos(): Promise<number> {
  const hoy = hoyISO();
  const cumpleanosHoy = await obtenerCumpleanos(hoy, hoy);
  const inicioDia = new Date(`${hoy}T00:00:00`);
  let creados = 0;

  for (const c of cumpleanosHoy) {
    if (c.felicitacion) continue; // ya felicitado: no hace falta recordarlo
    const existe = await prisma.notificacion.findFirst({
      where: { tipo: 'cumpleanos', pacienteId: c.pacienteId, createdAt: { gte: inicioDia } },
      select: { id: true },
    });
    if (existe) continue;

    await prisma.notificacion.create({
      data: {
        tipo: 'cumpleanos',
        pacienteId: c.pacienteId,
        titulo: `🎂 Cumpleaños de ${c.nombre}`,
        mensaje: `Hoy cumple ${c.edad} años. Puedes felicitarle desde el calendario o el panel de inicio.`,
        canal: 'interno',
      },
    });
    creados++;
  }

  return creados;
}

export const CANALES_FELICITACION = ['whatsapp', 'email', 'llamada', 'en_persona'] as const;
export type CanalFelicitacion = (typeof CANALES_FELICITACION)[number];

/**
 * Registra que se ha felicitado al paciente en un año. Al registrarlo se
 * marca como leído el aviso de ese cumpleaños, si lo había.
 */
export async function registrarFelicitacion(pacienteId: string, anio: number, canal: CanalFelicitacion, usuario?: string) {
  const felicitacion = await prisma.felicitacionCumpleanos.upsert({
    where: { pacienteId_anio: { pacienteId, anio } },
    create: { pacienteId, anio, canal, usuario },
    update: { canal, usuario },
  });

  await prisma.notificacion.updateMany({
    where: { tipo: 'cumpleanos', pacienteId, leida: false, createdAt: { gte: new Date(`${anio}-01-01T00:00:00`) } },
    data: { leida: true, fechaLectura: new Date() },
  });

  return felicitacion;
}
