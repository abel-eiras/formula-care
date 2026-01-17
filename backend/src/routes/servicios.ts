import { Router } from 'express';
import { crearAnalisisDermo, obtenerAnalisisDermo, crearAnalisisBio, obtenerAnalisisBio } from '../controllers/servicios.js';

export const serviciosRouter = Router();

// Rutas para análisis dermocosmético
serviciosRouter.post('/dermo', crearAnalisisDermo);
serviciosRouter.get('/dermo/:id', obtenerAnalisisDermo);

// Rutas para análisis bioquímico
serviciosRouter.post('/bio', crearAnalisisBio);
serviciosRouter.get('/bio/:id', obtenerAnalisisBio);
