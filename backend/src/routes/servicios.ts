import { Router } from 'express';
import { 
  crearAnalisisDermo, 
  obtenerAnalisisDermo, 
  actualizarAnalisisDermo, 
  obtenerAnalisisDermoPorPaciente,
  obtenerTodosAnalisisDermo,
  crearAnalisisBio, 
  obtenerAnalisisBio, 
  obtenerAnalisisBioPorPaciente, 
  actualizarAnalisisBio,
  obtenerTodosAnalisisBio,
} from '../controllers/servicios.js';

export const serviciosRouter = Router();

// Rutas para análisis dermocosmético
serviciosRouter.post('/dermo', crearAnalisisDermo);
serviciosRouter.get('/dermo', obtenerTodosAnalisisDermo); // Lista con filtros
serviciosRouter.get('/dermo/:id', obtenerAnalisisDermo);
serviciosRouter.put('/dermo/:id', actualizarAnalisisDermo);
serviciosRouter.get('/dermo/paciente/:pacienteId', obtenerAnalisisDermoPorPaciente);

// Rutas para análisis bioquímico
serviciosRouter.post('/bio', crearAnalisisBio);
serviciosRouter.get('/bio', obtenerTodosAnalisisBio); // Lista con filtros
serviciosRouter.get('/bio/:id', obtenerAnalisisBio);
serviciosRouter.put('/bio/:id', actualizarAnalisisBio);
serviciosRouter.get('/bio/paciente/:pacienteId', obtenerAnalisisBioPorPaciente);
