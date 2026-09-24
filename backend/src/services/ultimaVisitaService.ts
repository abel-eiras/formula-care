import { prisma } from '../lib/prisma.js';

export type ServicioVisita = 'dermo' | 'bio' | 'nutricion';

export interface UltimaVisita {
  fecha: string; // YYYY-MM-DD
  servicio: ServicioVisita;
}

/**
 * Último servicio de cada paciente (análisis Dermo o Bio, o visita de
 * Nutrición). Se calcula al vuelo en lugar de guardarse, así nunca queda
 * desfasado al crear, editar o borrar un servicio.
 */
export async function obtenerUltimasVisitas(pacienteIds: string[]): Promise<Map<string, UltimaVisita>> {
  const ultimas = new Map<string, UltimaVisita>();
  if (pacienteIds.length === 0) return ultimas;

  const porPaciente = { pacienteId: { in: pacienteIds } };
  const [dermo, bio, programas] = await Promise.all([
    prisma.analisisDermo.groupBy({ by: ['pacienteId'], where: porPaciente, _max: { fecha: true } }),
    prisma.analisisBio.groupBy({ by: ['pacienteId'], where: porPaciente, _max: { fecha: true } }),
    prisma.programaNutricion.findMany({ where: porPaciente, select: { id: true, pacienteId: true } }),
  ]);
  const pacienteDePrograma = new Map(programas.map((p) => [p.id, p.pacienteId]));
  const nutricion = programas.length
    ? await prisma.visitaNutricion.groupBy({
        by: ['programaId'],
        where: { programaId: { in: programas.map((p) => p.id) } },
        _max: { fecha: true },
      })
    : [];

  const registrar = (pacienteId: string | undefined, fecha: string | null, servicio: ServicioVisita) => {
    if (!pacienteId || !fecha) return;
    const dia = fecha.slice(0, 10);
    if (dia > (ultimas.get(pacienteId)?.fecha ?? '')) ultimas.set(pacienteId, { fecha: dia, servicio });
  };
  dermo.forEach((d) => registrar(d.pacienteId, d._max.fecha, 'dermo'));
  bio.forEach((b) => registrar(b.pacienteId, b._max.fecha, 'bio'));
  nutricion.forEach((n) => registrar(pacienteDePrograma.get(n.programaId), n._max.fecha, 'nutricion'));
  return ultimas;
}
