import { prisma } from '../lib/prisma.js';
import { hoyISO } from '../lib/fechas.js';
import { enviarRecordatorioCita } from './emailService.js';

/**
 * Avisos automáticos que antes dependían del servidor web (tareas periódicas).
 * Se ejecutan al arrancar la app y cada hora (ver tareasProgramadas.ts); todos
 * son idempotentes, así que repetirlos no duplica nada.
 */

/** Días de antelación con los que se avisa de una revisión */
export const DIAS_AVISO_REVISION = 7;

export interface RevisionProxima {
  id: string;
  servicio: 'dermo' | 'nutricion';
  pacienteId: string;
  proximaRevision: string;
  paciente: { id: string; name: string; phone: string; email: string | null };
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return hoyISO(d);
}

const SELECT_PACIENTE = { select: { id: true, name: true, phone: true, email: true } } as const;

/**
 * Revisiones programadas (Dermo y Nutrición) desde una fecha, las más próximas primero.
 * Las fechas se comparan como texto "YYYY-MM-DD" (Dermo puede guardar fecha y hora).
 */
export async function obtenerRevisionesProximas(desde: string, hasta?: string, limite = 100): Promise<RevisionProxima[]> {
  const rango = { gte: desde, ...(hasta ? { lte: `${hasta}￿` } : {}) };
  const [dermo, visitas] = await Promise.all([
    prisma.analisisDermo.findMany({
      where: { proximaRevision: rango },
      include: { paciente: SELECT_PACIENTE },
      orderBy: { proximaRevision: 'asc' },
      take: limite,
    }),
    prisma.visitaNutricion.findMany({
      where: { proximaRevision: rango },
      include: { programa: { select: { paciente: SELECT_PACIENTE } } },
      orderBy: { proximaRevision: 'asc' },
      take: limite,
    }),
  ]);

  return [
    ...dermo.map((a) => ({
      id: a.id,
      servicio: 'dermo' as const,
      pacienteId: a.pacienteId,
      proximaRevision: a.proximaRevision!.slice(0, 10),
      paciente: a.paciente,
    })),
    ...visitas.map((v) => ({
      id: v.id,
      servicio: 'nutricion' as const,
      pacienteId: v.programa.paciente.id,
      proximaRevision: v.proximaRevision!.slice(0, 10),
      paciente: v.programa.paciente,
    })),
  ]
    .sort((a, b) => a.proximaRevision.localeCompare(b.proximaRevision))
    .slice(0, limite);
}

/**
 * Aviso interno por cada revisión que cae en los próximos días.
 * Se identifica por registro y fecha: si se cambia la fecha, se avisa de nuevo.
 */
export async function generarAvisosRevisiones(): Promise<number> {
  const hoy = hoyISO();
  const revisiones = await obtenerRevisionesProximas(hoy, sumarDias(hoy, DIAS_AVISO_REVISION));
  let creados = 0;

  for (const r of revisiones) {
    const fecha = new Date(`${r.proximaRevision}T12:00:00`).toLocaleDateString('es-ES');
    const mensaje = `Revisión de ${r.servicio === 'dermo' ? 'dermocosmética' : 'nutrición'} de ${r.paciente.name} el ${fecha}`;
    const existe = await prisma.notificacion.findFirst({
      where: { tipo: 'revision', analisisId: r.id, mensaje },
      select: { id: true },
    });
    if (existe) continue;

    await prisma.notificacion.create({
      data: {
        tipo: 'revision',
        pacienteId: r.pacienteId,
        analisisId: r.id,
        titulo: 'Revisión próxima',
        mensaje,
        canal: 'interno',
      },
    });
    creados++;
  }
  return creados;
}

/**
 * Email de recordatorio a los pacientes con cita mañana. Solo se marca como
 * enviado si el envío funciona, así que se reintenta en la siguiente pasada
 * (por ejemplo, si el correo aún no estaba configurado).
 */
export async function enviarRecordatoriosCitas(): Promise<number> {
  const manana = sumarDias(hoyISO(), 1);
  const citas = await prisma.cita.findMany({
    where: {
      fecha: { gte: manana, lte: `${manana}￿` },
      estado: { not: 'cancelada' },
      recordatorioEnviado: false,
      paciente: { email: { not: null } },
    },
    include: { paciente: { select: { name: true, email: true } } },
  });

  let enviados = 0;
  for (const cita of citas) {
    if (!cita.paciente.email) continue;
    const ok = await enviarRecordatorioCita(cita.paciente.email, {
      citaId: cita.id,
      tipo: cita.tipo,
      fecha: cita.fecha,
      hora: cita.hora,
      nombreCliente: cita.paciente.name,
    });
    if (ok) enviados++;
  }
  return enviados;
}
