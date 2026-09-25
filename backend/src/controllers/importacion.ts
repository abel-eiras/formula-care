import { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ErrorPlantilla, generarPlantilla, importarPacientes, leerImportacion } from '../services/importacionPacientes.js';

// Un Excel de pacientes de una farmacia ocupa muy poco; esto evita sustos
const TAMANO_MAXIMO = 15 * 1024 * 1024;

const origenSchema = z.union([
  // App de escritorio: ruta elegida en el diálogo «Abrir»
  z.object({ ruta: z.string().refine((r) => path.isAbsolute(r), 'Ruta no válida') }),
  // Navegador (desarrollo): el archivo en base64
  z.object({ contenido: z.string().min(1) }),
]);

function leerArchivo(body: unknown): Buffer {
  const origen = origenSchema.parse(body);
  if ('ruta' in origen) {
    if (fs.statSync(origen.ruta).size > TAMANO_MAXIMO) throw new ErrorPlantilla('El archivo es demasiado grande.');
    return fs.readFileSync(origen.ruta);
  }
  const buffer = Buffer.from(origen.contenido, 'base64');
  if (buffer.length > TAMANO_MAXIMO) throw new ErrorPlantilla('El archivo es demasiado grande.');
  return buffer;
}

function responderError(res: Response, error: unknown, accion: string) {
  if (error instanceof ErrorPlantilla) return res.status(400).json({ error: error.message });
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Archivo no válido' });
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return res.status(400).json({ error: 'No se encuentra el archivo' });
  console.error(`Error al ${accion}:`, error);
  res.status(500).json({ error: `No se ha podido ${accion}` });
}

/**
 * Plantilla Excel para importar pacientes.
 * GET la devuelve; POST { destino } la guarda en esa ruta (app de escritorio).
 * /api/pacientes/plantilla-importacion
 */
export async function descargarPlantilla(req: Request, res: Response) {
  try {
    const plantilla = await generarPlantilla();
    if (req.method === 'GET') {
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-pacientes.xlsx"');
      return res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(plantilla);
    }
    const { destino } = z.object({ destino: z.string().refine((d) => path.isAbsolute(d)) }).parse(req.body);
    const final = destino.toLowerCase().endsWith('.xlsx') ? destino : `${destino}.xlsx`;
    fs.writeFileSync(final, plantilla);
    res.json({ ruta: final });
  } catch (error) {
    responderError(res, error, 'generar la plantilla');
  }
}

/**
 * Revisa el Excel sin importar nada: filas válidas, con errores y duplicadas
 * POST /api/pacientes/importar/revisar
 */
export async function revisarImportacion(req: Request, res: Response) {
  try {
    const resultado = await leerImportacion(leerArchivo(req.body));
    res.json({
      validas: resultado.validas.map((v) => ({ fila: v.fila, nombre: v.datos.name, telefono: v.datos.phone, fechaNacimiento: v.datos.birthDate })),
      errores: resultado.errores,
      duplicados: resultado.duplicados,
    });
  } catch (error) {
    responderError(res, error, 'leer el archivo');
  }
}

/**
 * Importa las filas válidas (las demás se saltan)
 * POST /api/pacientes/importar
 */
export async function ejecutarImportacion(req: Request, res: Response) {
  try {
    const resultado = await importarPacientes(leerArchivo(req.body));
    res.json({
      importados: resultado.importados,
      errores: resultado.errores.length,
      duplicados: resultado.duplicados.length,
    });
  } catch (error) {
    responderError(res, error, 'importar los pacientes');
  }
}
