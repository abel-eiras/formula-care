/**
 * Autenticación de personal (staff) para el panel de revisión de solicitudes.
 *
 * No hay sistema de usuarios/roles: booking-web es de un solo uso por farmacia,
 * así que basta con una contraseña compartida (STAFF_PASSWORD) y una cookie de
 * sesión firmada (JWT) para no repetirla en cada petición.
 */

import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';

const STAFF_SESSION_COOKIE = 'staff_session';
const SESSION_EXPIRES_IN = '12h';
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function getSessionSecret(): string {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('STAFF_SESSION_SECRET es obligatorio en producción.');
    }
    return 'booking-web-dev-secret-change-me';
  }
  return secret;
}

function getStaffPassword(): string | undefined {
  return process.env.STAFF_PASSWORD;
}

/**
 * Compara dos strings en tiempo constante (evita timing attacks en el login).
 */
function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Comparar igualmente contra sí mismo para no filtrar la longitud por tiempo
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifica la contraseña de staff configurada en STAFF_PASSWORD.
 */
export function verificarPasswordStaff(password: string): boolean {
  const esperada = getStaffPassword();
  if (!esperada) {
    console.warn('⚠️  STAFF_PASSWORD no está configurada: el login de staff siempre fallará.');
    return false;
  }
  return compararSeguro(password, esperada);
}

export function generarSesionStaff(): string {
  return jwt.sign({ role: 'staff' }, getSessionSecret(), { expiresIn: SESSION_EXPIRES_IN });
}

export function getStaffCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

export const STAFF_COOKIE_NAME = STAFF_SESSION_COOKIE;

/**
 * Middleware que exige una sesión de staff válida (cookie firmada).
 */
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[STAFF_SESSION_COOKIE];
    if (!token) {
      return res.status(401).json({ error: 'No autorizado', mensaje: 'Inicia sesión como personal para continuar.' });
    }

    const decoded = jwt.verify(token, getSessionSecret()) as { role: string };
    if (decoded.role !== 'staff') {
      return res.status(401).json({ error: 'No autorizado' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'No autorizado', mensaje: 'Tu sesión ha expirado. Inicia sesión de nuevo.' });
  }
}
