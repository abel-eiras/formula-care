import { Router } from 'express';
import {
  obtenerSolicitudes,
  obtenerSolicitud,
  aprobarSolicitud,
  rechazarSolicitud,
} from '../controllers/solicitudes.js';

export const solicitudesRouter = Router();

// Rutas para gestionar solicitudes de citas
solicitudesRouter.get('/', obtenerSolicitudes);
solicitudesRouter.get('/:id', obtenerSolicitud);
solicitudesRouter.post('/:id/aprobar', aprobarSolicitud);
solicitudesRouter.post('/:id/rechazar', rechazarSolicitud);
