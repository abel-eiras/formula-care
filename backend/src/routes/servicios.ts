import { Router } from 'express';
import { crearAnalisisDermo, obtenerAnalisisDermo, actualizarAnalisisDermo, obtenerAnalisisDermoPorPaciente, crearAnalisisBio, obtenerAnalisisBio, obtenerAnalisisBioPorPaciente, actualizarAnalisisBio } from '../controllers/servicios.js';

export const serviciosRouter = Router();

// Rutas para análisis dermocosmético
serviciosRouter.post('/dermo', crearAnalisisDermo);
serviciosRouter.get('/dermo/:id', obtenerAnalisisDermo);
serviciosRouter.put('/dermo/:id', actualizarAnalisisDermo);
serviciosRouter.get('/dermo/paciente/:pacienteId', obtenerAnalisisDermoPorPaciente);

// Rutas para análisis bioquímico
serviciosRouter.post('/bio', crearAnalisisBio);
serviciosRouter.get('/bio/:id', obtenerAnalisisBio);
serviciosRouter.put('/bio/:id', actualizarAnalisisBio);
serviciosRouter.get('/bio/paciente/:pacienteId', obtenerAnalisisBioPorPaciente);
