/**
 * Controlador de autenticación
 * Maneja login, registro y gestión de sesión
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { generarToken, getAuthCookieOptions, usuarioDelToken } from '../middleware/auth.js';
import { anotarAcceso } from '../services/registroAccesos.js';
import { getParamString } from '../lib/queryHelpers.js';

// Esquema de validación para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Esquema de validación para el alta del primer administrador (primer arranque)
const setupInicialSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
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

// Actualizar usuario (solo admin). "password" permite restablecer la
// contraseña de quien la haya olvidado: en la app local no hay invitaciones
// ni recuperación por email.
const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  rol: z.enum(['usuario', 'admin', 'farmaceutico']).optional(),
  activo: z.boolean().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
});

/**
 * Evita dejar la instalación sin ningún administrador activo (nadie podría
 * volver a gestionar usuarios ni configuración).
 */
export async function quedariaSinAdministrador(idAfectado: string, seguiraSiendoAdminActivo: boolean): Promise<boolean> {
  if (seguiraSiendoAdminActivo) return false;
  const otrosAdmins = await prisma.usuario.count({
    where: { rol: 'admin', activo: true, NOT: { id: idAfectado } },
  });
  return otrosAdmins === 0;
}

/**
 * GET /api/auth/necesita-setup
 * Indica si esta instalación aún no tiene ningún usuario creado (primer
 * arranque de la app de escritorio). Ruta pública: solo revela un booleano.
 */
export async function necesitaSetup(req: Request, res: Response) {
  try {
    const totalUsuarios = await prisma.usuario.count();
    res.json({ necesitaSetup: totalUsuarios === 0 });
  } catch (error) {
    console.error('Error al comprobar setup inicial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/setup-inicial
 * Crea la cuenta de administrador inicial. Solo funciona mientras la
 * instalación no tenga ningún usuario (primer arranque de la app de
 * escritorio); a partir de ahí, los usuarios se gestionan desde /registro.
 */
export async function setupInicial(req: Request, res: Response) {
  try {
    const totalUsuarios = await prisma.usuario.count();
    if (totalUsuarios > 0) {
      return res.status(403).json({
        error: 'Setup ya completado',
        mensaje: 'Esta instalación ya tiene un administrador configurado.',
      });
    }

    const datos = setupInicialSchema.parse(req.body);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(datos.password, salt);

    const usuario = await prisma.usuario.create({
      data: {
        email: datos.email.toLowerCase(),
        password: passwordHash,
        nombre: datos.nombre,
        rol: 'admin',
      },
    });

    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });
    res.cookie('auth_token', token, getAuthCookieOptions());

    res.status(201).json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }
    console.error('Error en setup inicial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

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
      await anotarAcceso({ usuarioNombre: email.toLowerCase(), accion: 'login-fallido', recurso: 'sesion', detalle: 'usuario inexistente' });
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
      await anotarAcceso({ usuarioId: usuario.id, usuarioNombre: usuario.nombre, accion: 'login-fallido', recurso: 'sesion', detalle: 'contraseña incorrecta' });
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
    await anotarAcceso({ usuarioId: usuario.id, usuarioNombre: usuario.nombre, accion: 'login', recurso: 'sesion' });

    // Generar token JWT
    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });

    // Enviar token como cookie HttpOnly (no accesible desde JS)
    res.cookie('auth_token', token, getAuthCookieOptions());

    res.json({
      // El token también va en el cuerpo: la app de escritorio lo envía en la
      // cabecera Authorization porque su webview (tauri://localhost o
      // http://tauri.localhost) es otro sitio y descarta la cookie
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
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
        ultimoAcceso: true,
        createdAt: true,
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
export async function logout(req: Request, res: Response) {
  const usuario = usuarioDelToken(req);
  if (usuario) {
    const porInactividad = (req.body as { motivo?: unknown } | undefined)?.motivo === 'inactividad';
    await anotarAcceso({
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      accion: 'logout',
      recurso: 'sesion',
      detalle: porInactividad ? 'por inactividad' : null,
    });
  }
  // Sin maxAge: en Express 4 anularía la caducidad inmediata de clearCookie
  const { maxAge: _maxAge, ...opcionesCookie } = getAuthCookieOptions();
  res.clearCookie('auth_token', opcionesCookie);
  res.json({ mensaje: 'Sesión cerrada correctamente' });
}

/**
 * GET /api/auth/usuarios
 * Listar usuarios (solo admin).
 */
export async function listarUsuarios(req: Request, res: Response) {
  try {
    const usuarios = await prisma.usuario.findMany({
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
 * Actualizar usuario (solo admin).
 */
export async function actualizarUsuario(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const datos = actualizarUsuarioSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rolFinal = datos.rol ?? usuario.rol;
    const activoFinal = datos.activo ?? usuario.activo;
    if (usuario.rol === 'admin' && (await quedariaSinAdministrador(id, rolFinal === 'admin' && activoFinal))) {
      return res.status(400).json({
        error: 'Operación no permitida',
        mensaje: 'Debe quedar al menos un administrador activo',
      });
    }

    const passwordHash = datos.password ? await bcrypt.hash(datos.password, await bcrypt.genSalt(10)) : undefined;

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: datos.nombre ?? undefined,
        rol: datos.rol ?? undefined,
        activo: datos.activo !== undefined ? datos.activo : undefined,
        password: passwordHash,
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

    if (usuario.rol === 'admin' && (await quedariaSinAdministrador(id, false))) {
      return res.status(400).json({
        error: 'Operación no permitida',
        mensaje: 'Debe quedar al menos un administrador activo',
      });
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
