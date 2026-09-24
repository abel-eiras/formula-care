import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getParamString, getQueryString } from '../lib/queryHelpers.js';
import { diasEntre, MAX_DIAS_RANGO, obtenerCumpleanos, registrarFelicitacion, CANALES_FELICITACION } from '../services/cumpleanosService.js';
import { enviarFelicitacionCumpleanos } from '../services/emailService.js';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD');

/**
 * Cumpleaños de pacientes en un rango: GET /api/cumpleanos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
export async function listarCumpleanos(req: Request, res: Response) {
  try {
    const desde = fecha.parse(getQueryString(req.query.desde));
    const hasta = fecha.parse(getQueryString(req.query.hasta));
    if (hasta < desde || diasEntre(desde, hasta).length > MAX_DIAS_RANGO) {
      return res.status(400).json({ error: `El rango debe ser válido y de como máximo ${MAX_DIAS_RANGO} días` });
    }
    res.json(await obtenerCumpleanos(desde, hasta));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Parámetros desde y hasta requeridos (YYYY-MM-DD)' });
    }
    console.error('Error al obtener cumpleaños:', error);
    res.status(500).json({ error: 'Error al obtener los cumpleaños' });
  }
}

const felicitarSchema = z.object({
  anio: z.number().int().min(1900).max(2200),
  canal: z.enum(CANALES_FELICITACION),
});

/**
 * Registra la felicitación de un año. Con canal "email" además envía el
 * correo y solo lo registra si se ha enviado.
 */
export async function felicitar(req: Request, res: Response) {
  try {
    const pacienteId = getParamString(req.params.pacienteId);
    const { anio, canal } = felicitarSchema.parse(req.body);

    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { name: true, email: true },
    });
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    if (canal === 'email') {
      if (!paciente.email) {
        return res.status(400).json({ error: 'El paciente no tiene email' });
      }
      const enviado = await enviarFelicitacionCumpleanos(paciente.email, paciente.name);
      if (!enviado) {
        return res.status(502).json({
          error: 'No se ha podido enviar el email. Revisa la configuración de correo o si la plantilla está desactivada.',
        });
      }
    }

    const felicitacion = await registrarFelicitacion(pacienteId, anio, canal, req.usuario?.nombre);
    res.status(201).json(felicitacion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    console.error('Error al registrar felicitación:', error);
    res.status(500).json({ error: 'Error al registrar la felicitación' });
  }
}

/** Deshace la felicitación registrada de un año (p. ej. marcada por error) */
export async function deshacerFelicitacion(req: Request, res: Response) {
  try {
    const pacienteId = getParamString(req.params.pacienteId);
    const anio = Number(getParamString(req.params.anio));
    await prisma.felicitacionCumpleanos.deleteMany({ where: { pacienteId, anio } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al deshacer felicitación:', error);
    res.status(500).json({ error: 'Error al deshacer la felicitación' });
  }
}
