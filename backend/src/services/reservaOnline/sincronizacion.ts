import type { webcrypto } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { RESERVA_ONLINE_DISPONIBLE } from '../../config/funciones.js';
import { obtenerColoresMarca } from '../emailService.js';
import { datosAsociados, descifrarSolicitud, type SobreCifrado } from './cifrado.js';
import { calcularHuecos } from './disponibilidad.js';
import { asegurarClaves, obtenerReservaOnline } from './configuracion.js';
import { aceptarSolicitud, buscarCoincidencias, procesarCancelacion, registrarAvisoCambioAgenda } from './solicitudes.js';

/**
 * Sincronización con booking-web. Todas las conexiones salen de este equipo
 * (no hay que abrir puertos en la farmacia):
 *   1. Recoge del buzón las solicitudes cifradas y las cancelaciones, y las
 *      guarda/aplica aquí.
 *   2. Publica la disponibilidad actualizada, la marca y los textos legales.
 *   3. Confirma la recepción (el servidor borra lo recogido).
 * Se ejecuta cada pocos minutos y poco después de cualquier cambio de agenda.
 */

const INTERVALO_MS = 2 * 60 * 1000;
const RETARDO_TRAS_CAMBIO_MS = 3000;
const TIEMPO_MAXIMO_PETICION_MS = 20_000;

interface SolicitudBuzon {
  id: string;
  tipo: string;
  fecha: string;
  hora: string;
  sobre: SobreCifrado;
}

interface CancelacionBuzon {
  id: string;
  token: string;
}

export interface ResultadoSincronizacion {
  ok: boolean;
  omitida?: string;
  solicitudesNuevas?: number;
  cancelaciones?: number;
  aceptadasAutomaticamente?: number;
  error?: string;
}

async function peticion<T>(urlApi: string, token: string, ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const respuesta = await fetch(`${urlApi.replace(/\/+$/, '')}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_PETICION_MS),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    if (respuesta.status === 401) throw new Error('booking-web rechaza el token de sincronización (revisa SYNC_TOKEN)');
    throw new Error(`booking-web respondió ${respuesta.status} en ${ruta}${detalle ? `: ${detalle.slice(0, 200)}` : ''}`);
  }
  return (await respuesta.json()) as T;
}

/** Lo que ve el público: marca, textos legales, clave pública y huecos */
async function construirPublicacion(clavePublica: webcrypto.JsonWebKey, diasVista: number, antelacionMinimaHoras: number) {
  const [config, huecos] = await Promise.all([
    prisma.configuracion.findUnique({ where: { id: 'singleton' } }),
    calcularHuecos({ diasVista, antelacionMinimaHoras }),
  ]);
  const colores = obtenerColoresMarca(config);
  return {
    version: 1,
    generadaEn: new Date().toISOString(),
    zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
    farmacia: {
      nombre: config?.farmaciaNombre ?? null,
      direccion: config?.farmaciaDireccion ?? null,
      ciudad: config?.farmaciaCiudad ?? null,
      telefono: config?.farmaciaTelefono ?? null,
      email: config?.farmaciaEmail ?? null,
      whatsapp: config?.farmaciaWhatsapp ?? null,
      web: config?.farmaciaWeb ?? null,
      logo: config?.farmaciaLogo ?? null,
      colorPrimario: colores.primario,
    },
    legal: {
      avisoLegal: config?.textoAvisoLegal ?? null,
      privacidad: config?.textoPoliticaPrivacidad ?? null,
      cookies: config?.textoPoliticaCookies ?? null,
    },
    clavePublica,
    ...huecos,
  };
}

/** Guarda las solicitudes nuevas ya descifradas; las que no se pueden descifrar se descartan */
async function guardarSolicitudes(solicitudes: SolicitudBuzon[], clavePrivada: webcrypto.JsonWebKey) {
  const nuevas: string[] = [];
  let ilegibles = 0;
  for (const s of solicitudes) {
    if (await prisma.solicitudOnline.findUnique({ where: { id: s.id }, select: { id: true } })) continue;
    try {
      const datos = await descifrarSolicitud(s.sobre, clavePrivada, datosAsociados(s.tipo, s.fecha, s.hora));
      await prisma.solicitudOnline.create({
        data: {
          id: s.id,
          tipo: s.tipo,
          fecha: s.fecha,
          hora: s.hora,
          nombre: datos.nombre,
          email: datos.email,
          telefono: datos.telefono,
          fechaNacimiento: datos.fechaNacimiento ?? null,
          sexo: datos.sexo ?? null,
          notas: datos.notas ?? null,
        },
      });
      await prisma.notificacion.create({
        data: {
          tipo: 'cita',
          titulo: 'Nueva solicitud de cita online',
          mensaje: `${datos.nombre} pide cita el ${new Date(`${s.fecha}T12:00:00`).toLocaleDateString('es-ES')} a las ${s.hora}. Revísala en el Calendario.`,
          canal: 'interno',
        },
      });
      nuevas.push(s.id);
    } catch (error) {
      ilegibles++;
      console.error(`⚠️  Solicitud online ${s.id} ilegible (¿claves cambiadas o datos alterados?):`, error);
    }
  }
  return { nuevas, ilegibles };
}

/**
 * Acepta sola una solicitud si el hueco sigue libre y el paciente se
 * identifica sin dudas (una sola coincidencia) o se puede dar de alta.
 */
async function aceptarAutomaticamente(ids: string[]): Promise<number> {
  let aceptadas = 0;
  for (const id of ids) {
    const solicitud = await prisma.solicitudOnline.findUnique({ where: { id } });
    if (!solicitud) continue;
    const coincidencias = await buscarCoincidencias(solicitud);
    if (coincidencias.length > 1) continue; // Ambiguo: que decida el personal
    try {
      await aceptarSolicitud(id, { pacienteId: coincidencias[0]?.id });
      aceptadas++;
    } catch (error) {
      console.log(`ℹ️  Solicitud ${id} pendiente de revisión manual: ${(error as Error).message}`);
    }
  }
  return aceptadas;
}

let enCurso: Promise<ResultadoSincronizacion> | null = null;

export function sincronizarReservaOnline(): Promise<ResultadoSincronizacion> {
  // Una sola sincronización a la vez: quien llegue mientras tanto espera la misma
  enCurso ??= ejecutarSincronizacion().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

async function ejecutarSincronizacion(): Promise<ResultadoSincronizacion> {
  if (!RESERVA_ONLINE_DISPONIBLE) return { ok: true, omitida: 'La reserva online no está disponible en esta versión' };
  const inicial = await obtenerReservaOnline();
  if (!inicial.activa) return { ok: true, omitida: 'La reserva online está desactivada' };
  if (!inicial.urlApi || !inicial.tokenSincronizacion) {
    return { ok: false, omitida: 'Falta la dirección de booking-web o el token de sincronización' };
  }
  const reserva = await asegurarClaves();
  const { urlApi, tokenSincronizacion: token } = inicial;

  try {
    const buzon = await peticion<{ solicitudes: SolicitudBuzon[]; cancelaciones: CancelacionBuzon[] }>(
      urlApi,
      token,
      '/sync/buzon'
    );
    const { nuevas, ilegibles } = await guardarSolicitudes(buzon.solicitudes, JSON.parse(reserva.clavePrivada!));
    let cancelaciones = 0;
    for (const c of buzon.cancelaciones) {
      if (await procesarCancelacion(c.token)) cancelaciones++;
    }
    const config = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });
    const aceptadasAutomaticamente = config?.autoAceptar ? await aceptarAutomaticamente(nuevas) : 0;

    // Primero se publica (con las solicitudes recién recogidas ya ocupando su
    // hueco) y después se confirma la recepción: así el servidor nunca ofrece
    // como libre un hueco recién pedido. Si algo falla antes de confirmar, la
    // próxima pasada las recoge de nuevo y no se duplican (mismo id).
    const publicacion = await construirPublicacion(
      JSON.parse(reserva.clavePublica!),
      reserva.diasVista,
      reserva.antelacionMinimaHoras
    );
    await peticion(urlApi, token, '/sync/publicacion', 'PUT', publicacion);
    await peticion(urlApi, token, '/sync/buzon/recibido', 'POST', {
      solicitudes: buzon.solicitudes.map((s) => s.id),
      cancelaciones: buzon.cancelaciones.map((c) => c.id),
    });

    await prisma.reservaOnline.update({
      where: { id: 'singleton' },
      data: {
        ultimaSincronizacion: new Date(),
        ultimoError: ilegibles ? `${ilegibles} solicitud(es) no se pudieron descifrar y se descartaron` : null,
      },
    });
    return { ok: true, solicitudesNuevas: nuevas.length, cancelaciones, aceptadasAutomaticamente };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    await prisma.reservaOnline.update({ where: { id: 'singleton' }, data: { ultimoError: mensaje } });
    console.error('❌ Error al sincronizar la reserva online:', mensaje);
    return { ok: false, error: mensaje };
  }
}

let temporizadorCambio: NodeJS.Timeout | null = null;

/** Tras crear, mover o cancelar citas: publicar enseguida los huecos actualizados */
export function avisarCambioAgenda(): void {
  if (temporizadorCambio) clearTimeout(temporizadorCambio);
  temporizadorCambio = setTimeout(() => {
    temporizadorCambio = null;
    void sincronizarReservaOnline();
  }, RETARDO_TRAS_CAMBIO_MS);
}

export function iniciarSincronizacionReservaOnline(): void {
  registrarAvisoCambioAgenda(avisarCambioAgenda);
  void sincronizarReservaOnline();
  setInterval(() => void sincronizarReservaOnline(), INTERVALO_MS);
}
