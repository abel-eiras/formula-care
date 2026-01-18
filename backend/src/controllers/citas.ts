import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { getQueryString, getParamString } from '../lib/queryHelpers.js';
import { obtenerFarmaciaIdRequerido, obtenerFarmaciaIdOpcional } from '../middleware/tenant.js';
import { enviarConfirmacionCita } from '../services/emailService.js';

// Esquema de validación para crear cita
const crearCitaSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fecha: z.string(), // Fecha en formato ISO
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'),
  tipo: z.enum(['dermo', 'bio', 'consulta', 'seguimiento']),
  notas: z.string().optional(),
});

// Esquema de validación para actualizar cita
const actualizarCitaSchema = crearCitaSchema.partial();

/**
 * Obtener citas con filtro de fecha opcional
 */
export async function obtenerCitas(req: Request, res: Response) {
  try {
    const farmaciaId = obtenerFarmaciaIdOpcional(req);
    const fecha = getQueryString(req.query.fecha);

    const where: Record<string, unknown> = {};
    if (farmaciaId) where.farmaciaId = farmaciaId;
    if (fecha) where.fecha = fecha;

    const citas = await prisma.cita.findMany({
      where,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { fecha: 'asc' },
        { hora: 'asc' },
      ],
    });

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
}

/**
 * Obtener una cita específica por ID
 */
export async function obtenerCita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    const cita = await prisma.cita.findUnique({
      where: { id },
      include: {
        paciente: true,
      },
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    res.json(cita);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
}

/**
 * Crear una nueva cita
 */
export async function crearCita(req: Request, res: Response) {
  try {
    const farmaciaId = obtenerFarmaciaIdRequerido(req);
    const datos = crearCitaSchema.parse(req.body);

    // Verificar que el paciente existe y pertenece a la misma farmacia
    const paciente = await prisma.paciente.findUnique({
      where: { id: datos.pacienteId },
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    if (paciente.farmaciaId !== farmaciaId) {
      return res.status(403).json({ error: 'El paciente no pertenece a esta farmacia' });
    }

    const cita = await prisma.cita.create({
      data: {
        ...datos,
        farmaciaId,
      },
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // Enviar email de confirmación si el paciente tiene email
    if (cita.paciente?.email) {
      try {
        await enviarConfirmacionCita(cita.paciente.email, {
          citaId: cita.id,
          tipo: cita.tipo,
          fecha: cita.fecha,
          hora: cita.hora,
          nombreCliente: cita.paciente.name,
        });
        console.log(`✅ Email de confirmación enviado a ${cita.paciente.email}`);
      } catch (emailError) {
        // No fallar la creación de cita por error de email
        console.error('⚠️  Error al enviar email de confirmación:', emailError);
      }
    } else {
      console.log('ℹ️  Cita creada sin email (paciente sin email registrado)');
    }

    res.status(201).json(cita);
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

    console.error('Error al crear cita:', error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
}

/**
 * Actualizar una cita existente
 */
export async function actualizarCita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const datos = actualizarCitaSchema.parse(req.body);

    // Si se actualiza el pacienteId, verificar que existe
    if (datos.pacienteId) {
      const paciente = await prisma.paciente.findUnique({
        where: { id: datos.pacienteId },
      });

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }
    }

    // Obtener datos actuales de la cita para sincronización
    const citaAnterior = await prisma.cita.findUnique({
      where: { id },
      include: { paciente: true },
    });

    if (!citaAnterior) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Obtener paciente (puede haber cambiado)
    const pacienteActual = datos.pacienteId
      ? await prisma.paciente.findUnique({ where: { id: datos.pacienteId } })
      : citaAnterior.paciente; // citaAnterior incluye paciente por el include

    if (!pacienteActual) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const cita = await prisma.cita.update({
      where: { id },
      data: datos,
      include: {
        paciente: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });


    res.json(cita);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
}

/**
 * Eliminar una cita
 */
export async function eliminarCita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);

    await prisma.cita.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    console.error('Error al eliminar cita:', error);
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
}
