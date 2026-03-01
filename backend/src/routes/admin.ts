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
  actualizarUsuarioFarmacia,
  cambiarPasswordUsuario,
  eliminarUsuarioFarmacia,
  obtenerConfiguracionFarmacia,
  actualizarConfiguracionFarmacia,
} from '../controllers/farmacias.js';
import {
  obtenerEstadisticasPlataforma,
} from '../controllers/estadisticasAdmin.js';
import {
  obtenerConfiguracionPlataforma,
  actualizarConfiguracionPlataforma,
} from '../controllers/configuracionPlataforma.js';

const router = Router();

// Todas las rutas requieren autenticación + superadmin
router.use(verificarToken);
router.use(superadminMiddleware);

// ==========================================
// ESTADÍSTICAS DE PLATAFORMA
// ==========================================
router.get('/estadisticas', obtenerEstadisticasPlataforma);

// ==========================================
// CONFIGURACIÓN DE PLATAFORMA (SMTP por defecto)
// ==========================================
router.get('/configuracion-plataforma', obtenerConfiguracionPlataforma);
router.put('/configuracion-plataforma', actualizarConfiguracionPlataforma);

// ==========================================
// GESTIÓN DE FARMACIAS
// ==========================================
router.get('/farmacias', listarFarmacias);
router.post('/farmacias', crearFarmacia);
router.get('/farmacias/:id', obtenerFarmacia);
router.put('/farmacias/:id', actualizarFarmacia);
router.delete('/farmacias/:id', desactivarFarmacia);
router.post('/farmacias/:id/activar', activarFarmacia);
router.get('/farmacias/:id/configuracion', obtenerConfiguracionFarmacia);
router.put('/farmacias/:id/configuracion', actualizarConfiguracionFarmacia);

// ==========================================
// GESTIÓN DE USUARIOS POR FARMACIA
// ==========================================
router.get('/farmacias/:id/usuarios', listarUsuariosFarmacia);
router.post('/farmacias/:id/usuarios', crearUsuarioFarmacia);
router.put('/farmacias/:id/usuarios/:usuarioId', actualizarUsuarioFarmacia);
router.put('/farmacias/:id/usuarios/:usuarioId/password', cambiarPasswordUsuario);
router.delete('/farmacias/:id/usuarios/:usuarioId', eliminarUsuarioFarmacia);

export default router;
