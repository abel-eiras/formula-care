import { Router } from 'express';
import { obtenerDisponibilidadPublica, solicitarCita } from '../controllers/solicitudesPublicas.js';
import { 
  verificarTokenCita, 
  confirmarCita, 
  obtenerDatosModificacion, 
  modificarCita, 
  cancelarCita 
} from '../controllers/accionesCita.js';

export const publicRouter = Router();

// Endpoints públicos (sin autenticación)
publicRouter.get('/disponibilidad', obtenerDisponibilidadPublica);
publicRouter.post('/solicitar-cita', solicitarCita);

// ==========================================
// ACCIONES DE CITA (desde enlaces de email)
// ==========================================

// Verificar token y obtener datos de la cita
publicRouter.get('/cita/verificar/:token', verificarTokenCita);

// Confirmar asistencia
publicRouter.post('/cita/confirmar/:token', confirmarCita);

// Modificar cita
publicRouter.get('/cita/modificar/:token', obtenerDatosModificacion);
publicRouter.post('/cita/modificar/:token', modificarCita);

// Cancelar cita
publicRouter.post('/cita/cancelar/:token', cancelarCita);
