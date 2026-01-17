import { Router } from 'express';
import {
  obtenerEstadisticas,
  obtenerEvolucionAnalisis,
  obtenerPacientesRecientes,
  obtenerProximasRevisiones,
} from '../controllers/estadisticas.js';

export const estadisticasRouter = Router();

estadisticasRouter.get('/', obtenerEstadisticas);
estadisticasRouter.get('/evolucion', obtenerEvolucionAnalisis);
estadisticasRouter.get('/pacientes-recientes', obtenerPacientesRecientes);
estadisticasRouter.get('/proximas-revisiones', obtenerProximasRevisiones);
