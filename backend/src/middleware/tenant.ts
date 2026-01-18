/**
 * Middleware de Multi-Tenancy
 * 
 * Extrae el farmaciaId del usuario autenticado y lo inyecta en la request.
 * Los superadmins pueden acceder a cualquier farmacia via query param.
 */

import { Request, Response, NextFunction } from 'express';

// Extender el tipo Request para incluir farmaciaId
declare global {
  namespace Express {
    interface Request {
      farmaciaId?: string | null;
    }
  }
}

/**
 * Middleware que extrae e inyecta el farmaciaId en cada request
 */
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (!user) {
    // Si no hay usuario, no hay farmacia
    req.farmaciaId = null;
    next();
    return;
  }

  // Los superadmins pueden especificar farmaciaId via query param
  if (user.rol === 'superadmin') {
    const queryFarmaciaId = req.query.farmaciaId;
    if (typeof queryFarmaciaId === 'string' && queryFarmaciaId) {
      req.farmaciaId = queryFarmaciaId;
    } else {
      // Si no especifica, puede ver todo (null = sin filtro)
      req.farmaciaId = null;
    }
  } else {
    // Usuarios normales solo ven su farmacia
    req.farmaciaId = user.farmaciaId || null;
  }

  next();
};

/**
 * Middleware que requiere que el usuario pertenezca a una farmacia
 * (No aplica a superadmins)
 */
export const requireFarmacia = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  // Superadmins no necesitan farmacia
  if (user.rol === 'superadmin') {
    next();
    return;
  }

  // Otros usuarios deben tener farmaciaId
  if (!user.farmaciaId) {
    res.status(403).json({ error: 'Usuario no asignado a ninguna farmacia' });
    return;
  }

  next();
};

/**
 * Helper para aplicar filtro de farmacia en queries Prisma
 */
export function getFarmaciaFilter(farmaciaId: string | null | undefined): { farmaciaId?: string } {
  if (farmaciaId) {
    return { farmaciaId };
  }
  return {};
}

/**
 * Helper para validar que un recurso pertenece a la farmacia del usuario
 */
export function validarAccesoFarmacia(
  recursoFarmaciaId: string,
  userFarmaciaId: string | null | undefined,
  userRol: string
): boolean {
  // Superadmins tienen acceso a todo
  if (userRol === 'superadmin') {
    return true;
  }

  // Otros usuarios solo acceden a recursos de su farmacia
  return recursoFarmaciaId === userFarmaciaId;
}

/**
 * Helper para obtener farmaciaId del request (usuario autenticado)
 * Retorna null si es superadmin sin farmacia especificada
 * Lanza error si el usuario no tiene farmaciaId y no es superadmin
 */
export function obtenerFarmaciaIdRequerido(req: Request): string {
  const user = req.usuario || req.user;
  
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Si es superadmin, puede especificar farmaciaId en query
  if (user.rol === 'superadmin') {
    const queryFarmaciaId = req.query.farmaciaId;
    if (typeof queryFarmaciaId === 'string' && queryFarmaciaId) {
      return queryFarmaciaId;
    }
    throw new Error('Superadmin debe especificar farmaciaId');
  }

  // Otros usuarios deben tener farmaciaId
  if (!user.farmaciaId) {
    throw new Error('Usuario no asignado a ninguna farmacia');
  }

  return user.farmaciaId;
}

/**
 * Helper para obtener farmaciaId opcional (para queries que pueden ser globales)
 */
export function obtenerFarmaciaIdOpcional(req: Request): string | null {
  const user = req.usuario || req.user;
  
  if (!user) {
    return null;
  }

  // Si es superadmin, puede especificar farmaciaId en query o ver todo
  if (user.rol === 'superadmin') {
    const queryFarmaciaId = req.query.farmaciaId;
    if (typeof queryFarmaciaId === 'string' && queryFarmaciaId) {
      return queryFarmaciaId;
    }
    return null; // Ver todo
  }

  return user.farmaciaId;
}
