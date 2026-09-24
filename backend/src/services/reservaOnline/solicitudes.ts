import type { SolicitudOnline } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { hoyISO } from '../../lib/fechas.js';
import { normalizarBusqueda, textoBusquedaPaciente } from '../../lib/textoBusqueda.js';
import { enviarCancelacionCita, enviarConfirmacionCita, enviarRechazoSolicitud } from '../emailService.js';
import { huecoSigueLibre, NOMBRES_SERVICIO, type ServicioReservable } from './disponibilidad.js';
import { generarSecreto, obtenerReservaOnline, urlCancelacion } from './configuracion.js';

/** Error de negocio con mensaje para mostrar tal cual en la interfaz */
export class ErrorReserva extends Error {}

/** Aviso para que se vuelvan a publicar los huecos tras un cambio (lo registra la sincronización) */
let alCambiarAgenda: () => void = () => {};
export function registrarAvisoCambioAgenda(aviso: () => void): void {
  alCambiarAgenda = aviso;
}

async function nombreDelTipo(tipo: string): Promise<string> {
  if (tipo.startsWith('evento:')) {
    const evento = await prisma.evento.findUnique({ where: { id: tipo.slice(7) }, select: { nombre: true } });
    return evento?.nombre ?? 'Evento';
  }
  return NOMBRES_SERVICIO[tipo as ServicioReservable] ?? tipo;
}

/** Últimos 9 dígitos del teléfono (sin prefijo internacional ni espacios) */
function digitosTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '').slice(-9);
}

/** Pacientes que podrían ser quien pide cita: mismo email o mismo teléfono */
export async function buscarCoincidencias(solicitud: Pick<SolicitudOnline, 'email' | 'telefono'>) {
  const condiciones = [{ textoBusqueda: { contains: normalizarBusqueda(solicitud.email) } }];
  const telefono = digitosTelefono(solicitud.telefono);
  if (telefono.length >= 9) condiciones.push({ textoBusqueda: { contains: telefono } });
  return prisma.paciente.findMany({
    where: { OR: condiciones },
    select: { id: true, name: true, phone: true, email: true, birthDate: true },
    take: 5,
  });
}

export interface DatosNuevoPaciente {
  name: string;
  sex: 'M' | 'F' | 'O';
  birthDate: string;
  phone: string;
  email?: string;
}

export interface OpcionesAceptar {
  /** Paciente existente al que se asigna la cita */
  pacienteId?: string;
  /** Si no se indica paciente: datos para darlo de alta (por defecto, los de la solicitud) */
  nuevoPaciente?: Partial<DatosNuevoPaciente>;
}

/**
 * Acepta una solicitud: asigna o crea el paciente, crea la cita confirmada y
 * envía el email de confirmación (con enlace para cancelar) en segundo plano.
 */
export async function aceptarSolicitud(id: string, opciones: OpcionesAceptar = {}) {
  const solicitud = await prisma.solicitudOnline.findUnique({ where: { id } });
  if (!solicitud) throw new ErrorReserva('La solicitud no existe');
  if (solicitud.estado !== 'pendiente') throw new ErrorReserva('La solicitud ya estaba resuelta');
  if (!(await huecoSigueLibre(solicitud.tipo, solicitud.fecha, solicitud.hora, solicitud.id))) {
    throw new ErrorReserva('Ese hueco ya está ocupado por otra cita. Rechaza la solicitud o cambia la otra cita.');
  }

  let pacienteId = opciones.pacienteId;
  if (pacienteId) {
    const existe = await prisma.paciente.findUnique({ where: { id: pacienteId }, select: { id: true } });
    if (!existe) throw new ErrorReserva('El paciente elegido no existe');
  }

  const nombreServicio = await nombreDelTipo(solicitud.tipo);
  const token = generarSecreto();

  const cita = await prisma.$transaction(async (tx) => {
    if (!pacienteId) {
      const datos: DatosNuevoPaciente = {
        name: opciones.nuevoPaciente?.name?.trim() || solicitud.nombre,
        sex: opciones.nuevoPaciente?.sex ?? (solicitud.sexo as DatosNuevoPaciente['sex'] | null) ?? 'O',
        birthDate: opciones.nuevoPaciente?.birthDate || solicitud.fechaNacimiento || '',
        phone: opciones.nuevoPaciente?.phone?.trim() || solicitud.telefono,
        email: opciones.nuevoPaciente?.email?.trim() || solicitud.email,
      };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.birthDate)) {
        throw new ErrorReserva('Falta la fecha de nacimiento para dar de alta al paciente');
      }
      const paciente = await tx.paciente.create({
        data: { ...datos, origen: 'autoregistro', textoBusqueda: textoBusquedaPaciente(datos) },
      });
      pacienteId = paciente.id;
    }

    const nueva = await tx.cita.create({
      data: {
        titulo: `${nombreServicio} - ${solicitud.nombre}`,
        pacienteId,
        fecha: solicitud.fecha,
        hora: solicitud.hora,
        tipo: solicitud.tipo,
        estado: 'confirmada',
        notas: solicitud.notas ? `Reserva online: ${solicitud.notas}` : 'Reserva online',
        tokenCancelacion: token,
      },
    });
    await tx.solicitudOnline.update({
      where: { id },
      data: { estado: 'aceptada', pacienteId, citaId: nueva.id, resueltaEn: new Date() },
    });
    return nueva;
  });

  const reserva = await obtenerReservaOnline();
  void enviarConfirmacionCita(solicitud.email, {
    citaId: cita.id,
    tipo: cita.tipo,
    fecha: cita.fecha,
    hora: cita.hora,
    nombreCliente: solicitud.nombre,
    urlCancelar: urlCancelacion(reserva.urlPublica, token),
  });
  alCambiarAgenda();
  return cita;
}

/** Rechaza una solicitud y avisa al paciente por email (en segundo plano) */
export async function rechazarSolicitud(id: string, motivo?: string) {
  const solicitud = await prisma.solicitudOnline.findUnique({ where: { id } });
  if (!solicitud) throw new ErrorReserva('La solicitud no existe');
  if (solicitud.estado !== 'pendiente') throw new ErrorReserva('La solicitud ya estaba resuelta');

  const motivoLimpio = motivo?.trim() || undefined;
  await prisma.solicitudOnline.update({
    where: { id },
    data: { estado: 'rechazada', motivoRechazo: motivoLimpio ?? null, resueltaEn: new Date() },
  });
  void enviarRechazoSolicitud(solicitud.email, {
    tipo: solicitud.tipo,
    fecha: solicitud.fecha,
    hora: solicitud.hora,
    nombreCliente: solicitud.nombre,
    motivoRechazo: motivoLimpio,
  });
  alCambiarAgenda();
}

/**
 * El paciente pulsó "cancelar mi cita" en el email. booking-web no puede
 * validar el enlace (no conoce las citas): se comprueba aquí.
 * Devuelve true si se ha cancelado una cita.
 */
export async function procesarCancelacion(token: string): Promise<boolean> {
  const cita = await prisma.cita.findUnique({
    where: { tokenCancelacion: token },
    include: { paciente: { select: { id: true, name: true, email: true } } },
  });
  if (!cita || cita.estado === 'cancelada' || cita.fecha.slice(0, 10) < hoyISO()) return false;

  await prisma.cita.update({ where: { id: cita.id }, data: { estado: 'cancelada' } });
  await prisma.notificacion.create({
    data: {
      tipo: 'cita',
      pacienteId: cita.paciente.id,
      citaId: cita.id,
      titulo: 'Cita cancelada por el paciente',
      mensaje: `${cita.paciente.name} ha cancelado su cita del ${new Date(`${cita.fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES')} a las ${cita.hora}`,
      canal: 'interno',
    },
  });
  if (cita.paciente.email) {
    void enviarCancelacionCita(cita.paciente.email, {
      citaId: cita.id,
      tipo: cita.tipo,
      fecha: cita.fecha,
      hora: cita.hora,
      nombreCliente: cita.paciente.name,
    });
  }
  return true;
}
