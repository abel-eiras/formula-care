import { Router } from 'express';
import { verificarRol } from '../middleware/auth.js';
import {
  obtenerConfiguracion,
  actualizarFarmacia,
  actualizarParametrosReferencia,
  actualizarValoracionBio,
  actualizarParametrosBioConfig,
  obtenerConfiguracionCalendario,
  actualizarConfiguracionCalendario,
  bloquearFechaHora,
  desbloquearFechaHora,
  obtenerRgpd,
  actualizarRgpd,
  obtenerConfigBackup,
  actualizarConfigBackup,
  obtenerConfigCorreo,
  actualizarConfigCorreo,
  probarCorreo,
} from '../controllers/configuracion.js';

export const configuracionRouter = Router();

// Obtener configuración completa
configuracionRouter.get('/', obtenerConfiguracion);

// Actualizar datos de farmacia
configuracionRouter.put('/farmacia', actualizarFarmacia);

// Actualizar parámetros de referencia
configuracionRouter.put('/parametros', actualizarParametrosReferencia);

// Actualizar estado de valoración bioquímica
configuracionRouter.put('/valoracion-bio', actualizarValoracionBio);

// Actualizar configuración de parámetros bioquímicos (dinámicos)
configuracionRouter.put('/parametros-bio', actualizarParametrosBioConfig);

// Configuración del calendario
configuracionRouter.get('/calendario', obtenerConfiguracionCalendario);
configuracionRouter.put('/calendario', actualizarConfiguracionCalendario);
configuracionRouter.post('/calendario/bloquear', bloquearFechaHora);
configuracionRouter.delete('/calendario/desbloquear', desbloquearFechaHora);

// Configuración RGPD y Legal
configuracionRouter.get('/rgpd', obtenerRgpd);
configuracionRouter.put('/rgpd', actualizarRgpd);

// Configuración de copias de seguridad
configuracionRouter.get('/backup', obtenerConfigBackup);
configuracionRouter.put('/backup', actualizarConfigBackup);

// Configuración de correo (solo administradores: guarda credenciales)
configuracionRouter.get('/correo', verificarRol('admin'), obtenerConfigCorreo);
configuracionRouter.put('/correo', verificarRol('admin'), actualizarConfigCorreo);
configuracionRouter.post('/correo/prueba', verificarRol('admin'), probarCorreo);
