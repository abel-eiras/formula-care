/**
 * Servicio de Tokens para Acciones de Cita
 * Genera y valida tokens únicos para confirmar, modificar o cancelar citas
 */

import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';

// Tipos de acción disponibles
export type TipoAccionCita = 'confirmar' | 'modificar' | 'cancelar';

// Horas de expiración por defecto para cada tipo de acción
const HORAS_EXPIRACION_DEFAULT: Record<TipoAccionCita, number> = {
  confirmar: 72,  // 3 días
  modificar: 48,  // 2 días
  cancelar: 24,   // 1 día
};

/**
 * Genera un token único seguro
 */
function generarTokenUnico(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Genera tokens de acción para una cita
 * Crea tokens para confirmar, modificar y cancelar
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

  // Eliminar tokens anteriores no usados de esta cita
  await prisma.tokenAccionCita.deleteMany({
    where: {
      citaId,
      usado: false,
    },
  });

  // Crear nuevos tokens para cada tipo
  const tipos: TipoAccionCita[] = ['confirmar', 'modificar', 'cancelar'];

  for (const tipo of tipos) {
    const token = generarTokenUnico();
    const horas = horasExpiracion?.[tipo] ?? HORAS_EXPIRACION_DEFAULT[tipo];
    const expiraEn = new Date(Date.now() + horas * 60 * 60 * 1000);

    await prisma.tokenAccionCita.create({
      data: {
        citaId,
        token,
        tipo,
        expiraEn,
      },
    });

    tokens[tipo] = token;
  }

  return tokens;
}

/**
 * Genera un token de acción específico para una cita
 */
export async function generarTokenAccion(
  citaId: string,
  tipo: TipoAccionCita,
  horasExpiracion?: number
): Promise<string> {
  const token = generarTokenUnico();
  const horas = horasExpiracion ?? HORAS_EXPIRACION_DEFAULT[tipo];
  const expiraEn = new Date(Date.now() + horas * 60 * 60 * 1000);

  // Eliminar token anterior del mismo tipo si existe
  await prisma.tokenAccionCita.deleteMany({
    where: {
      citaId,
      tipo,
      usado: false,
    },
  });

  await prisma.tokenAccionCita.create({
    data: {
      citaId,
      token,
      tipo,
      expiraEn,
    },
  });

  return token;
}

/**
 * Verifica un token y retorna los datos de la cita asociada
 * Retorna null si el token es inválido, expirado o ya usado
 */
export async function verificarToken(token: string) {
  const tokenData = await prisma.tokenAccionCita.findUnique({
    where: { token },
    include: {
      cita: {
        include: {
          paciente: true,
        },
      },
    },
  });

  // Token no encontrado
  if (!tokenData) {
    return { valido: false, error: 'Token no válido', data: null };
  }

  // Token ya usado
  if (tokenData.usado) {
    return { valido: false, error: 'Este enlace ya ha sido utilizado', data: null };
  }

  // Token expirado
  if (new Date() > tokenData.expiraEn) {
    return { valido: false, error: 'Este enlace ha expirado', data: null };
  }

  return {
    valido: true,
    error: null,
    data: {
      tokenId: tokenData.id,
      tipo: tokenData.tipo as TipoAccionCita,
      cita: tokenData.cita,
      paciente: tokenData.cita.paciente,
      expiraEn: tokenData.expiraEn,
    },
  };
}

/**
 * Marca un token como usado
 */
export async function marcarTokenUsado(token: string): Promise<boolean> {
  try {
    await prisma.tokenAccionCita.update({
      where: { token },
      data: {
        usado: true,
        usadoEn: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpia tokens expirados de la base de datos
 * Ejecutar periódicamente (ej: cron job diario)
 */
export async function limpiarTokensExpirados(): Promise<number> {
  const resultado = await prisma.tokenAccionCita.deleteMany({
    where: {
      OR: [
        { expiraEn: { lt: new Date() } },
        { usado: true, usadoEn: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Usados hace más de 7 días
      ],
    },
  });

  console.log(`🧹 Limpiados ${resultado.count} tokens expirados/antiguos`);
  return resultado.count;
}

/**
 * Construye las URLs de acción para los emails
 */
export function construirUrlsAccion(
  tokens: Record<TipoAccionCita, string>,
  baseUrl?: string
): Record<TipoAccionCita, string> {
  const base = baseUrl || process.env.APP_URL || 'http://localhost:5173';
  
  return {
    confirmar: `${base}/cita/confirmar/${tokens.confirmar}`,
    modificar: `${base}/cita/modificar/${tokens.modificar}`,
    cancelar: `${base}/cita/cancelar/${tokens.cancelar}`,
  };
}
