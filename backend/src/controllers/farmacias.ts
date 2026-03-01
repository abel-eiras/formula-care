/**
 * Controlador de Farmacias
 * CRUD para gestión de farmacias (solo superadmin)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { getParamString } from '../lib/queryHelpers.js';
import {
  PARAMETROS_BIO_CONFIG_DEFAULT,
  PARAMETROS_REFERENCIA_DEFAULT,
} from '../config/parametrosBioDefault.js';
import { enviarInvitacionUsuario } from '../services/emailService.js';

// Función para generar slug a partir del nombre
function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Esquema de validación para crear farmacia
const crearFarmaciaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().optional(), // Se genera automáticamente si no se proporciona
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  web: z.string().optional(),
  plan: z.enum(['basico', 'profesional', 'enterprise']).default('basico'),
  maxUsuarios: z.number().int().min(1).default(3),
  maxPacientes: z.number().int().min(1).default(500),
  fechaExpiracion: z.string().optional(), // ISO date string
  // Datos del admin inicial
  adminEmail: z.string().email('Email del admin inválido'),
  adminPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  adminNombre: z.string().min(2, 'El nombre del admin debe tener al menos 2 caracteres'),
});

// Roles permitidos al crear/actualizar usuarios de farmacia (superadmin no asignable)
const rolUsuarioFarmaciaSchema = z.enum(['usuario', 'admin', 'farmaceutico']);

const crearUsuarioFarmaciaSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  rol: rolUsuarioFarmaciaSchema.optional().default('usuario'),
});

const actualizarUsuarioFarmaciaSchema = z.object({
  nombre: z.string().min(2).optional(),
  rol: rolUsuarioFarmaciaSchema.optional(),
  activo: z.boolean().optional(),
});

const cambiarPasswordUsuarioSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Esquema para actualizar farmacia
const actualizarFarmaciaSchema = z.object({
  nombre: z.string().min(2).optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  web: z.string().optional(),
  activa: z.boolean().optional(),
  plan: z.enum(['basico', 'profesional', 'enterprise']).optional(),
  maxUsuarios: z.number().int().min(1).optional(),
  maxPacientes: z.number().int().min(1).optional(),
  fechaExpiracion: z.string().nullable().optional(),
});

// Esquemas para actualizar configuración de farmacia (superadmin)
const rangoParametroSchema = z.object({
  normalMin: z.number(),
  normalMax: z.number(),
  advertenciaMin: z.number().optional(),
  advertenciaMax: z.number().optional(),
  advertenciaMin2: z.number().optional(),
  advertenciaMax2: z.number().optional(),
  criticoMin: z.number().optional(),
  criticoMax: z.number().optional(),
  criticoMin2: z.number().optional(),
  criticoMax2: z.number().optional(),
});
const parametrosReferenciaSchema = z.record(z.string(), rangoParametroSchema);
const parametroBioConfigItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1),
  grupo: z.enum(['basicos', 'avanzados', 'tension', 'corporales']),
  activo: z.boolean(),
  orden: z.number(),
});
const parametrosBioConfigSchema = z.array(parametroBioConfigItemSchema);

const actualizarConfiguracionFarmaciaSchema = z.object({
  valoracionBioActiva: z.boolean().optional(),
  parametrosReferencia: parametrosReferenciaSchema.optional(),
  parametrosBioConfig: parametrosBioConfigSchema.optional(),
  emailProvider: z.enum(['smtp', 'resend']).optional().nullable(),
  emailRemitente: z.string().email().optional().or(z.literal('')).nullable(),
  emailNombreRemitente: z.string().optional().nullable(),
  resendApiKey: z.string().optional().nullable(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
});

/**
 * GET /api/admin/farmacias
 * Listar todas las farmacias
 */
export async function listarFarmacias(req: Request, res: Response) {
  try {
    const { activa, plan, busqueda } = req.query;

    // Construir filtros
    const where: Record<string, unknown> = {};
    
    if (activa !== undefined) {
      where.activa = activa === 'true';
    }
    
    if (plan && typeof plan === 'string') {
      where.plan = plan;
    }
    
    if (busqueda && typeof busqueda === 'string') {
      where.OR = [
        { nombre: { contains: busqueda } },
        { email: { contains: busqueda } },
        { slug: { contains: busqueda } },
      ];
    }

    const farmacias = await prisma.farmacia.findMany({
      where,
      include: {
        _count: {
          select: {
            usuarios: true,
            pacientes: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transformar respuesta
    const resultado = farmacias.map(f => ({
      id: f.id,
      nombre: f.nombre,
      slug: f.slug,
      direccion: f.direccion,
      ciudad: f.ciudad,
      telefono: f.telefono,
      email: f.email,
      web: f.web,
      logo: f.logo,
      activa: f.activa,
      plan: f.plan,
      fechaAlta: f.fechaAlta.toISOString(),
      fechaExpiracion: f.fechaExpiracion?.toISOString() || null,
      maxUsuarios: f.maxUsuarios,
      maxPacientes: f.maxPacientes,
      totalUsuarios: f._count.usuarios,
      totalPacientes: f._count.pacientes,
      createdAt: f.createdAt.toISOString(),
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Error al listar farmacias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/admin/farmacias/:id
 * Obtener detalle de una farmacia
 */
export async function obtenerFarmacia(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id },
      include: {
        usuarios: {
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
        },
        _count: {
          select: {
            usuarios: true,
            pacientes: true,
            citas: true,
            eventos: true,
          }
        },
        configuracion: {
          select: {
            id: true,
            valoracionBioActiva: true,
            emailProvider: true,
          }
        },
      },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    res.json({
      id: farmacia.id,
      nombre: farmacia.nombre,
      slug: farmacia.slug,
      direccion: farmacia.direccion,
      ciudad: farmacia.ciudad,
      telefono: farmacia.telefono,
      email: farmacia.email,
      web: farmacia.web,
      logo: farmacia.logo,
      activa: farmacia.activa,
      plan: farmacia.plan,
      fechaAlta: farmacia.fechaAlta.toISOString(),
      fechaExpiracion: farmacia.fechaExpiracion?.toISOString() || null,
      maxUsuarios: farmacia.maxUsuarios,
      maxPacientes: farmacia.maxPacientes,
      usuarios: farmacia.usuarios,
      estadisticas: {
        totalUsuarios: farmacia._count.usuarios,
        totalPacientes: farmacia._count.pacientes,
        totalCitas: farmacia._count.citas,
        totalEventos: farmacia._count.eventos,
      },
      configuracion: farmacia.configuracion,
      createdAt: farmacia.createdAt.toISOString(),
      updatedAt: farmacia.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/admin/farmacias
 * Crear nueva farmacia con usuario admin
 */
export async function crearFarmacia(req: Request, res: Response) {
  try {
    const datos = crearFarmaciaSchema.parse(req.body);

    // Generar slug si no se proporciona
    const slug = datos.slug || generarSlug(datos.nombre);

    // Verificar que el slug no exista
    const slugExiste = await prisma.farmacia.findUnique({
      where: { slug },
    });

    if (slugExiste) {
      return res.status(400).json({
        error: 'Slug ya existe',
        mensaje: 'Ya existe una farmacia con ese identificador',
      });
    }

    // Verificar que el email del admin no exista
    const adminExiste = await prisma.usuario.findUnique({
      where: { email: datos.adminEmail.toLowerCase() },
    });

    if (adminExiste) {
      return res.status(400).json({
        error: 'Email ya registrado',
        mensaje: 'Ya existe un usuario con ese email',
      });
    }

    // Crear farmacia y admin en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear farmacia
      const farmacia = await tx.farmacia.create({
        data: {
          nombre: datos.nombre,
          slug,
          direccion: datos.direccion,
          ciudad: datos.ciudad,
          telefono: datos.telefono,
          email: datos.email,
          web: datos.web,
          activa: true,
          plan: datos.plan,
          maxUsuarios: datos.maxUsuarios,
          maxPacientes: datos.maxPacientes,
          fechaExpiracion: datos.fechaExpiracion ? new Date(datos.fechaExpiracion) : null,
        },
      });

      // 2. Crear usuario admin
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(datos.adminPassword, salt);

      const admin = await tx.usuario.create({
        data: {
          email: datos.adminEmail.toLowerCase(),
          password: passwordHash,
          nombre: datos.adminNombre,
          rol: 'admin',
          farmaciaId: farmacia.id,
        },
      });

      // 3. Crear configuración por defecto (mismos parámetros bio que Farmacia Pontevea)
      await tx.configuracion.create({
        data: {
          farmaciaId: farmacia.id,
          farmaciaNombre: farmacia.nombre,
          farmaciaDireccion: farmacia.direccion,
          farmaciaCiudad: farmacia.ciudad,
          farmaciaTelefono: farmacia.telefono,
          farmaciaEmail: farmacia.email,
          farmaciaWeb: farmacia.web,
          valoracionBioActiva: true,
          parametrosReferencia: JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
          parametrosBioConfig: JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
        },
      });

      // 4. Crear configuración de calendario por defecto
      await tx.configuracionCalendario.create({
        data: {
          farmaciaId: farmacia.id,
        },
      });

      return { farmacia, admin };
    });

    res.status(201).json({
      mensaje: 'Farmacia creada correctamente',
      farmacia: {
        id: resultado.farmacia.id,
        nombre: resultado.farmacia.nombre,
        slug: resultado.farmacia.slug,
        activa: resultado.farmacia.activa,
        plan: resultado.farmacia.plan,
      },
      admin: {
        id: resultado.admin.id,
        email: resultado.admin.email,
        nombre: resultado.admin.nombre,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/admin/farmacias/:id
 * Actualizar farmacia
 */
export async function actualizarFarmacia(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const datos = actualizarFarmaciaSchema.parse(req.body);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    const farmaciaActualizada = await prisma.farmacia.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        direccion: datos.direccion,
        ciudad: datos.ciudad,
        telefono: datos.telefono,
        email: datos.email,
        web: datos.web,
        activa: datos.activa,
        plan: datos.plan,
        maxUsuarios: datos.maxUsuarios,
        maxPacientes: datos.maxPacientes,
        fechaExpiracion: datos.fechaExpiracion !== undefined 
          ? (datos.fechaExpiracion ? new Date(datos.fechaExpiracion) : null)
          : undefined,
      },
    });

    // Sincronizar datos con configuración si existe
    if (datos.nombre || datos.direccion || datos.ciudad || datos.telefono || datos.email || datos.web) {
      await prisma.configuracion.updateMany({
        where: { farmaciaId: id },
        data: {
          farmaciaNombre: datos.nombre,
          farmaciaDireccion: datos.direccion,
          farmaciaCiudad: datos.ciudad,
          farmaciaTelefono: datos.telefono,
          farmaciaEmail: datos.email,
          farmaciaWeb: datos.web,
        },
      });
    }

    res.json({
      mensaje: 'Farmacia actualizada correctamente',
      farmacia: farmaciaActualizada,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al actualizar farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/admin/farmacias/:id
 * Desactivar farmacia (soft delete)
 */
export async function desactivarFarmacia(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    await prisma.farmacia.update({
      where: { id },
      data: { activa: false },
    });

    // También desactivar usuarios de la farmacia
    await prisma.usuario.updateMany({
      where: { farmaciaId: id },
      data: { activo: false },
    });

    res.json({ mensaje: 'Farmacia desactivada correctamente' });
  } catch (error) {
    console.error('Error al desactivar farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/admin/farmacias/:id/activar
 * Reactivar farmacia
 */
export async function activarFarmacia(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    await prisma.farmacia.update({
      where: { id },
      data: { activa: true },
    });

    res.json({ mensaje: 'Farmacia activada correctamente' });
  } catch (error) {
    console.error('Error al activar farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/admin/farmacias/:id/usuarios
 * Listar usuarios de una farmacia
 */
export async function listarUsuariosFarmacia(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id: farmaciaId },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    const usuarios = await prisma.usuario.findMany({
      where: { farmaciaId },
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
 * POST /api/admin/farmacias/:id/usuarios
 * Crear usuario para una farmacia
 */
export async function crearUsuarioFarmacia(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id: farmaciaId },
      include: {
        _count: { select: { usuarios: true } }
      }
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    // Verificar límite de usuarios
    if (farmacia._count.usuarios >= farmacia.maxUsuarios) {
      return res.status(400).json({
        error: 'Límite alcanzado',
        mensaje: `Esta farmacia ha alcanzado el límite de ${farmacia.maxUsuarios} usuarios`,
      });
    }

    const datos = crearUsuarioFarmaciaSchema.parse(req.body);
    const esInvitacion = !datos.password || datos.password.trim() === '';

    // Verificar que el email no exista
    const emailExiste = await prisma.usuario.findUnique({
      where: { email: datos.email.toLowerCase() },
    });

    if (emailExiste) {
      return res.status(400).json({
        error: 'Email ya registrado',
        mensaje: 'Ya existe un usuario con ese email',
      });
    }

    let passwordHash: string;
    if (esInvitacion) {
      const tempPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(tempPassword, salt);
    } else {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(datos.password!, salt);
    }

    const farmacia = await prisma.farmacia.findUnique({
      where: { id: farmaciaId },
      select: { nombre: true },
    });
    const nombreFarmacia = farmacia?.nombre ?? 'la plataforma';

    const usuario = await prisma.usuario.create({
      data: {
        email: datos.email.toLowerCase(),
        password: passwordHash,
        nombre: datos.nombre,
        rol: datos.rol,
        farmaciaId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    if (esInvitacion) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiraEn = new Date();
      expiraEn.setDate(expiraEn.getDate() + 7);

      await prisma.tokenInvitacionUsuario.create({
        data: {
          usuarioId: usuario.id,
          token,
          expiraEn,
        },
      });

      const baseUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173';
      const urlEstablecerContrasena = `${baseUrl}/establecer-contrasena?token=${token}`;

      const enviado = await enviarInvitacionUsuario(
        usuario.email,
        usuario.nombre,
        nombreFarmacia,
        urlEstablecerContrasena,
        farmaciaId
      );

      if (!enviado) {
        console.warn('No se pudo enviar el email de invitación al usuario', usuario.email);
      }

      return res.status(201).json({
        mensaje: 'Usuario creado. Se ha enviado un correo para que establezca su contraseña.',
        usuario,
        invitacionEnviada: enviado,
      });
    }

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/admin/farmacias/:id/usuarios/:usuarioId
 * Actualizar usuario de una farmacia
 */
export async function actualizarUsuarioFarmacia(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);
    const usuarioId = getParamString(req.params.usuarioId);

    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, farmaciaId },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const datos = actualizarUsuarioFarmaciaSchema.parse(req.body);

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
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
        ultimoAcceso: true,
        createdAt: true,
      },
    });

    res.json({
      mensaje: 'Usuario actualizado correctamente',
      usuario: usuarioActualizado,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/admin/farmacias/:id/usuarios/:usuarioId/password
 * Cambiar contraseña de un usuario
 */
export async function cambiarPasswordUsuario(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);
    const usuarioId = getParamString(req.params.usuarioId);

    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, farmaciaId },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { password } = cambiarPasswordUsuarioSchema.parse(req.body);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { password: passwordHash },
    });

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * DELETE /api/admin/farmacias/:id/usuarios/:usuarioId
 * Eliminar usuario de una farmacia
 */
export async function eliminarUsuarioFarmacia(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);
    const usuarioId = getParamString(req.params.usuarioId);

    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, farmaciaId },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que no sea el último admin
    const admins = await prisma.usuario.count({
      where: { farmaciaId, rol: 'admin', activo: true },
    });

    if (usuario.rol === 'admin' && admins <= 1) {
      return res.status(400).json({
        error: 'No se puede eliminar el último administrador de la farmacia',
      });
    }

    await prisma.usuario.delete({
      where: { id: usuarioId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/admin/farmacias/:id/configuracion
 * Obtener configuración completa de una farmacia (superadmin)
 */
export async function obtenerConfiguracionFarmacia(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id: farmaciaId },
    });
    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    let config = await prisma.configuracion.findUnique({
      where: { farmaciaId },
    });

    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          farmaciaId,
          farmaciaNombre: farmacia.nombre,
          farmaciaEmail: farmacia.email,
          parametrosReferencia: JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
          parametrosBioConfig: JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
        },
      });
    }

    const parametrosReferencia = typeof config.parametrosReferencia === 'string'
      ? JSON.parse(config.parametrosReferencia) as Record<string, unknown>
      : config.parametrosReferencia as Record<string, unknown>;
    const parametrosBioConfig = typeof config.parametrosBioConfig === 'string'
      ? JSON.parse(config.parametrosBioConfig) as unknown[]
      : (config.parametrosBioConfig as unknown[] || []);

    res.json({
      id: config.id,
      farmaciaId: config.farmaciaId,
      valoracionBioActiva: config.valoracionBioActiva,
      parametrosReferencia,
      parametrosBioConfig,
      emailProvider: config.emailProvider,
      emailRemitente: config.emailRemitente,
      emailNombreRemitente: config.emailNombreRemitente,
      resendApiKey: config.resendApiKey ? '********' : null,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPass: null,
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener configuración farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/admin/farmacias/:id/configuracion
 * Actualizar configuración de una farmacia (superadmin)
 */
export async function actualizarConfiguracionFarmacia(req: Request, res: Response) {
  try {
    const farmaciaId = getParamString(req.params.id);
    const datos = actualizarConfiguracionFarmaciaSchema.parse(req.body);

    const farmacia = await prisma.farmacia.findUnique({
      where: { id: farmaciaId },
    });
    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    let config = await prisma.configuracion.findUnique({
      where: { farmaciaId },
    });

    const data: Record<string, unknown> = {};
    if (datos.valoracionBioActiva !== undefined) data.valoracionBioActiva = datos.valoracionBioActiva;
    if (datos.parametrosReferencia !== undefined) data.parametrosReferencia = JSON.stringify(datos.parametrosReferencia);
    if (datos.parametrosBioConfig !== undefined) data.parametrosBioConfig = JSON.stringify(datos.parametrosBioConfig);
    if (datos.emailProvider !== undefined) data.emailProvider = datos.emailProvider ?? null;
    if (datos.emailRemitente !== undefined) data.emailRemitente = datos.emailRemitente || null;
    if (datos.emailNombreRemitente !== undefined) data.emailNombreRemitente = datos.emailNombreRemitente ?? null;
    if (datos.resendApiKey !== undefined) data.resendApiKey = datos.resendApiKey || null;
    if (datos.smtpHost !== undefined) data.smtpHost = datos.smtpHost ?? null;
    if (datos.smtpPort !== undefined) data.smtpPort = datos.smtpPort ?? null;
    if (datos.smtpSecure !== undefined) data.smtpSecure = datos.smtpSecure;
    if (datos.smtpUser !== undefined) data.smtpUser = datos.smtpUser ?? null;
    if (datos.smtpPass !== undefined && datos.smtpPass !== '') data.smtpPass = datos.smtpPass;

    if (!config) {
      config = await prisma.configuracion.create({
        data: {
          farmaciaId,
          farmaciaNombre: farmacia.nombre,
          farmaciaEmail: farmacia.email,
          valoracionBioActiva: (data.valoracionBioActiva as boolean) ?? true,
          parametrosReferencia: (data.parametrosReferencia as string) ?? JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
          parametrosBioConfig: (data.parametrosBioConfig as string) ?? JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
          emailProvider: (data.emailProvider as string) ?? 'smtp',
          emailRemitente: data.emailRemitente as string | null ?? null,
          emailNombreRemitente: data.emailNombreRemitente as string | null ?? null,
          resendApiKey: data.resendApiKey as string | null ?? null,
          smtpHost: data.smtpHost as string | null ?? null,
          smtpPort: data.smtpPort as number | null ?? null,
          smtpSecure: (data.smtpSecure as boolean) ?? false,
          smtpUser: data.smtpUser as string | null ?? null,
          smtpPass: data.smtpPass as string | null ?? null,
        },
      });
    } else if (Object.keys(data).length > 0) {
      config = await prisma.configuracion.update({
        where: { farmaciaId },
        data: data as Parameters<typeof prisma.configuracion.update>[0]['data'],
      });
    }

    const parametrosReferencia = typeof config.parametrosReferencia === 'string'
      ? JSON.parse(config.parametrosReferencia) as Record<string, unknown>
      : config.parametrosReferencia as Record<string, unknown>;
    const parametrosBioConfig = typeof config.parametrosBioConfig === 'string'
      ? JSON.parse(config.parametrosBioConfig) as unknown[]
      : (config.parametrosBioConfig as unknown[] || []);

    res.json({
      ...config,
      parametrosReferencia,
      parametrosBioConfig,
      smtpPass: null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al actualizar configuración farmacia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
