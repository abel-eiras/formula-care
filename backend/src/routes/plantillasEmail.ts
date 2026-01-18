/**
 * Rutas de Plantillas de Email
 * CRUD protegido para administradores
 */

import { Router } from 'express';
import {
  obtenerPlantillas,
  obtenerPlantilla,
  actualizarPlantilla,
  restaurarPlantillaPorDefecto,
  obtenerVariablesDisponibles,
} from '../controllers/plantillasEmail.js';

export const plantillasEmailRouter = Router();

// GET /api/plantillas-email - Obtener todas las plantillas
plantillasEmailRouter.get('/', obtenerPlantillas);

// GET /api/plantillas-email/variables - Obtener variables disponibles
plantillasEmailRouter.get('/variables', obtenerVariablesDisponibles);

// GET /api/plantillas-email/:tipo - Obtener una plantilla por tipo
plantillasEmailRouter.get('/:tipo', obtenerPlantilla);

// PUT /api/plantillas-email/:tipo - Actualizar una plantilla
plantillasEmailRouter.put('/:tipo', actualizarPlantilla);

// POST /api/plantillas-email/:tipo/restaurar - Restaurar plantilla por defecto
plantillasEmailRouter.post('/:tipo/restaurar', restaurarPlantillaPorDefecto);
