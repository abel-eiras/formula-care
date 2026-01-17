import { Router } from 'express';
import {
  obtenerEventos,
  obtenerEventosActivos,
  obtenerEvento,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
} from '../controllers/eventos.js';

export const eventosRouter = Router();

// Rutas públicas (sin autenticación)
eventosRouter.get('/activos', obtenerEventosActivos);

// Rutas protegidas (requieren autenticación)
eventosRouter.get('/', obtenerEventos);
eventosRouter.get('/:id', obtenerEvento);
eventosRouter.post('/', crearEvento);
eventosRouter.put('/:id', actualizarEvento);
eventosRouter.delete('/:id', eliminarEvento);
