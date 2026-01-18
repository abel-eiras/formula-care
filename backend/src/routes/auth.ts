/**
 * Rutas de autenticación
 */

import { Router } from 'express';
import {
  login,
  registro,
  obtenerUsuarioActual,
  cambiarPassword,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
} from '../controllers/auth.js';
import { verificarToken, verificarRol } from '../middleware/auth.js';

export const authRouter = Router();

// Rutas públicas (no requieren autenticación)
authRouter.post('/login', login);

// Rutas protegidas (requieren autenticación)
authRouter.get('/me', verificarToken, obtenerUsuarioActual);
authRouter.put('/password', verificarToken, cambiarPassword);

// Rutas de admin (requieren rol admin)
authRouter.post('/registro', verificarToken, verificarRol('admin'), registro);
authRouter.get('/usuarios', verificarToken, verificarRol('admin'), listarUsuarios);
authRouter.put('/usuarios/:id', verificarToken, verificarRol('admin'), actualizarUsuario);
authRouter.delete('/usuarios/:id', verificarToken, verificarRol('admin'), eliminarUsuario);
