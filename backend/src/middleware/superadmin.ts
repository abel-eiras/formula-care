/**
 * Middleware de autorización Superadmin
 * 
 * Restringe el acceso a rutas solo para superadministradores
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que verifica que el usuario sea superadmin
 */
export const superadminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  if (user.rol !== 'superadmin') {
    res.status(403).json({ 
      error: 'Acceso denegado',
      message: 'Esta acción requiere permisos de superadministrador'
    });
    return;
  }

  next();
};

/**
 * Middleware que verifica que el usuario sea admin o superadmin
 */
export const adminOrSuperadminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  if (user.rol !== 'superadmin' && user.rol !== 'admin') {
    res.status(403).json({ 
      error: 'Acceso denegado',
      message: 'Esta acción requiere permisos de administrador'
    });
    return;
  }

  next();
};
