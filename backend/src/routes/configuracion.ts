import { Router } from 'express';
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
