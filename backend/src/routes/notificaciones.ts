import { Router } from 'express';
import {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerContadorNotificaciones,
  crearNotificacion,
} from '../controllers/notificaciones.js';

export const notificacionesRouter = Router();

notificacionesRouter.get('/', obtenerNotificaciones);
notificacionesRouter.get('/contador', obtenerContadorNotificaciones);
notificacionesRouter.put('/:id/leida', marcarNotificacionLeida);
notificacionesRouter.put('/marcar-todas-leidas', marcarTodasLeidas);
notificacionesRouter.post('/', crearNotificacion);
