import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { generarParClaves } from './cifrado.js';

const ID = 'singleton';

/** Configuración de la reserva online (se crea vacía la primera vez) */
export async function obtenerReservaOnline() {
  return prisma.reservaOnline.upsert({ where: { id: ID }, update: {}, create: { id: ID } });
}

/**
 * Genera el par de claves la primera vez. La clave privada se queda en la
 * base de datos local: si se regenerara, las solicitudes cifradas con la
 * anterior que aún estén en el buzón ya no se podrían leer.
 */
export async function asegurarClaves() {
  const reserva = await obtenerReservaOnline();
  if (reserva.clavePublica && reserva.clavePrivada) return reserva;
  const { publica, privada } = await generarParClaves();
  return prisma.reservaOnline.update({
    where: { id: ID },
    data: { clavePublica: JSON.stringify(publica), clavePrivada: JSON.stringify(privada) },
  });
}

/** Secreto aleatorio para enlaces y para el token de sincronización */
export function generarSecreto(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** Enlace del email para que el paciente cancele su cita online */
export function urlCancelacion(urlPublica: string | null | undefined, token: string | null | undefined): string | undefined {
  if (!urlPublica || !token) return undefined;
  return `${urlPublica.replace(/\/+$/, '')}/cancelar/${token}`;
}
