/**
 * Middleware de autenticación JWT
 * Protege las rutas que requieren usuario autenticado
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Extender el tipo Request para incluir usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        email: string;
        nombre: string;
        rol: string;
        farmaciaId: string | null;
      };
      // Alias para compatibilidad
      user?: {
        id: string;
        email: string;
        nombre: string;
        rol: string;
        farmaciaId: string | null;
      };
    }
  }
}

// Clave secreta para JWT (en producción usar variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'farmacia-pontevea-secret-key-2026';

// Tiempo de expiración del token (24 horas)
const JWT_EXPIRES_IN = '24h';

/**
 * Genera un token JWT para un usuario
 */
export function generarToken(usuario: { id: string; email: string; nombre: string; rol: string; farmaciaId: string | null }): string {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      farmaciaId: usuario.farmaciaId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware que verifica el token JWT
 * Si el token es válido, añade el usuario a req.usuario
 */
export async function verificarToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'Token de acceso no proporcionado'
      });
    }

    const token = authHeader.substring(7); // Quitar "Bearer "

    // Verificar y decodificar token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      nombre: string;
      rol: string;
      farmaciaId: string | null;
    };

    // Verificar que el usuario existe y está activo
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, farmaciaId: true }
    });

    if (!usuario) {
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'Usuario no encontrado'
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'Usuario desactivado'
      });
    }

    // Añadir usuario a la request (ambos alias para compatibilidad)
    const userData = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      farmaciaId: usuario.farmaciaId,
    };
    req.usuario = userData;
    req.user = userData;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token expirado',
        mensaje: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Token inválido',
        mensaje: 'Token de acceso inválido'
      });
    }

    console.error('Error en verificarToken:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Middleware que verifica si el usuario tiene un rol específico
 * Debe usarse después de verificarToken
 */
export function verificarRol(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ 
        error: 'No autorizado',
        mensaje: 'Debes iniciar sesión'
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        mensaje: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
}

/**
 * Middleware opcional: permite acceso sin token pero añade usuario si existe
 * Útil para rutas que funcionan con y sin autenticación
 */
export async function tokenOpcional(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continuar sin usuario
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      nombre: string;
      rol: string;
      farmaciaId: string | null;
    };

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, farmaciaId: true }
    });

    if (usuario && usuario.activo) {
      const userData = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        farmaciaId: usuario.farmaciaId,
      };
      req.usuario = userData;
      req.user = userData;
    }

    next();
  } catch {
    // Token inválido o expirado - continuar sin usuario
    next();
  }
}
