import { Router } from 'express';
import { verificarRol } from '../middleware/auth.js';
import {
  aceptar,
  actualizarConfigReserva,
  listarSolicitudes,
  obtenerConfigReserva,
  rechazar,
  regenerarToken,
  sincronizarAhora,
} from '../controllers/reservaOnline.js';

export const reservaOnlineRouter = Router();

// Configuración (incluye el token de sincronización): solo administradores
reservaOnlineRouter.get('/config', verificarRol('admin'), obtenerConfigReserva);
reservaOnlineRouter.put('/config', verificarRol('admin'), actualizarConfigReserva);
reservaOnlineRouter.post('/config/token', verificarRol('admin'), regenerarToken);

// Uso diario: cualquier usuario del equipo
reservaOnlineRouter.post('/sincronizar', sincronizarAhora);
reservaOnlineRouter.get('/solicitudes', listarSolicitudes);
reservaOnlineRouter.post('/solicitudes/:id/aceptar', aceptar);
reservaOnlineRouter.post('/solicitudes/:id/rechazar', rechazar);
