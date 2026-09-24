import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getQueryLimit } from '../lib/queryHelpers.js';
import { decryptPacienteData, decryptPacientesList } from '../services/encryptionService.js';

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

/**
 * Obtener estadísticas generales del dashboard
 */
export async function obtenerEstadisticas(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

    const mesActual = { gte: inicioMes.toISOString().split('T')[0] };
    const mesAnterior = {
      gte: inicioMesAnterior.toISOString().split('T')[0],
      lte: finMesAnterior.toISOString().split('T')[0],
    };

    // Todas las consultas son independientes: en paralelo
    const [
      totalPacientes,
      pacientesEsteMes,
      pacientesMesAnterior,
      analisisDermoEsteMes,
      analisisDermoMesAnterior,
      analisisBioEsteMes,
      analisisBioMesAnterior,
      pacientesRecurrentes,
    ] = await Promise.all([
      prisma.paciente.count(),
      prisma.paciente.count({ where: { createdAt: { gte: inicioMes.toISOString() } } }),
      prisma.paciente.count({
        where: { createdAt: { gte: inicioMesAnterior.toISOString(), lte: finMesAnterior.toISOString() } },
      }),
      prisma.analisisDermo.count({ where: { fecha: mesActual } }),
      prisma.analisisDermo.count({ where: { fecha: mesAnterior } }),
      prisma.analisisBio.count({ where: { fecha: mesActual } }),
      prisma.analisisBio.count({ where: { fecha: mesAnterior } }),
      contarPacientesRecurrentes(),
    ]);

    const tasaRetorno = totalPacientes > 0 
      ? Math.round((pacientesRecurrentes / totalPacientes) * 100) 
      : 0;

    // Calcular tendencias
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
        esteMes: analisisDermoEsteMes,
        tendencia: calcularTendencia(analisisDermoEsteMes, analisisDermoMesAnterior),
      },
      analisisBio: {
        esteMes: analisisBioEsteMes,
        tendencia: calcularTendencia(analisisBioEsteMes, analisisBioMesAnterior),
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
 * Obtener evolución de análisis por mes (últimos 6 meses)
 */
export async function obtenerEvolucionAnalisis(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const meses: { mes: string; dermo: number; bio: number }[] = [];

    // Obtener datos de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const siguienteMes = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 1);
      
      const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });

      const dermo = await prisma.analisisDermo.count({
        where: {
          fecha: {
            gte: fecha.toISOString().split('T')[0],
            lt: siguienteMes.toISOString().split('T')[0],
          },
        },
      });

      const bio = await prisma.analisisBio.count({
        where: {
          fecha: {
            gte: fecha.toISOString().split('T')[0],
            lt: siguienteMes.toISOString().split('T')[0],
          },
        },
      });

      meses.push({ mes: mesNombre, dermo, bio });
    }

    res.json(meses);
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
      include: {
        analisisDermo: {
          take: 1,
          orderBy: { fecha: 'desc' },
        },
        analisisBio: {
          take: 1,
          orderBy: { fecha: 'desc' },
        },
      },
    });

    res.json(decryptPacientesList(pacientes));
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
    const hoy = new Date().toISOString().split('T')[0];
    const limite = getQueryLimit(req.query.limit, 10, 100);

    // Obtener análisis dermocosméticos con próxima revisión
    const analisisConRevision = await prisma.analisisDermo.findMany({
      where: {
        AND: [
          { proximaRevision: { not: null } },
          { proximaRevision: { gte: hoy } },
        ],
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        proximaRevision: 'asc',
      },
      take: limite,
    });

    const resultado = analisisConRevision.map((analisis) => ({
      ...analisis,
      paciente: analisis.paciente ? decryptPacienteData(analisis.paciente) : analisis.paciente,
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener próximas revisiones:', error);
    res.status(500).json({ error: 'Error al obtener próximas revisiones' });
  }
}
