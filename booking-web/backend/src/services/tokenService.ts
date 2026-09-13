/**
 * Servicio de Tokens para Acciones de Cita.
 * Genera y valida tokens únicos para confirmar, modificar o cancelar citas.
 *
 * Adaptado del backend original (ya era tenant-agnostic: opera sobre Cita por id).
 */

import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';

export type TipoAccionCita = 'confirmar' | 'modificar' | 'cancelar';

const HORAS_EXPIRACION_DEFAULT: Record<TipoAccionCita, number> = {
  confirmar: 72, // 3 días
  modificar: 48, // 2 días
  cancelar: 24, // 1 día
};

function generarTokenUnico(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Genera tokens de acción (confirmar/modificar/cancelar) para una cita.
 * Elimina tokens anteriores no usados de esa cita antes de crear los nuevos.
 */
export async function generarTokensAccionCita(
  citaId: string,
  horasExpiracion?: Partial<Record<TipoAccionCita, number>>
): Promise<Record<TipoAccionCita, string>> {
  const tokens: Record<TipoAccionCita, string> = {
    confirmar: '',
    modificar: '',
    cancelar: '',
  };

  await prisma.tokenAccionCita.deleteMany({
    where: { citaId, usado: false },
  });

  const tipos: TipoAccionCita[] = ['confirmar', 'modificar', 'cancelar'];

  for (const tipo of tipos) {
    const token = generarTokenUnico();
    const horas = horasExpiracion?.[tipo] ?? HORAS_EXPIRACION_DEFAULT[tipo];
    const expiraEn = new Date(Date.now() + horas * 60 * 60 * 1000);

    await prisma.tokenAccionCita.create({
      data: { citaId, token, tipo, expiraEn },
    });

    tokens[tipo] = token;
  }

  return tokens;
}

/**
 * Verifica un token y retorna los datos de la cita asociada.
 */
export async function verificarToken(token: string) {
  const tokenData = await prisma.tokenAccionCita.findUnique({
    where: { token },
    include: { cita: true },
  });

  if (!tokenData) {
    return { valido: false, error: 'Token no válido', data: null } as const;
  }

  if (tokenData.usado) {
    return { valido: false, error: 'Este enlace ya ha sido utilizado', data: null } as const;
  }

  if (new Date() > tokenData.expiraEn) {
    return { valido: false, error: 'Este enlace ha expirado', data: null } as const;
  }

  return {
    valido: true,
    error: null,
    data: {
      tokenId: tokenData.id,
      tipo: tokenData.tipo as TipoAccionCita,
      cita: tokenData.cita,
      expiraEn: tokenData.expiraEn,
    },
  } as const;
}

/**
 * Marca un token como usado.
 */
export async function marcarTokenUsado(token: string): Promise<boolean> {
  try {
    await prisma.tokenAccionCita.update({
      where: { token },
      data: { usado: true, usadoEn: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpia tokens expirados/antiguos. Pensado para ejecutarse periódicamente.
 */
export async function limpiarTokensExpirados(): Promise<number> {
  const resultado = await prisma.tokenAccionCita.deleteMany({
    where: {
      OR: [
        { expiraEn: { lt: new Date() } },
        { usado: true, usadoEn: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  return resultado.count;
}

/**
 * Construye las URLs de acción para los emails.
 */
export function construirUrlsAccion(
  tokens: Record<TipoAccionCita, string>,
  baseUrl?: string
): Record<TipoAccionCita, string> {
  const base = baseUrl || process.env.APP_URL || 'http://localhost:5174';

  return {
    confirmar: `${base}/cita/confirmar/${tokens.confirmar}`,
    modificar: `${base}/cita/modificar/${tokens.modificar}`,
    cancelar: `${base}/cita/cancelar/${tokens.cancelar}`,
  };
}
