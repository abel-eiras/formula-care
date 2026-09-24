import { Request, Response } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ultimasLineasRegistro } from '../lib/registro.js';

/**
 * Informe de diagnóstico para pedir ayuda: versión, sistema, estado de la
 * base de datos, del correo y de las copias, y las últimas líneas del
 * registro. No incluye datos de pacientes ni contraseñas.
 */
async function generarInforme(): Promise<string> {
  const rutaBd = (process.env.DATABASE_URL ?? '').replace(/^file:/, '');
  const [pacientes, citas, usuarios, config, migraciones] = await Promise.all([
    prisma.paciente.count(),
    prisma.cita.count(),
    prisma.usuario.count(),
    prisma.configuracion.findUnique({ where: { id: 'singleton' } }),
    prisma.$queryRawUnsafe<{ migration_name: string; finished_at: string | null }[]>(
      'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5'
    ),
  ]);
  const errorMigracion = path.join(path.dirname(rutaBd), 'migrate-error.log');

  const lineas = [
    `Formula Care — diagnóstico (${new Date().toISOString()})`,
    '',
    `Versión de la app: ${process.env.APP_VERSION ?? 'desarrollo'}`,
    `Sistema: ${os.type()} ${os.release()} (${os.arch()}) · Node ${process.version}`,
    `Base de datos: ${rutaBd && fs.existsSync(rutaBd) ? `${(fs.statSync(rutaBd).size / 1024 / 1024).toFixed(1)} MB` : 'no encontrada'}`,
    `Registros: ${pacientes} pacientes, ${citas} citas, ${usuarios} usuarios`,
    `Migraciones recientes: ${migraciones.map((m) => `${m.migration_name}${m.finished_at ? '' : ' (SIN TERMINAR)'}`).join(', ')}`,
    '',
    `Correo: ${config?.emailProvider ?? 'sin configurar'}${config?.emailProvider === 'smtp' ? ` · servidor ${config.smtpHost ? `${config.smtpHost}:${config.smtpPort ?? ''}` : 'sin indicar'}` : ''}`,
    `Copias: ${config?.backupPeriodicidad ?? 'diaria'}, última ${config?.backupUltimaEjecucion?.toISOString() ?? 'nunca'}, cifradas: ${config?.backupCifrado ? 'sí' : 'no'}, carpeta extra: ${config?.backupCarpetaExtra ? 'sí' : 'no'}`,
    config?.backupUltimoError ? `Aviso de copias: ${config.backupUltimoError}` : '',
    '',
    fs.existsSync(errorMigracion) ? `Error de migración:\n${fs.readFileSync(errorMigracion, 'utf8')}` : 'Sin errores de migración.',
    '',
    '— Últimas líneas del registro —',
    ultimasLineasRegistro(300),
  ];
  return lineas.filter((l, i, todas) => !(l === '' && todas[i - 1] === '')).join('\n');
}

/** GET: el informe como texto. POST { destino }: lo guarda en esa ruta (app de escritorio) */
export async function exportarDiagnostico(req: Request, res: Response) {
  try {
    const informe = await generarInforme();
    if (req.method === 'GET') return res.type('text/plain').send(informe);
    const { destino } = z.object({ destino: z.string().refine((d) => path.isAbsolute(d)) }).parse(req.body);
    const final = destino.endsWith('.txt') ? destino : `${destino}.txt`;
    fs.writeFileSync(final, informe, 'utf8');
    res.json({ ruta: final });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Ruta de destino no válida' });
    console.error('Error al generar el diagnóstico:', error);
    res.status(500).json({ error: 'No se pudo generar el diagnóstico' });
  }
}
