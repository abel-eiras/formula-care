import { Router } from 'express';
import { requireStaff } from '../middleware/staffAuth.js';
import {
  loginStaff,
  logoutStaff,
  sesionStaff,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  obtenerConfiguracion,
  actualizarConfiguracion,
  obtenerConfiguracionCalendario,
  actualizarConfiguracionCalendario,
  listarEventos,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
} from '../controllers/staff.js';

export const staffRouter = Router();

// Login sin proteger (evidentemente); todo lo demás requiere sesión de staff
staffRouter.post('/login', loginStaff);
staffRouter.post('/logout', logoutStaff);

staffRouter.get('/session', requireStaff, sesionStaff);

staffRouter.get('/solicitudes', requireStaff, listarSolicitudes);
staffRouter.post('/solicitudes/:id/aprobar', requireStaff, aprobarSolicitud);
staffRouter.post('/solicitudes/:id/rechazar', requireStaff, rechazarSolicitud);

staffRouter.get('/configuracion', requireStaff, obtenerConfiguracion);
staffRouter.put('/configuracion', requireStaff, actualizarConfiguracion);

staffRouter.get('/configuracion-calendario', requireStaff, obtenerConfiguracionCalendario);
staffRouter.put('/configuracion-calendario', requireStaff, actualizarConfiguracionCalendario);

staffRouter.get('/eventos', requireStaff, listarEventos);
staffRouter.post('/eventos', requireStaff, crearEvento);
staffRouter.put('/eventos/:id', requireStaff, actualizarEvento);
staffRouter.delete('/eventos/:id', requireStaff, eliminarEvento);
