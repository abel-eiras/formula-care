import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getQueryString, getParamString, getQueryNumber } from '../lib/queryHelpers.js';
import {
  encryptPacienteData, 
  decryptPacienteData, 
  decryptPacientesList,
  hashEmail 
} from '../services/encryptionService.js';

// Esquema de validación para crear paciente
const crearPacienteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  age: z.number().int().positive().max(150),
  sex: z.enum(['M', 'F', 'O']),
  phone: z.string().min(9, 'El teléfono debe tener al menos 9 caracteres'),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema de validación para actualizar paciente
const actualizarPacienteSchema = crearPacienteSchema.partial();

/**
 * Obtener todos los pacientes con búsqueda y filtros avanzados
 * NOTA: Los campos name, phone y email están encriptados en BD
 * La búsqueda se realiza desencriptando en memoria (viable para < 200 pacientes)
 */
export async function obtenerPacientes(req: Request, res: Response) {
  try {
    const busqueda = getQueryString(req.query.busqueda);
    const email = getQueryString(req.query.email);
    const sexo = getQueryString(req.query.sexo);
    const origen = getQueryString(req.query.origen);
    const edadMin = getQueryNumber(req.query.edadMin);
    const edadMax = getQueryNumber(req.query.edadMax);
    const tieneDermo = getQueryString(req.query.tieneDermo);
    const tieneBio = getQueryString(req.query.tieneBio);
    const fechaDesde = getQueryString(req.query.fechaDesde);
    const fechaHasta = getQueryString(req.query.fechaHasta);
    const ordenarPor = getQueryString(req.query.ordenarPor) ?? 'createdAt';
    const orden = getQueryString(req.query.orden) ?? 'desc';
    
    // Construir condiciones de búsqueda (solo campos NO encriptados)
    const condiciones: Prisma.PacienteWhereInput[] = [];

    // Filtro por sexo
    if (sexo && (sexo === 'M' || sexo === 'F' || sexo === 'O')) {
      condiciones.push({ sex: sexo });
    }

    // Filtro por origen
    if (origen && (origen === 'manual' || origen === 'autoregistro')) {
      condiciones.push({ origen: origen });
    }

    // Filtro por rango de edad
    if (edadMin !== undefined || edadMax !== undefined) {
      const edadFilter: { gte?: number; lte?: number } = {};
      if (edadMin !== undefined) {
        edadFilter.gte = edadMin;
      }
      if (edadMax !== undefined) {
        edadFilter.lte = edadMax;
      }
      condiciones.push({ age: edadFilter });
    }
    
    // Filtro por fecha de creación
    if (fechaDesde || fechaHasta) {
      const fechaFilter: { gte?: Date; lte?: Date } = {};
      if (fechaDesde) {
        fechaFilter.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        fechaFilter.lte = new Date(fechaHasta);
      }
      condiciones.push({ createdAt: fechaFilter });
    }
    
    const where = condiciones.length > 0 ? { AND: condiciones } : {};
    
    // Obtener pacientes de la BD
    const pacientesEncriptados = await prisma.paciente.findMany({
      where,
      orderBy: { 
        [ordenarPor]: orden === 'asc' ? 'asc' : 'desc' 
      },
      include: {
        _count: {
          select: {
            analisisDermo: true,
            analisisBio: true,
            citas: true,
          },
        },
      },
    });
    
    // Desencriptar datos sensibles (name, phone, email)
    const pacientesDesencriptados = decryptPacientesList(pacientesEncriptados);
    
    // Aplicar filtros en campos encriptados (búsqueda en memoria)
    let pacientesFiltrados = pacientesDesencriptados;
    
    // Búsqueda general (nombre, teléfono, email) - ahora en memoria
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      pacientesFiltrados = pacientesFiltrados.filter(p => 
        p.name.toLowerCase().includes(busquedaLower) ||
        p.phone.toLowerCase().includes(busquedaLower) ||
        (p.email && p.email.toLowerCase().includes(busquedaLower))
      );
    }
    
    // Filtro por email específico - ahora en memoria
    if (email) {
      const emailLower = email.toLowerCase();
      pacientesFiltrados = pacientesFiltrados.filter(p => 
        p.email && p.email.toLowerCase().includes(emailLower)
      );
    }
    
    // Filtrar por tipo de servicio si se especifica
    if (tieneDermo === 'true') {
      pacientesFiltrados = pacientesFiltrados.filter(p => p._count.analisisDermo > 0);
    }
    
    if (tieneBio === 'true') {
      pacientesFiltrados = pacientesFiltrados.filter(p => p._count.analisisBio > 0);
    }

    res.json(pacientesFiltrados);
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
}

/**
 * Obtener un paciente específico por ID
 * Desencripta automáticamente los datos sensibles antes de enviar
 */
export async function obtenerPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        analisisDermo: {
          orderBy: { fecha: 'desc' },
          take: 10, // Últimos 10 análisis
        },
        analisisBio: {
          orderBy: { fecha: 'desc' },
          take: 10, // Últimos 10 análisis
        },
        citas: {
          orderBy: { fecha: 'desc' },
          take: 10, // Próximas 10 citas
        },
      },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Desencriptar datos sensibles antes de enviar
    const pacienteDesencriptado = decryptPacienteData(paciente);

    res.json(pacienteDesencriptado);
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
}

/**
 * Crear un nuevo paciente
 * Encripta automáticamente los datos sensibles (name, phone, email)
 */
export async function crearPaciente(req: Request, res: Response) {
  try {
    const datos = crearPacienteSchema.parse(req.body);

    // Encriptar datos sensibles antes de guardar
    const datosEncriptados = encryptPacienteData({
      name: datos.name,
      phone: datos.phone,
      email: datos.email || undefined,
    });

    const paciente = await prisma.paciente.create({
      data: {
        ...datos,
        ...datosEncriptados,
        email: datosEncriptados.email || undefined,
      },
    });

    // Devolver datos desencriptados al frontend
    const pacienteDesencriptado = decryptPacienteData(paciente);
    res.status(201).json(pacienteDesencriptado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    console.error('Error al crear paciente:', error);
    res.status(500).json({ error: 'Error al crear paciente' });
  }
}

/**
 * Actualizar un paciente existente
 * Encripta automáticamente los datos sensibles que se modifiquen
 */
export async function actualizarPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const pacienteExistente = await prisma.paciente.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!pacienteExistente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const datos = actualizarPacienteSchema.parse(req.body);

    // Preparar datos para actualización, encriptando campos sensibles
    const datosActualizacion: Record<string, unknown> = { ...datos };
    
    // Encriptar campos sensibles si están presentes
    if (datos.name !== undefined) {
      const encrypted = encryptPacienteData({ name: datos.name });
      datosActualizacion.name = encrypted.name;
    }
    
    if (datos.phone !== undefined) {
      const encrypted = encryptPacienteData({ phone: datos.phone });
      datosActualizacion.phone = encrypted.phone;
    }
    
    if (datos.email !== undefined) {
      if (datos.email) {
        const encrypted = encryptPacienteData({ email: datos.email });
        datosActualizacion.email = encrypted.email;
        datosActualizacion.emailHash = encrypted.emailHash;
      } else {
        datosActualizacion.email = null;
        datosActualizacion.emailHash = null;
      }
    }

    const paciente = await prisma.paciente.update({
      where: { id },
      data: datosActualizacion,
    });

    // Devolver datos desencriptados
    const pacienteDesencriptado = decryptPacienteData(paciente);
    res.json(pacienteDesencriptado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    // Error de Prisma cuando no existe el registro
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    console.error('Error al actualizar paciente:', error);
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
}

/**
 * Eliminar un paciente
 */
export async function eliminarPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const pacienteExistente = await prisma.paciente.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!pacienteExistente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    await prisma.paciente.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    // Error de Prisma cuando no existe el registro
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    console.error('Error al eliminar paciente:', error);
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
}
