import { Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { aCsv, responderCsv } from './exportaciones.js';

const POR_PAGINA = 50;

const filtrosSchema = z.object({
  pacienteId: z.string().optional(),
  usuarioId: z.string().optional(),
  // Busca en el nombre del paciente o del usuario
  texto: z.string().trim().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pagina: z.coerce.number().int().min(1).optional(),
});

function construirFiltro(filtros: z.infer<typeof filtrosSchema>): Prisma.RegistroAccesoWhereInput {
  const where: Prisma.RegistroAccesoWhereInput = {};
  if (filtros.pacienteId) where.pacienteId = filtros.pacienteId;
  if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
  if (filtros.texto) {
    where.OR = [{ pacienteNombre: { contains: filtros.texto } }, { usuarioNombre: { contains: filtros.texto } }];
  }
  if (filtros.desde || filtros.hasta) {
    where.fecha = {
      ...(filtros.desde ? { gte: new Date(`${filtros.desde}T00:00:00`) } : {}),
      ...(filtros.hasta ? { lte: new Date(`${filtros.hasta}T23:59:59.999`) } : {}),
    };
  }
  return where;
}

/**
 * Registro de accesos, más reciente primero (solo administradores)
 * GET /api/registro-accesos?texto=&pacienteId=&usuarioId=&desde=&hasta=&pagina=
 */
export async function listarAccesos(req: Request, res: Response) {
  try {
    const filtros = filtrosSchema.parse(req.query);
    const where = construirFiltro(filtros);
    const pagina = filtros.pagina ?? 1;
    const [total, entradas] = await Promise.all([
      prisma.registroAcceso.count({ where }),
      prisma.registroAcceso.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
      }),
    ]);
    res.json({ entradas, total, pagina, porPagina: POR_PAGINA });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Filtros no válidos' });
    console.error('Error al leer el registro de accesos:', error);
    res.status(500).json({ error: 'Error al leer el registro de accesos' });
  }
}

/**
 * Exporta a CSV el registro filtrado (GET lo devuelve, POST { destino } lo guarda)
 * /api/registro-accesos/exportar
 */
export async function exportarAccesos(req: Request, res: Response) {
  const filtros = filtrosSchema.safeParse(req.query);
  if (!filtros.success) return res.status(400).json({ error: 'Filtros no válidos' });
  return responderCsv(req, res, async () => {
    const entradas = await prisma.registroAcceso.findMany({
      where: construirFiltro(filtros.data),
      orderBy: { fecha: 'desc' },
    });
    return aCsv(
      ['Fecha', 'Usuario', 'Acción', 'Qué', 'Paciente', 'Detalle'],
      entradas.map((e) => [
        e.fecha.toLocaleString('es-ES'),
        e.usuarioNombre,
        e.accion,
        e.recurso,
        e.pacienteNombre,
        e.detalle,
      ])
    );
  });
}
