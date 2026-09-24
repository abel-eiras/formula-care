import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getQueryLimit } from '../lib/queryHelpers.js';
import { hoyISO } from '../lib/fechas.js';
import { obtenerRevisionesProximas } from '../services/notificacionesService.js';
import { obtenerUltimasVisitas } from '../services/ultimaVisitaService.js';

/**
 * Pacientes con más de una visita (análisis dermo, bio o visitas de nutrición).
 * Se cuenta con agregados en la base de datos: cargar los análisis completos
 * de todos los pacientes tardaba segundos con unos miles de pacientes.
 */
async function contarPacientesRecurrentes(): Promise<number> {
  const [dermo, bio, nutricion] = await Promise.all([
    prisma.analisisDermo.groupBy({ by: ['pacienteId'], _count: { _all: true } }),
    prisma.analisisBio.groupBy({ by: ['pacienteId'], _count: { _all: true } }),
    // Las visitas de nutrición cuelgan del programa: se suman por paciente del programa
    prisma.$queryRaw<{ pacienteId: string; total: bigint }[]>`
      SELECT p."pacienteId" AS "pacienteId", COUNT(v."id") AS "total"
      FROM "VisitaNutricion" v JOIN "ProgramaNutricion" p ON p."id" = v."programaId"
      GROUP BY p."pacienteId"`,
  ]);

  const visitasPorPaciente = new Map<string, number>();
  const sumar = (pacienteId: string, n: number) =>
    visitasPorPaciente.set(pacienteId, (visitasPorPaciente.get(pacienteId) ?? 0) + n);
  dermo.forEach((f) => sumar(f.pacienteId, f._count._all));
  bio.forEach((f) => sumar(f.pacienteId, f._count._all));
  nutricion.forEach((f) => sumar(f.pacienteId, Number(f.total)));

  return [...visitasPorPaciente.values()].filter((n) => n > 1).length;
}

/** Rango [desde, hasta) de fechas "YYYY-MM-DD" de un mes, en hora local */
function rangoMes(anio: number, mes: number): { gte: string; lt: string } {
  // hoyISO usa la hora local; toISOString() desplazaría el inicio de mes al día anterior en España
  return { gte: hoyISO(new Date(anio, mes, 1)), lt: hoyISO(new Date(anio, mes + 1, 1)) };
}

/** Servicios realizados (Dermo, Bio y visitas de Nutrición) en un rango de fechas */
function contarServicios(rango: { gte: string; lt: string }) {
  return Promise.all([
    prisma.analisisDermo.count({ where: { fecha: rango } }),
    prisma.analisisBio.count({ where: { fecha: rango } }),
    prisma.visitaNutricion.count({ where: { fecha: rango } }),
  ]);
}

/**
 * Obtener estadísticas generales del dashboard
 */
export async function obtenerEstadisticas(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth();
    const inicioMes = new Date(anio, mes, 1);
    const inicioMesAnterior = new Date(anio, mes - 1, 1);

    // Todas las consultas son independientes: en paralelo
    const [
      totalPacientes,
      pacientesEsteMes,
      pacientesMesAnterior,
      [dermoEsteMes, bioEsteMes, nutricionEsteMes],
      [dermoMesAnterior, bioMesAnterior, nutricionMesAnterior],
      pacientesRecurrentes,
    ] = await Promise.all([
      prisma.paciente.count(),
      prisma.paciente.count({ where: { createdAt: { gte: inicioMes } } }),
      prisma.paciente.count({ where: { createdAt: { gte: inicioMesAnterior, lt: inicioMes } } }),
      contarServicios(rangoMes(anio, mes)),
      contarServicios(rangoMes(anio, mes - 1)),
      contarPacientesRecurrentes(),
    ]);

    const tasaRetorno = totalPacientes > 0 
      ? Math.round((pacientesRecurrentes / totalPacientes) * 100) 
      : 0;

    // Variación porcentual respecto al mes anterior
    const calcularTendencia = (actual: number, anterior: number): number => {
      if (anterior === 0) return actual > 0 ? 100 : 0;
      return Math.round(((actual - anterior) / anterior) * 100);
    };

    res.json({
      pacientes: {
        total: totalPacientes,
        esteMes: pacientesEsteMes,
        tendencia: calcularTendencia(pacientesEsteMes, pacientesMesAnterior),
      },
      analisisDermo: {
        esteMes: dermoEsteMes,
        tendencia: calcularTendencia(dermoEsteMes, dermoMesAnterior),
      },
      analisisBio: {
        esteMes: bioEsteMes,
        tendencia: calcularTendencia(bioEsteMes, bioMesAnterior),
      },
      visitasNutricion: {
        esteMes: nutricionEsteMes,
        tendencia: calcularTendencia(nutricionEsteMes, nutricionMesAnterior),
      },
      tasaRetorno: {
        valor: tasaRetorno,
        pacientesRecurrentes,
        totalPacientes,
      },
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

/**
 * Obtener evolución de servicios por mes (últimos 6 meses)
 */
export async function obtenerEvolucionAnalisis(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => new Date(ahora.getFullYear(), ahora.getMonth() - 5 + i, 1));

    const recuentos = await Promise.all(
      meses.map((fecha) => contarServicios(rangoMes(fecha.getFullYear(), fecha.getMonth())))
    );

    res.json(
      meses.map((fecha, i) => ({
        mes: fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        dermo: recuentos[i][0],
        bio: recuentos[i][1],
        nutricion: recuentos[i][2],
      }))
    );
  } catch (error) {
    console.error('Error al obtener evolución:', error);
    res.status(500).json({ error: 'Error al obtener evolución de análisis' });
  }
}

/**
 * Obtener pacientes recientes
 */
export async function obtenerPacientesRecientes(req: Request, res: Response) {
  try {
    const limit = getQueryLimit(req.query.limit, 5, 100);

    const pacientes = await prisma.paciente.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: { id: true, name: true, createdAt: true },
    });

    const ultimasVisitas = await obtenerUltimasVisitas(pacientes.map((p) => p.id));
    res.json(pacientes.map((p) => ({ ...p, ultimaVisita: ultimasVisitas.get(p.id) ?? null })));
  } catch (error) {
    console.error('Error al obtener pacientes recientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes recientes' });
  }
}

/**
 * Obtener próximas revisiones programadas
 */
export async function obtenerProximasRevisiones(req: Request, res: Response) {
  try {
    const hoy = hoyISO();
    const limite = getQueryLimit(req.query.limit, 10, 100);

    // Revisiones de Dermo y de Nutrición
    const resultado = await obtenerRevisionesProximas(hoy, undefined, limite);

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener próximas revisiones:', error);
    res.status(500).json({ error: 'Error al obtener próximas revisiones' });
  }
}
