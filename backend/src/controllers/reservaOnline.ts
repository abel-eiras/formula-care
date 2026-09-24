import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getParamString, getQueryString } from '../lib/queryHelpers.js';
import { huellaClave } from '../services/reservaOnline/cifrado.js';
import { asegurarClaves, generarSecreto, obtenerReservaOnline } from '../services/reservaOnline/configuracion.js';
import { sincronizarReservaOnline } from '../services/reservaOnline/sincronizacion.js';
import {
  aceptarSolicitud,
  buscarCoincidencias,
  ErrorReserva,
  rechazarSolicitud,
} from '../services/reservaOnline/solicitudes.js';

const urlHttp = z
  .string()
  .trim()
  .url('Dirección no válida')
  .refine((u) => /^https?:\/\//.test(u), 'La dirección debe empezar por https://')
  .or(z.literal(''));

const configSchema = z.object({
  activa: z.boolean().optional(),
  urlPublica: urlHttp.optional(),
  urlApi: urlHttp.optional(),
  tokenSincronizacion: z.string().trim().max(200).optional(),
  diasVista: z.number().int().min(1).max(180).optional(),
  antelacionMinimaHoras: z.number().int().min(0).max(24 * 14).optional(),
});

async function respuestaConfig() {
  const reserva = await obtenerReservaOnline();
  return {
    activa: reserva.activa,
    urlPublica: reserva.urlPublica,
    urlApi: reserva.urlApi,
    tokenSincronizacion: reserva.tokenSincronizacion,
    diasVista: reserva.diasVista,
    antelacionMinimaHoras: reserva.antelacionMinimaHoras,
    ultimaSincronizacion: reserva.ultimaSincronizacion,
    ultimoError: reserva.ultimoError,
    huellaClave: reserva.clavePublica ? await huellaClave(JSON.parse(reserva.clavePublica)) : null,
  };
}

function responderError(res: Response, error: unknown, mensaje: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', mensaje: error.errors[0]?.message, detalles: error.errors });
  }
  if (error instanceof ErrorReserva) return res.status(409).json({ error: error.message, mensaje: error.message });
  console.error(`${mensaje}:`, error);
  return res.status(500).json({ error: mensaje });
}

export async function obtenerConfigReserva(_req: Request, res: Response) {
  try {
    res.json(await respuestaConfig());
  } catch (error) {
    responderError(res, error, 'Error al obtener la reserva online');
  }
}

export async function actualizarConfigReserva(req: Request, res: Response) {
  try {
    const datos = configSchema.parse(req.body);
    await obtenerReservaOnline();
    await prisma.reservaOnline.update({
      where: { id: 'singleton' },
      data: {
        ...datos,
        urlPublica: datos.urlPublica === undefined ? undefined : datos.urlPublica || null,
        urlApi: datos.urlApi === undefined ? undefined : datos.urlApi || null,
        tokenSincronizacion: datos.tokenSincronizacion === undefined ? undefined : datos.tokenSincronizacion || null,
      },
    });
    if (datos.activa) await asegurarClaves();
    void sincronizarReservaOnline();
    res.json(await respuestaConfig());
  } catch (error) {
    responderError(res, error, 'Error al guardar la reserva online');
  }
}

/** Genera un token nuevo; hay que copiarlo en SYNC_TOKEN de booking-web */
export async function regenerarToken(_req: Request, res: Response) {
  try {
    await obtenerReservaOnline();
    await prisma.reservaOnline.update({ where: { id: 'singleton' }, data: { tokenSincronizacion: generarSecreto(32) } });
    res.json(await respuestaConfig());
  } catch (error) {
    responderError(res, error, 'Error al generar el token');
  }
}

export async function sincronizarAhora(_req: Request, res: Response) {
  try {
    const resultado = await sincronizarReservaOnline();
    res.json({ ...resultado, config: await respuestaConfig() });
  } catch (error) {
    responderError(res, error, 'Error al sincronizar');
  }
}

export async function listarSolicitudes(req: Request, res: Response) {
  try {
    const estado = getQueryString(req.query.estado) ?? 'pendiente';
    const solicitudes = await prisma.solicitudOnline.findMany({
      where: estado === 'todas' ? {} : { estado },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      take: 200,
    });
    const eventos = await prisma.evento.findMany({ select: { id: true, nombre: true } });
    const nombreEvento = new Map(eventos.map((e) => [`evento:${e.id}`, e.nombre]));

    // Posibles pacientes ya registrados (solo para las pendientes)
    const conCoincidencias = await Promise.all(
      solicitudes.map(async (s) => ({
        ...s,
        nombreEvento: nombreEvento.get(s.tipo) ?? null,
        coincidencias: s.estado === 'pendiente' ? await buscarCoincidencias(s) : [],
      }))
    );
    res.json(conCoincidencias);
  } catch (error) {
    responderError(res, error, 'Error al obtener las solicitudes');
  }
}

const aceptarSchema = z.object({
  pacienteId: z.string().min(1).optional(),
  nuevoPaciente: z
    .object({
      name: z.string().trim().min(2).optional(),
      sex: z.enum(['M', 'F', 'O']).optional(),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento no válida').optional(),
      phone: z.string().trim().min(6).optional(),
      email: z.string().trim().email().optional(),
    })
    .optional(),
});

export async function aceptar(req: Request, res: Response) {
  try {
    const cita = await aceptarSolicitud(getParamString(req.params.id) ?? '', aceptarSchema.parse(req.body ?? {}));
    res.json({ mensaje: 'Solicitud aceptada', cita });
  } catch (error) {
    responderError(res, error, 'Error al aceptar la solicitud');
  }
}

export async function rechazar(req: Request, res: Response) {
  try {
    const { motivo } = z.object({ motivo: z.string().max(500).optional() }).parse(req.body ?? {});
    await rechazarSolicitud(getParamString(req.params.id) ?? '', motivo);
    res.json({ mensaje: 'Solicitud rechazada' });
  } catch (error) {
    responderError(res, error, 'Error al rechazar la solicitud');
  }
}
