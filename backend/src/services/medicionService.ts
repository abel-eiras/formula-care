import { z } from 'zod';
import type { Medicion, Prisma } from '@prisma/client';

/**
 * Tabla única de mediciones (peso, perímetros, bioimpedancia, tensión...).
 *
 * Los servicios (Bio, Nutrición) siguen recibiendo y devolviendo las medidas
 * como campos planos de su propio registro; este módulo se encarga de
 * separarlas, guardarlas en Medicion y volver a unirlas en la respuesta.
 */

export const CAMPOS_MEDICION = [
  'peso',
  'altura',
  'cintura',
  'cadera',
  'porcentajeGrasa',
  'masaGrasa',
  'masaMagra',
  'systolic',
  'diastolic',
  'pulsaciones',
] as const;

/** Campos que se calculan en el servidor y se devuelven, pero no se aceptan */
const CAMPOS_CALCULADOS = ['imc', 'icc'] as const;

type CampoMedicion = (typeof CAMPOS_MEDICION)[number];
export type DatosMedicion = Partial<Record<CampoMedicion, number | null>>;

/** Validación de los campos de medición (se fusiona con el esquema de cada servicio) */
export const medicionSchema = z.object({
  peso: z.number().positive().max(400).nullish(),
  altura: z.number().positive().max(250).nullish(),
  cintura: z.number().positive().max(300).nullish(),
  cadera: z.number().positive().max(300).nullish(),
  porcentajeGrasa: z.number().min(0).max(100).nullish(),
  masaGrasa: z.number().min(0).max(400).nullish(),
  masaMagra: z.number().min(0).max(400).nullish(),
  systolic: z.number().int().positive().max(300).nullish(),
  diastolic: z.number().int().positive().max(200).nullish(),
  pulsaciones: z.number().int().positive().max(250).nullish(),
});

/** Separa los campos de medición del resto de datos de un registro */
export function separarMedicion<T extends DatosMedicion>(datos: T) {
  const medicion: DatosMedicion = {};
  const resto: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if ((CAMPOS_MEDICION as readonly string[]).includes(clave)) {
      medicion[clave as CampoMedicion] = valor as number | null | undefined;
    } else {
      resto[clave] = valor;
    }
  }
  return { medicion, resto: resto as Omit<T, CampoMedicion> };
}

function calcularDerivados(m: DatosMedicion) {
  const imc = m.peso && m.altura ? Number((m.peso / (m.altura / 100) ** 2).toFixed(1)) : null;
  const icc = m.cintura && m.cadera ? Number((m.cintura / m.cadera).toFixed(2)) : null;
  return { imc, icc };
}

function hayValores(m: DatosMedicion): boolean {
  return CAMPOS_MEDICION.some((c) => m[c] != null);
}

type Origen =
  | { origen: 'bio'; analisisBioId: string }
  | { origen: 'nutricion'; visitaNutricionId: string };

/**
 * Crea o actualiza la medición ligada a un registro de origen.
 * - Los campos no enviados conservan su valor; null lo borra.
 * - IMC e ICC se recalculan siempre con los valores resultantes.
 * - Si la medición queda vacía, se elimina (no se guardan filas sin datos).
 */
export async function guardarMedicion(
  tx: Prisma.TransactionClient,
  destino: Origen & { pacienteId: string; fecha: string },
  cambios: DatosMedicion
): Promise<Medicion | null> {
  const where =
    destino.origen === 'bio'
      ? { analisisBioId: destino.analisisBioId }
      : { visitaNutricionId: destino.visitaNutricionId };
  const existente = await tx.medicion.findUnique({ where });

  const valores: DatosMedicion = {};
  for (const campo of CAMPOS_MEDICION) {
    valores[campo] = cambios[campo] !== undefined ? cambios[campo] : existente?.[campo] ?? null;
  }

  if (!hayValores(valores)) {
    if (existente) await tx.medicion.delete({ where: { id: existente.id } });
    return null;
  }

  // Las fechas de medición son siempre "YYYY-MM-DD" (Bio envía fecha y hora)
  const datos = { ...valores, ...calcularDerivados(valores), fecha: destino.fecha.slice(0, 10) };

  if (existente) {
    return tx.medicion.update({ where: { id: existente.id }, data: datos });
  }
  return tx.medicion.create({
    data: {
      ...datos,
      ...where,
      pacienteId: destino.pacienteId,
      origen: destino.origen,
    },
  });
}

/** Campos de medición planos para la respuesta de un servicio (null si no hay medición) */
export function aplanarMedicion(medicion: Medicion | null | undefined) {
  const plano: Record<CampoMedicion | (typeof CAMPOS_CALCULADOS)[number], number | null> = {
    peso: null,
    altura: null,
    cintura: null,
    cadera: null,
    porcentajeGrasa: null,
    masaGrasa: null,
    masaMagra: null,
    systolic: null,
    diastolic: null,
    pulsaciones: null,
    imc: null,
    icc: null,
  };
  if (!medicion) return plano;
  for (const campo of [...CAMPOS_MEDICION, ...CAMPOS_CALCULADOS]) {
    plano[campo] = medicion[campo];
  }
  return plano;
}
