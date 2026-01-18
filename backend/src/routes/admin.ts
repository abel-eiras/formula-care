/**
 * Rutas de administración de plataforma (Superadmin)
 * Gestión de farmacias, usuarios y estadísticas globales
 */

import { Router } from 'express';
import { verificarToken } from '../middleware/auth.js';
import { superadminMiddleware } from '../middleware/superadmin.js';
import {
  listarFarmacias,
  obtenerFarmacia,
  crearFarmacia,
  actualizarFarmacia,
  desactivarFarmacia,
  activarFarmacia,
  listarUsuariosFarmacia,
  crearUsuarioFarmacia,
} from '../controllers/farmacias.js';
import {
  obtenerEstadisticasPlataforma,
} from '../controllers/estadisticasAdmin.js';

const router = Router();

// Todas las rutas requieren autenticación + superadmin
router.use(verificarToken);
router.use(superadminMiddleware);

// ==========================================
// ESTADÍSTICAS DE PLATAFORMA
// ==========================================
router.get('/estadisticas', obtenerEstadisticasPlataforma);

// ==========================================
// GESTIÓN DE FARMACIAS
// ==========================================
router.get('/farmacias', listarFarmacias);
router.post('/farmacias', crearFarmacia);
router.get('/farmacias/:id', obtenerFarmacia);
router.put('/farmacias/:id', actualizarFarmacia);
router.delete('/farmacias/:id', desactivarFarmacia);
router.post('/farmacias/:id/activar', activarFarmacia);

// ==========================================
// GESTIÓN DE USUARIOS POR FARMACIA
// ==========================================
router.get('/farmacias/:id/usuarios', listarUsuariosFarmacia);
router.post('/farmacias/:id/usuarios', crearUsuarioFarmacia);

export default router;
