import { Router } from 'express';
import { borrar, crear, importar, listar } from '../controllers/backups.js';

export const backupsRouter = Router();

backupsRouter.get('/', listar);
backupsRouter.post('/', crear);
backupsRouter.delete('/:nombre', borrar);
backupsRouter.post('/import', importar);
