import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getParamString } from '../lib/queryHelpers.js';
import { constanciaConsentimiento, exportarDatosPaciente, pacientesFueraDeRetencion } from '../services/rgpdService.js';

/**
 * Registrar que el paciente ha dado su consentimiento (con la versión vigente)
 * POST /api/pacientes/:id/consentimiento
 */
export async function registrarConsentimiento(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const existe = await prisma.paciente.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return res.status(404).json({ error: 'Paciente no encontrado' });
    const paciente = await prisma.paciente.update({
      where: { id },
      data: await constanciaConsentimiento(),
      select: { consentimientoFecha: true, consentimientoVersion: true },
    });
    res.json(paciente);
  } catch (error) {
    console.error('Error al registrar el consentimiento:', error);
    res.status(500).json({ error: 'Error al registrar el consentimiento' });
  }
}

/**
 * Datos completos de un paciente (derecho de acceso / portabilidad).
 * GET devuelve el JSON; POST con { destino } lo guarda en esa ruta (app de escritorio).
 */
export async function exportarPaciente(req: Request, res: Response) {
  try {
    const datos = await exportarDatosPaciente(getParamString(req.params.id) ?? '');
    if (!datos) return res.status(404).json({ error: 'Paciente no encontrado' });
    if (req.method === 'GET') return res.json(datos);

    const { destino } = z
      .object({ destino: z.string().min(1).refine((d) => path.isAbsolute(d), 'Ruta no válida') })
      .parse(req.body);
    const final = destino.toLowerCase().endsWith('.json') ? destino : `${destino}.json`;
    fs.writeFileSync(final, JSON.stringify(datos, null, 2), 'utf8');
    res.json({ mensaje: 'Datos exportados', ruta: final });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Ruta de destino no válida' });
    console.error('Error al exportar los datos del paciente:', error);
    res.status(500).json({ error: `No se pudieron exportar los datos: ${(error as Error).message}` });
  }
}

/**
 * Pacientes que han superado el periodo de retención configurado
 * GET /api/pacientes/retencion
 */
export async function listarRetencionVencida(_req: Request, res: Response) {
  try {
    res.json(await pacientesFueraDeRetencion());
  } catch (error) {
    console.error('Error al calcular la retención:', error);
    res.status(500).json({ error: 'Error al calcular los pacientes fuera de plazo' });
  }
}
