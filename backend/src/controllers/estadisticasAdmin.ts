/**
 * Controlador de Estadísticas de Plataforma
 * Métricas globales para el dashboard de superadmin
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * GET /api/admin/estadisticas
 * Obtener estadísticas globales de la plataforma
 */
export async function obtenerEstadisticasPlataforma(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    // Contadores básicos
    const [
      totalFarmacias,
      farmaciasActivas,
      totalUsuarios,
      totalPacientes,
    ] = await Promise.all([
      prisma.farmacia.count(),
      prisma.farmacia.count({ where: { activa: true } }),
      prisma.usuario.count({ where: { rol: { not: 'superadmin' } } }),
      prisma.paciente.count(),
    ]);

    // Citas por periodo
    const hoyStr = hoy.toISOString().split('T')[0];
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];
    const inicioMesStr = inicioMes.toISOString().split('T')[0];

    const [citasHoy, citasSemana, citasMes] = await Promise.all([
      prisma.cita.count({ where: { fecha: hoyStr } }),
      prisma.cita.count({ where: { fecha: { gte: inicioSemanaStr } } }),
      prisma.cita.count({ where: { fecha: { gte: inicioMesStr } } }),
    ]);

    // Farmacias por plan
    const farmaciasPorPlan = await prisma.farmacia.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });

    const planesCount = {
      basico: 0,
      profesional: 0,
      enterprise: 0,
    };
    farmaciasPorPlan.forEach(item => {
      if (item.plan in planesCount) {
        planesCount[item.plan as keyof typeof planesCount] = item._count.plan;
      }
    });

    // Farmacias con plan próximo a expirar (en los próximos 30 días)
    const fechaLimite = new Date(ahora);
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const farmaciasProximasExpirar = await prisma.farmacia.findMany({
      where: {
        activa: true,
        fechaExpiracion: {
          lte: fechaLimite,
          gte: ahora,
        },
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        plan: true,
        fechaExpiracion: true,
      },
      orderBy: { fechaExpiracion: 'asc' },
      take: 5,
    });

    // Últimas farmacias registradas
    const ultimasFarmacias = await prisma.farmacia.findMany({
      select: {
        id: true,
        nombre: true,
        slug: true,
        plan: true,
        activa: true,
        fechaAlta: true,
        _count: {
          select: {
            usuarios: true,
            pacientes: true,
          }
        }
      },
      orderBy: { fechaAlta: 'desc' },
      take: 5,
    });

    // Crecimiento mensual (últimos 6 meses)
    const crecimientoMensual = await obtenerCrecimientoMensual();

    // Actividad reciente (últimos logins)
    const actividadReciente = await prisma.usuario.findMany({
      where: {
        ultimoAcceso: { not: null },
        rol: { not: 'superadmin' },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        ultimoAcceso: true,
        farmacia: {
          select: {
            nombre: true,
            slug: true,
          }
        }
      },
      orderBy: { ultimoAcceso: 'desc' },
      take: 10,
    });

    // Top farmacias por actividad (más citas este mes)
    const topFarmaciasActividad = await prisma.farmacia.findMany({
      where: { activa: true },
      select: {
        id: true,
        nombre: true,
        slug: true,
        plan: true,
        _count: {
          select: {
            citas: true,
            pacientes: true,
          }
        }
      },
      orderBy: {
        pacientes: { _count: 'desc' }
      },
      take: 5,
    });

    res.json({
      // Contadores principales
      totalFarmacias,
      farmaciasActivas,
      farmaciasInactivas: totalFarmacias - farmaciasActivas,
      totalUsuarios,
      totalPacientes,
      
      // Citas
      citasHoy,
      citasSemana,
      citasMes,
      
      // Distribución por plan
      farmaciasPorPlan: planesCount,
      
      // Alertas
      farmaciasProximasExpirar: farmaciasProximasExpirar.map(f => ({
        ...f,
        fechaExpiracion: f.fechaExpiracion?.toISOString(),
      })),
      
      // Actividad
      ultimasFarmacias: ultimasFarmacias.map(f => ({
        id: f.id,
        nombre: f.nombre,
        slug: f.slug,
        plan: f.plan,
        activa: f.activa,
        fechaAlta: f.fechaAlta.toISOString(),
        totalUsuarios: f._count.usuarios,
        totalPacientes: f._count.pacientes,
      })),
      
      crecimientoMensual,
      
      actividadReciente: actividadReciente.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        ultimoAcceso: u.ultimoAcceso?.toISOString(),
        farmacia: u.farmacia,
      })),
      
      topFarmacias: topFarmaciasActividad.map(f => ({
        id: f.id,
        nombre: f.nombre,
        slug: f.slug,
        plan: f.plan,
        totalCitas: f._count.citas,
        totalPacientes: f._count.pacientes,
      })),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Obtener crecimiento mensual de farmacias (últimos 6 meses)
 */
async function obtenerCrecimientoMensual(): Promise<{ mes: string; farmacias: number }[]> {
  const resultado: { mes: string; farmacias: number }[] = [];
  const ahora = new Date();

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    
    const count = await prisma.farmacia.count({
      where: {
        fechaAlta: {
          lte: finMes,
        }
      }
    });

    // Formatear mes en español
    const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    
    resultado.push({
      mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
      farmacias: count,
    });
  }

  return resultado;
}
