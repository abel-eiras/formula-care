import { Router } from 'express';
import { listarCumpleanos, felicitar, deshacerFelicitacion } from '../controllers/cumpleanos.js';

export const cumpleanosRouter = Router();

// Cumpleaños calculados desde la fecha de nacimiento (?desde=&hasta=)
cumpleanosRouter.get('/', listarCumpleanos);

// Felicitación del cumpleaños de un año (canal: whatsapp, email, llamada, en_persona)
cumpleanosRouter.post('/:pacienteId/felicitacion', felicitar);
cumpleanosRouter.delete('/:pacienteId/felicitacion/:anio', deshacerFelicitacion);
