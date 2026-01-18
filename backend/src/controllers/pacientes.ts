import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getQueryString, getParamString, getQueryNumber } from '../lib/queryHelpers.js';
import { obtenerFarmaciaIdRequerido, obtenerFarmaciaIdOpcional } from '../middleware/tenant.js';

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
 */
export async function obtenerPacientes(req: Request, res: Response) {
  try {
    // Obtener farmaciaId del usuario autenticado
    const farmaciaId = obtenerFarmaciaIdOpcional(req);
    
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
    
    // Construir condiciones de búsqueda
    const condiciones: Prisma.PacienteWhereInput[] = [];
    
    // Filtrar por farmacia (obligatorio para usuarios normales)
    if (farmaciaId) {
      condiciones.push({ farmaciaId });
    }
    
    // Búsqueda general (nombre, teléfono, email)
    if (busqueda) {
      condiciones.push({
        OR: [
          { name: { contains: busqueda } },
          { phone: { contains: busqueda } },
          { email: { contains: busqueda } },
        ],
      });
    }
    
    // Filtro por email específico
    if (email) {
      condiciones.push({ email: { contains: email } });
    }
    
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
    
    // Obtener pacientes
    const pacientes = await prisma.paciente.findMany({
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
    
    // Filtrar por tipo de servicio si se especifica (post-query porque requiere relación)
    let pacientesFiltrados = pacientes;
    
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

    res.json(paciente);
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
}

/**
 * Crear un nuevo paciente
 */
export async function crearPaciente(req: Request, res: Response) {
  try {
    // Obtener farmaciaId del usuario autenticado
    const farmaciaId = obtenerFarmaciaIdRequerido(req);
    
    const datos = crearPacienteSchema.parse(req.body);

    const paciente = await prisma.paciente.create({
      data: {
        ...datos,
        email: datos.email || undefined,
        farmaciaId,
      },
    });

    res.status(201).json(paciente);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('farmacia')) {
      return res.status(403).json({ error: error.message });
    }

    console.error('Error al crear paciente:', error);
    res.status(500).json({ error: 'Error al crear paciente' });
  }
}

/**
 * Actualizar un paciente existente
 */
export async function actualizarPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const datos = actualizarPacienteSchema.parse(req.body);

    const paciente = await prisma.paciente.update({
      where: { id },
      data: datos,
    });

    res.json(paciente);
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
