import { Router } from 'express';
import { obtenerDisponibilidadPublica, solicitarCita } from '../controllers/solicitudesPublicas.js';

export const publicRouter = Router();

// Endpoints públicos (sin autenticación)
publicRouter.get('/disponibilidad', obtenerDisponibilidadPublica);
publicRouter.post('/solicitar-cita', solicitarCita);
