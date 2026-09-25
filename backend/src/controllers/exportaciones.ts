import { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hoyISO } from '../lib/fechas.js';
import { obtenerUltimasVisitas } from '../services/ultimaVisitaService.js';

/**
 * Exportaciones a CSV para abrir en Excel/LibreOffice: separador ";" y BOM
 * UTF-8, que es lo que Excel en español espera (tildes y columnas bien).
 */

type Celda = string | number | null | undefined;

export function aCsv(cabecera: string[], filas: Celda[][]): string {
  const celda = (v: Celda) => {
    const texto = v === null || v === undefined ? '' : String(v);
    // Evita que Excel interprete fórmulas en datos escritos por usuarios
    const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
    return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n';
}

function edad(birthDate: string, hoy = hoyISO()): number {
  const [a, m, d] = birthDate.split('-').map(Number);
  const [ha, hm, hd] = hoy.split('-').map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

async function csvPacientes(): Promise<string> {
  const pacientes = await prisma.paciente.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { analisisDermo: true, analisisBio: true, programasNutricion: true, citas: true } } },
  });
  const ultimas = await obtenerUltimasVisitas(pacientes.map((p) => p.id));
  return aCsv(
    ['Nombre', 'Teléfono', 'Email', 'Fecha de nacimiento', 'Edad', 'Sexo', 'Alta', 'Análisis dermo', 'Análisis bio', 'Programas nutrición', 'Citas', 'Última visita', 'Consentimiento'],
    pacientes.map((p) => [
      p.name,
      p.phone,
      p.email,
      p.birthDate,
      edad(p.birthDate),
      p.sex === 'M' ? 'Hombre' : p.sex === 'F' ? 'Mujer' : 'Otro',
      p.createdAt.toISOString().slice(0, 10),
      p._count.analisisDermo,
      p._count.analisisBio,
      p._count.programasNutricion,
      p._count.citas,
      ultimas.get(p.id)?.fecha,
      p.consentimientoFecha ? p.consentimientoFecha.toISOString().slice(0, 10) : '',
    ])
  );
}

/** Actividad por mes de los últimos 12 meses (para memorias e informes) */
async function csvActividad(): Promise<string> {
  const hoy = new Date();
  const meses = Array.from({ length: 12 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth() - 11 + i, 1));
  const rango = (d: Date) => ({ gte: hoyISO(d), lt: hoyISO(new Date(d.getFullYear(), d.getMonth() + 1, 1)) });

  const filas = await Promise.all(
    meses.map(async (mes) => {
      const r = rango(mes);
      const [nuevos, dermo, bio, nutricion, realizadas, noPresentado, canceladas] = await Promise.all([
        prisma.paciente.count({ where: { createdAt: { gte: new Date(`${r.gte}T00:00:00`), lt: new Date(`${r.lt}T00:00:00`) } } }),
        prisma.analisisDermo.count({ where: { fecha: r } }),
        prisma.analisisBio.count({ where: { fecha: r } }),
        prisma.visitaNutricion.count({ where: { fecha: r } }),
        prisma.cita.count({ where: { fecha: r, estado: 'completada' } }),
        prisma.cita.count({ where: { fecha: r, estado: 'no_presentado' } }),
        prisma.cita.count({ where: { fecha: r, estado: 'cancelada' } }),
      ]);
      return [r.gte.slice(0, 7), nuevos, dermo, bio, nutricion, dermo + bio + nutricion, realizadas, noPresentado, canceladas];
    })
  );
  return aCsv(
    ['Mes', 'Pacientes nuevos', 'Análisis dermo', 'Análisis bio', 'Visitas nutrición', 'Total servicios', 'Citas realizadas', 'No se presentaron', 'Citas canceladas'],
    filas
  );
}

const GENERADORES: Record<string, () => Promise<string>> = {
  pacientes: csvPacientes,
  actividad: csvActividad,
};

/** GET /api/exportar/:tipo → CSV. POST { destino } → lo guarda en esa ruta (app de escritorio) */
export async function exportarCsv(req: Request, res: Response) {
  const generar = GENERADORES[String(req.params.tipo)];
  if (!generar) return res.status(404).json({ error: 'Exportación no disponible' });
  try {
    const csv = await generar();
    if (req.method === 'GET') return res.type('text/csv; charset=utf-8').send(csv);
    const { destino } = z.object({ destino: z.string().refine((d) => path.isAbsolute(d)) }).parse(req.body);
    const final = destino.toLowerCase().endsWith('.csv') ? destino : `${destino}.csv`;
    fs.writeFileSync(final, csv, 'utf8');
    res.json({ ruta: final });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Ruta de destino no válida' });
    console.error('Error al exportar:', error);
    res.status(500).json({ error: `No se pudo exportar: ${(error as Error).message}` });
  }
}
