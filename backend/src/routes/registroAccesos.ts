import { Router } from 'express';
import { exportarAccesos, listarAccesos } from '../controllers/registroAccesos.js';

// Montado en /api/registro-accesos, solo para administradores
export const registroAccesosRouter = Router();

registroAccesosRouter.get('/', listarAccesos);
registroAccesosRouter.get('/exportar', exportarAccesos);
registroAccesosRouter.post('/exportar', exportarAccesos);
