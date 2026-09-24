/**
 * Rutas de autenticación
 */

import { Router } from 'express';
import {
  login,
  logout,
  registro,
  obtenerUsuarioActual,
  cambiarPassword,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  necesitaSetup,
  setupInicial,
} from '../controllers/auth.js';
import { verificarToken, verificarRol } from '../middleware/auth.js';

export const authRouter = Router();

// Rutas públicas (no requieren autenticación)
authRouter.get('/necesita-setup', necesitaSetup);
authRouter.post('/setup-inicial', setupInicial);
authRouter.post('/login', login);
authRouter.post('/logout', logout);

// Rutas protegidas (requieren autenticación)
authRouter.get('/me', verificarToken, obtenerUsuarioActual);
authRouter.put('/password', verificarToken, cambiarPassword);

// Rutas de admin (requieren rol admin)
authRouter.post('/registro', verificarToken, verificarRol('admin'), registro);
authRouter.get('/usuarios', verificarToken, verificarRol('admin'), listarUsuarios);
authRouter.put('/usuarios/:id', verificarToken, verificarRol('admin'), actualizarUsuario);
authRouter.delete('/usuarios/:id', verificarToken, verificarRol('admin'), eliminarUsuario);
