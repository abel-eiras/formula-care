import { Router } from 'express';
import {
  obtenerConfiguracion,
  actualizarFarmacia,
  actualizarParametrosReferencia,
  actualizarValoracionBio,
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
