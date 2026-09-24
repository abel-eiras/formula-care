import { Router } from 'express';
import { borrar, crear, exportar, importar, listar } from '../controllers/backups.js';
import { verificarRol } from '../middleware/auth.js';

export const backupsRouter = Router();

backupsRouter.get('/', listar);
backupsRouter.post('/', crear);
// Borrar, restaurar (sustituye todos los datos) y guardar fuera: solo administradores
backupsRouter.delete('/:nombre', verificarRol('admin'), borrar);
backupsRouter.post('/import', verificarRol('admin'), importar);
backupsRouter.post('/:nombre/exportar', verificarRol('admin'), exportar);
