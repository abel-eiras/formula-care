import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getQueryString, getParamString, getQueryNumber } from '../lib/queryHelpers.js';
import type { Paciente } from '@prisma/client';
import { aplanarMedicion } from '../services/medicionService.js';
import { normalizarBusqueda, textoBusquedaPaciente } from '../lib/textoBusqueda.js';
import { fechaHaceAnios, hoyISO } from '../lib/fechas.js';

/** El texto de búsqueda es un detalle interno: no se envía al cliente */
function serializarPaciente<T extends Pick<Paciente, 'textoBusqueda'>>({ textoBusqueda: _texto, ...paciente }: T) {
  return paciente;
}

// Esquema de validación para crear paciente
const crearPacienteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  sex: z.enum(['M', 'F', 'O']),
  phone: z.string().min(9, 'El teléfono debe tener al menos 9 caracteres'),
  email: z.string().email().optional().or(z.literal('')),
  // Obligatoria: la edad se calcula siempre a partir de ella (no se admite edad manual;
  // un campo "age" en la petición se descarta)
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de nacimiento debe tener formato YYYY-MM-DD')
    .refine((f) => !Number.isNaN(Date.parse(f)), 'Fecha de nacimiento no válida')
    .refine((f) => f >= '1900-01-01' && f <= hoyISO(), 'La fecha de nacimiento debe estar entre 1900 y hoy'),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema de validación para actualizar paciente
const actualizarPacienteSchema = crearPacienteSchema.partial();

/**
 * Obtener todos los pacientes con búsqueda y filtros avanzados.
 * Todos los filtros se resuelven en la base de datos. La búsqueda general
 * compara contra Paciente.textoBusqueda (sin mayúsculas ni tildes).
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
    const ordenarPorParam = getQueryString(req.query.ordenarPor) ?? 'createdAt';
    const ordenParam = getQueryString(req.query.orden) === 'asc' ? 'asc' : 'desc';
    // Ordenar por edad = ordenar por fecha de nacimiento en sentido inverso
    const ordenarPor = ordenarPorParam === 'age' ? 'birthDate' : ordenarPorParam;
    const orden = ordenarPorParam === 'age' ? (ordenParam === 'asc' ? 'desc' : 'asc') : ordenParam;
    // Opcional: los selectores con búsqueda piden solo los primeros resultados
    const limite = getQueryNumber(req.query.limit);

    const condiciones: Prisma.PacienteWhereInput[] = [];

    if (busqueda) {
      // Cada palabra debe aparecer (en cualquier orden): "garcia maria" encuentra "María García"
      for (const palabra of normalizarBusqueda(busqueda).split(' ')) {
        condiciones.push({ textoBusqueda: { contains: palabra } });
      }
    }

    if (email) {
      condiciones.push({ textoBusqueda: { contains: normalizarBusqueda(email) } });
    }

    if (sexo && (sexo === 'M' || sexo === 'F' || sexo === 'O')) {
      condiciones.push({ sex: sexo });
    }

    if (origen && (origen === 'manual' || origen === 'autoregistro')) {
      condiciones.push({ origen });
    }

    // La edad no se guarda: se traduce a un rango de fecha de nacimiento
    //   edad >= min  ⇔  nacido como tarde hace `min` años
    //   edad <= max  ⇔  nacido después de hace `max + 1` años
    if (edadMin !== undefined || edadMax !== undefined) {
      condiciones.push({
        birthDate: {
          lte: edadMin !== undefined ? fechaHaceAnios(edadMin) : undefined,
          gt: edadMax !== undefined ? fechaHaceAnios(edadMax + 1) : undefined,
        },
      });
    }

    if (fechaDesde || fechaHasta) {
      condiciones.push({
        createdAt: {
          gte: fechaDesde ? new Date(fechaDesde) : undefined,
          lte: fechaHasta ? new Date(fechaHasta) : undefined,
        },
      });
    }

    if (tieneDermo === 'true') {
      condiciones.push({ analisisDermo: { some: {} } });
    }

    if (tieneBio === 'true') {
      condiciones.push({ analisisBio: { some: {} } });
    }

    const pacientes = await prisma.paciente.findMany({
      where: condiciones.length > 0 ? { AND: condiciones } : {},
      orderBy: { [ordenarPor]: orden },
      take: limite && limite > 0 ? Math.min(limite, 500) : undefined,
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

    res.json(pacientes.map(serializarPaciente));
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
}

/**
 * Obtener un paciente específico por ID (con sus últimas citas)
 */
export async function obtenerPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        citas: {
          orderBy: { fecha: 'desc' },
          take: 10,
        },
      },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json(serializarPaciente(paciente));
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
}

/**
 * Historial único de mediciones del paciente (peso, perímetros,
 * bioimpedancia, tensión...), venga del servicio que venga, por fecha.
 */
export async function obtenerMedicionesPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const mediciones = await prisma.medicion.findMany({
      where: { pacienteId: id },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    });

    res.json(
      mediciones.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        origen: m.origen,
        analisisBioId: m.analisisBioId,
        visitaNutricionId: m.visitaNutricionId,
        ...aplanarMedicion(m),
      }))
    );
  } catch (error) {
    console.error('Error al obtener mediciones:', error);
    res.status(500).json({ error: 'Error al obtener las mediciones del paciente' });
  }
}

/**
 * Crear un nuevo paciente
 */
export async function crearPaciente(req: Request, res: Response) {
  try {
    const datos = crearPacienteSchema.parse(req.body);
    const email = datos.email || null;

    const paciente = await prisma.paciente.create({
      data: {
        ...datos,
        email,
        textoBusqueda: textoBusquedaPaciente({ ...datos, email }),
      },
    });

    res.status(201).json(serializarPaciente(paciente));
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
 */
export async function actualizarPaciente(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const existente = await prisma.paciente.findUnique({
      where: { id },
      select: { name: true, phone: true, email: true },
    });
    if (!existente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const datos = actualizarPacienteSchema.parse(req.body);
    // Email vacío = sin email
    const email = datos.email === undefined ? existente.email : datos.email || null;

    const paciente = await prisma.paciente.update({
      where: { id },
      data: {
        ...datos,
        email,
        // El texto de búsqueda se recalcula con los valores resultantes
        textoBusqueda: textoBusquedaPaciente({
          name: datos.name ?? existente.name,
          phone: datos.phone ?? existente.phone,
          email,
        }),
      },
    });

    res.json(serializarPaciente(paciente));
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
