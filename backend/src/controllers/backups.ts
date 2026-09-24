import { Request, Response } from 'express';
import { z } from 'zod';
import {
  BackupError,
  borrarBackup,
  crearBackup,
  exportarBackup,
  importarBackup,
  listarBackups,
} from '../services/backupService.js';

/**
 * Listar las copias de seguridad existentes
 * GET /api/backups
 */
export async function listar(req: Request, res: Response) {
  try {
    res.json(listarBackups());
  } catch (error) {
    console.error('Error al listar copias de seguridad:', error);
    res.status(500).json({ error: 'Error al listar copias de seguridad' });
  }
}

/**
 * Generar una copia de seguridad ahora mismo
 * POST /api/backups
 */
export async function crear(req: Request, res: Response) {
  try {
    const backup = await crearBackup();
    res.status(201).json(backup);
  } catch (error) {
    if (error instanceof BackupError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al crear la copia de seguridad:', error);
    res.status(500).json({ error: 'Error al crear la copia de seguridad' });
  }
}

/**
 * Borrar una copia de seguridad
 * DELETE /api/backups/:nombre
 */
export async function borrar(req: Request, res: Response) {
  try {
    borrarBackup(String(req.params.nombre));
    res.status(204).send();
  } catch (error) {
    if (error instanceof BackupError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al borrar la copia de seguridad:', error);
    res.status(500).json({ error: 'Error al borrar la copia de seguridad' });
  }
}

/**
 * Guardar una copia donde elija el usuario (USB, carpeta sincronizada...)
 * POST /api/backups/:nombre/exportar { destino }
 */
export async function exportar(req: Request, res: Response) {
  try {
    const { destino } = z.object({ destino: z.string().min(1) }).parse(req.body);
    exportarBackup(String(req.params.nombre), destino);
    res.json({ mensaje: 'Copia guardada' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos' });
    if (error instanceof BackupError) return res.status(400).json({ error: error.message });
    console.error('Error al guardar la copia de seguridad:', error);
    res.status(500).json({ error: 'Error al guardar la copia de seguridad' });
  }
}

const importarSchema = z.object({
  path: z.string().min(1),
  password: z.string().optional(),
});

/**
 * Importar (restaurar) una copia de seguridad. Sustituye TODOS los datos
 * actuales. El cliente debe reiniciar la app tras una respuesta exitosa.
 * POST /api/backups/import
 */
export async function importar(req: Request, res: Response) {
  try {
    const { path: filePath, password } = importarSchema.parse(req.body);
    await importarBackup(filePath, password);
    res.json({ mensaje: 'Copia de seguridad restaurada. Vuelve a iniciar sesión.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    if (error instanceof BackupError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al importar la copia de seguridad:', error);
    res.status(500).json({ error: 'Error al importar la copia de seguridad' });
  }
}
