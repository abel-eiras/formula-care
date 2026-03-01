import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getQueryLimit } from '../lib/queryHelpers.js';

/**
 * Obtener estadísticas generales del dashboard
 */
export async function obtenerEstadisticas(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

    // Total de pacientes
    const totalPacientes = await prisma.paciente.count();
    const pacientesEsteMes = await prisma.paciente.count({
      where: {
        createdAt: {
          gte: inicioMes.toISOString(),
        },
      },
    });
    const pacientesMesAnterior = await prisma.paciente.count({
      where: {
        createdAt: {
          gte: inicioMesAnterior.toISOString(),
          lte: finMesAnterior.toISOString(),
        },
      },
    });

    // Análisis dermocosméticos
    const analisisDermoEsteMes = await prisma.analisisDermo.count({
      where: {
        fecha: {
          gte: inicioMes.toISOString().split('T')[0],
        },
      },
    });
    const analisisDermoMesAnterior = await prisma.analisisDermo.count({
      where: {
        fecha: {
          gte: inicioMesAnterior.toISOString().split('T')[0],
          lte: finMesAnterior.toISOString().split('T')[0],
        },
      },
    });

    // Análisis bioquímicos
    const analisisBioEsteMes = await prisma.analisisBio.count({
      where: {
        fecha: {
          gte: inicioMes.toISOString().split('T')[0],
        },
      },
    });
    const analisisBioMesAnterior = await prisma.analisisBio.count({
      where: {
        fecha: {
          gte: inicioMesAnterior.toISOString().split('T')[0],
          lte: finMesAnterior.toISOString().split('T')[0],
        },
      },
    });

    // Calcular tasa de retorno (pacientes con más de un análisis)
    const pacientesConAnalisis = await prisma.paciente.findMany({
      include: {
        analisisDermo: true,
        analisisBio: true,
      },
    });

    const pacientesRecurrentes = pacientesConAnalisis.filter(
      (p) => p.analisisDermo.length + p.analisisBio.length > 1
    ).length;

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

    res.json(pacientes);
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

    res.json(analisisConRevision);
  } catch (error) {
    console.error('Error al obtener próximas revisiones:', error);
    res.status(500).json({ error: 'Error al obtener próximas revisiones' });
  }
}
