/**
 * Controlador de autenticación
 * Maneja login, registro y gestión de sesión
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { generarToken, getAuthCookieOptions } from '../middleware/auth.js';
import { getParamString } from '../lib/queryHelpers.js';

// Esquema de validación para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Esquema de validación para registro
const registroSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  rol: z.enum(['admin', 'farmaceutico', 'usuario']).optional(),
});

// Esquema para cambiar contraseña
const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
  passwordNueva: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

// Esquema para establecer contraseña desde invitación
const establecerContrasenaSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Roles permitidos al actualizar usuario (no se puede asignar superadmin por API)
const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  rol: z.enum(['usuario', 'admin', 'farmaceutico']).optional(),
  activo: z.boolean().optional(),
});

/**
 * POST /api/auth/login
 * Iniciar sesión con email y contraseña
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Email o contraseña incorrectos',
      });
    }

    // Verificar que el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({
        error: 'Usuario desactivado',
        mensaje: 'Tu cuenta ha sido desactivada. Contacta con el administrador.',
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Email o contraseña incorrectos',
      });
    }

    // Actualizar último acceso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    // Generar token JWT
    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      farmaciaId: usuario.farmaciaId,
    });

    // Enviar token como cookie HttpOnly (no accesible desde JS)
    res.cookie('auth_token', token, getAuthCookieOptions());

    res.json({
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        farmaciaId: usuario.farmaciaId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/registro
 * Registrar nuevo usuario (solo admin puede crear usuarios)
 */
export async function registro(req: Request, res: Response) {
  try {
    const datos = registroSchema.parse(req.body);

    // Verificar si el email ya está registrado
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: datos.email.toLowerCase() },
    });

    if (usuarioExistente) {
      return res.status(400).json({
        error: 'Email ya registrado',
        mensaje: 'Ya existe un usuario con ese email',
      });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(datos.password, salt);

    // Crear usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email: datos.email.toLowerCase(),
        password: passwordHash,
        nombre: datos.nombre,
        rol: datos.rol || 'usuario',
      },
    });

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: {
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/auth/me
 * Obtener datos del usuario actual
 */
export async function obtenerUsuarioActual(req: Request, res: Response) {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        farmaciaId: true,
        ultimoAcceso: true,
        createdAt: true,
        farmacia: {
          select: {
            id: true,
            nombre: true,
            slug: true,
          }
        }
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/auth/password
 * Cambiar contraseña del usuario actual
 */
export async function cambiarPassword(req: Request, res: Response) {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { passwordActual, passwordNueva } = cambiarPasswordSchema.parse(req.body);

    // Obtener usuario con contraseña
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(passwordActual, usuario.password);

    if (!passwordValida) {
      return res.status(400).json({
        error: 'Contraseña incorrecta',
        mensaje: 'La contraseña actual no es correcta',
      });
    }

    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordNueva, salt);

    // Actualizar contraseña
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: passwordHash },
    });

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/logout
 * Cerrar sesión: elimina la cookie de autenticación
 */
export function logout(req: Request, res: Response) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.json({ mensaje: 'Sesión cerrada correctamente' });
}

/**
 * GET /api/auth/invitacion/:token
 * Validar token de invitación y devolver datos para mostrar (sin sensibles)
 */
export async function obtenerInvitacion(req: Request, res: Response) {
  try {
    const token = getParamString(req.params.token);

    const invitacion = await prisma.tokenInvitacionUsuario.findUnique({
      where: { token },
      include: { usuario: { select: { email: true, nombre: true } } },
    });

    if (!invitacion || invitacion.usado || new Date() > invitacion.expiraEn) {
      return res.status(400).json({
        error: 'Enlace inválido o expirado',
        mensaje: 'El enlace de invitación no es válido o ha caducado.',
      });
    }

    res.json({
      email: invitacion.usuario.email,
      nombre: invitacion.usuario.nombre,
    });
  } catch (error) {
    console.error('Error al validar invitación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/establecer-contrasena
 * Establecer contraseña usando token de invitación (ruta pública)
 */
export async function establecerContrasenaInvitacion(req: Request, res: Response) {
  try {
    const { token, password } = establecerContrasenaSchema.parse(req.body);

    const invitacion = await prisma.tokenInvitacionUsuario.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!invitacion) {
      return res.status(400).json({
        error: 'Enlace inválido',
        mensaje: 'El token de invitación no existe.',
      });
    }
    if (invitacion.usado) {
      return res.status(400).json({
        error: 'Enlace ya usado',
        mensaje: 'Este enlace ya fue utilizado para establecer la contraseña.',
      });
    }
    if (new Date() > invitacion.expiraEn) {
      return res.status(400).json({
        error: 'Enlace expirado',
        mensaje: 'El enlace de invitación ha caducado. Solicita uno nuevo al administrador.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: invitacion.usuarioId },
        data: { password: passwordHash },
      }),
      prisma.tokenInvitacionUsuario.update({
        where: { id: invitacion.id },
        data: { usado: true, usadoEn: new Date() },
      }),
    ]);

    res.json({ mensaje: 'Contraseña establecida correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }
    console.error('Error al establecer contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/auth/usuarios
 * Listar usuarios (solo admin). Admins ven solo usuarios de su farmacia; superadmin ve todos.
 */
export async function listarUsuarios(req: Request, res: Response) {
  try {
    const user = req.usuario || req.user;
    const where: { farmaciaId?: string | null } = {};
    if (user?.rol !== 'superadmin' && user?.farmaciaId) {
      where.farmaciaId = user.farmaciaId;
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/auth/usuarios/:id
 * Actualizar usuario (solo admin). Admin solo puede actualizar usuarios de su farmacia.
 */
export async function actualizarUsuario(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const datos = actualizarUsuarioSchema.parse(req.body);
    const user = req.usuario || req.user;

    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (user?.rol !== 'superadmin' && user?.farmaciaId !== usuario.farmaciaId) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: datos.nombre ?? undefined,
        rol: datos.rol ?? undefined,
        activo: datos.activo !== undefined ? datos.activo : undefined,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    res.json(usuarioActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/auth/usuarios/:id
 * Eliminar usuario (solo admin)
 */
export async function eliminarUsuario(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    // No permitir eliminarse a sí mismo
    if (req.usuario?.id === id) {
      return res.status(400).json({
        error: 'Operación no permitida',
        mensaje: 'No puedes eliminar tu propio usuario',
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = req.usuario || req.user;
    if (user?.rol !== 'superadmin' && user?.farmaciaId !== usuario.farmaciaId) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await prisma.usuario.delete({
      where: { id },
    });

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
