import { Router } from 'express';
import {
  obtenerDisponibilidadPublica,
  solicitarCita,
  obtenerFarmaciaPublica,
  obtenerEventosPublicos,
  obtenerTextoLegalPublico,
} from '../controllers/solicitudesPublicas.js';
import { verificarTokenCita, confirmarCita, obtenerDatosModificacion, modificarCita, cancelarCita } from '../controllers/accionesCita.js';

export const publicRouter = Router();

// Datos públicos de la farmacia (branding/contacto)
publicRouter.get('/farmacia', obtenerFarmaciaPublica);
publicRouter.get('/eventos', obtenerEventosPublicos);
publicRouter.get('/legal/:tipo', obtenerTextoLegalPublico);

// Disponibilidad y solicitudes
publicRouter.get('/disponibilidad', obtenerDisponibilidadPublica);
publicRouter.post('/solicitar-cita', solicitarCita);

// Acciones de cita desde enlaces de email
publicRouter.get('/cita/verificar/:token', verificarTokenCita);
publicRouter.post('/cita/confirmar/:token', confirmarCita);
publicRouter.get('/cita/modificar/:token', obtenerDatosModificacion);
publicRouter.post('/cita/modificar/:token', modificarCita);
publicRouter.post('/cita/cancelar/:token', cancelarCita);
