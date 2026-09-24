/**
 * Middleware de autenticación JWT
 * Protege las rutas que requieren usuario autenticado
 * El token se lee desde la cookie HttpOnly 'auth_token'.
 * Como fallback temporal acepta también el header Authorization Bearer
 * (útil para clientes que aún no hayan migrado).
 */

import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Extender el tipo Request para incluir usuario
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        email: string;
        nombre: string;
        rol: string;
      };
      // Alias para compatibilidad
      user?: {
        id: string;
        email: string;
        nombre: string;
        rol: string;
      };
    }
  }
}

// Clave secreta para JWT. Obligatoria en producción y no puede ser el valor de ejemplo.
const DEFAULT_SECRET = 'formula-care-dev-secret-key-2026';
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('JWT_SECRET es obligatorio en producción. Configure la variable de entorno.');
    }
    if (secret === DEFAULT_SECRET) {
      throw new Error('JWT_SECRET tiene el valor por defecto. Cambia la variable de entorno antes de desplegar en producción.');
    }
    if (secret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
    }
  }

  return secret || DEFAULT_SECRET;
})();

// Tiempo de expiración del token (24 horas)
const JWT_EXPIRES_IN = '24h';

/**
 * Genera un token JWT para un usuario
 */
export function generarToken(usuario: { id: string; email: string; nombre: string; rol: string }): string {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Opciones de la cookie de autenticación.
 * La cookie solo sirve en desarrollo (localhost:5173 → localhost:3000 es el
 * mismo sitio). En la app de escritorio el webview (tauri://localhost o
 * http://tauri.localhost) es otro sitio y la descarta: allí el cliente envía
 * el token en la cabecera Authorization (ver extraerToken y src/lib/api.ts).
 */
export function getAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas en ms
    path: '/',
  };
}

/**
 * Extrae el token JWT de la cookie o del header Authorization (fallback)
 */
function extraerToken(req: Request): string | null {
  // 1. Preferencia: cookie HttpOnly
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token as string;
  }
  // 2. Fallback: header Authorization Bearer
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Middleware que verifica el token JWT
 * Si el token es válido, añade el usuario a req.usuario
 */
export async function verificarToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extraerToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'Token de acceso no proporcionado',
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      nombre: string;
      rol: string;
    };

    // Verificar que el usuario existe y está activo
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });

    if (!usuario) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'Usuario no encontrado',
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'Usuario desactivado',
      });
    }

    // Añadir usuario a la request (ambos alias para compatibilidad)
    const userData = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
    req.usuario = userData;
    req.user = userData;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expirado',
        mensaje: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Token inválido',
        mensaje: 'Token de acceso inválido',
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
        mensaje: 'Debes iniciar sesión',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'No tienes permisos para acceder a este recurso',
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
    const token = extraerToken(req);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      nombre: string;
      rol: string;
    };

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });

    if (usuario && usuario.activo) {
      const userData = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
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
