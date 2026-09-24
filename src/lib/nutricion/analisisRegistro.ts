import type { RegistroAlimentacion } from "@/types";
import { CAUSAS_EMOCIONALES, SENSACIONES_MALESTAR } from "./catalogos";

/**
 * Análisis del registro de alimentación transcrito por el farmacéutico.
 * Resume patrones (picoteo, hambre, saciedad, malestar, compañía) para la
 * ficha del programa y para el motor de sugerencias.
 */

export interface FranjaHoraria {
  id: "manana" | "mediodia" | "tarde" | "noche";
  label: string;
  desde: number; // hora incluida
  hasta: number; // hora excluida
}

export const FRANJAS_HORARIAS: FranjaHoraria[] = [
  { id: "manana", label: "Mañana (6-12 h)", desde: 6, hasta: 12 },
  { id: "mediodia", label: "Mediodía (12-16 h)", desde: 12, hasta: 16 },
  { id: "tarde", label: "Tarde (16-20 h)", desde: 16, hasta: 20 },
  { id: "noche", label: "Noche (20-6 h)", desde: 20, hasta: 30 },
];

export function franjaDeHora(hora?: string | null): FranjaHoraria["id"] | null {
  if (!hora) return null;
  const h = Number(hora.split(":")[0]);
  if (Number.isNaN(h)) return null;
  // La franja de noche cruza la medianoche: 0-5 h cuenta como 24-29 h
  const horaNormalizada = h < 6 ? h + 24 : h;
  return FRANJAS_HORARIAS.find((f) => horaNormalizada >= f.desde && horaNormalizada < f.hasta)?.id ?? null;
}

export interface AnalisisRegistro {
  totalIngestas: number;
  diasRegistrados: number;
  totalPicoteos: number;
  picoteosPorDia: number;
  /** Recuento de picoteos por causa (id de catálogo) */
  causasPicoteo: Record<string, number>;
  picoteosEmocionales: number;
  /** Franja con más picoteos, si hay alguno con hora */
  franjaPicoteo: FranjaHoraria["id"] | null;
  hambreMedia: number | null;
  saciedadMedia: number | null;
  /** Ingestas sin hambre (hambre antes ≤ 2) */
  ingestasSinHambre: number;
  /** Ingestas con alguna sensación física de malestar */
  ingestasConMalestar: number;
  /** Recuento de sensaciones (id de catálogo) */
  sensaciones: Record<string, number>;
  /** Porcentaje de ingestas en las que se come solo (sobre las que tienen el dato) */
  porcentajeSolo: number | null;
  /** Días con desayuno registrado */
  diasConDesayuno: number;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

function contar(ids: string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
}

function claveConMasValor(recuento: Record<string, number>): string | null {
  const entradas = Object.entries(recuento);
  if (entradas.length === 0) return null;
  return entradas.reduce((max, actual) => (actual[1] > max[1] ? actual : max))[0];
}

export function analizarRegistro(registros: readonly RegistroAlimentacion[]): AnalisisRegistro {
  const dias = new Set(registros.map((r) => r.fecha.slice(0, 10)));
  const picoteos = registros.filter((r) => r.momento === "picoteo");
  const causas = picoteos.map((r) => r.causaPicoteo).filter((c): c is string => !!c);
  const franjas = picoteos.map((r) => franjaDeHora(r.hora)).filter((f): f is FranjaHoraria["id"] => !!f);
  const conCompania = registros.filter((r) => r.compania);

  return {
    totalIngestas: registros.length,
    diasRegistrados: dias.size,
    totalPicoteos: picoteos.length,
    picoteosPorDia: dias.size > 0 ? Math.round((picoteos.length / dias.size) * 10) / 10 : 0,
    causasPicoteo: contar(causas),
    picoteosEmocionales: causas.filter((c) => CAUSAS_EMOCIONALES.includes(c)).length,
    franjaPicoteo: claveConMasValor(contar(franjas)) as FranjaHoraria["id"] | null,
    hambreMedia: media(registros.map((r) => r.hambreAntes).filter((v): v is number => v != null)),
    saciedadMedia: media(registros.map((r) => r.saciedadDespues).filter((v): v is number => v != null)),
    ingestasSinHambre: registros.filter((r) => r.hambreAntes != null && r.hambreAntes <= 2).length,
    ingestasConMalestar: registros.filter((r) => r.sensaciones.some((s) => SENSACIONES_MALESTAR.includes(s))).length,
    sensaciones: contar(registros.flatMap((r) => r.sensaciones)),
    porcentajeSolo:
      conCompania.length > 0
        ? Math.round((conCompania.filter((r) => r.compania === "solo").length / conCompania.length) * 100)
        : null,
    diasConDesayuno: new Set(registros.filter((r) => r.momento === "desayuno").map((r) => r.fecha.slice(0, 10))).size,
  };
}
