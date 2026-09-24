import type { VisitaNutricion } from "@/types";

/**
 * Cálculos antropométricos y de evolución del servicio de nutrición.
 * Funciones puras (sin React) para poder probarlas y reutilizarlas en
 * formulario, ficha de evolución, impresión y sugerencias.
 */

// ==========================================
// ÍNDICES
// ==========================================

export function calcularIMC(peso?: number | null, alturaCm?: number | null): number | null {
  if (!peso || !alturaCm) return null;
  return Number((peso / (alturaCm / 100) ** 2).toFixed(1));
}

export function calcularICC(cintura?: number | null, cadera?: number | null): number | null {
  if (!cintura || !cadera) return null;
  return Number((cintura / cadera).toFixed(2));
}

export type NivelRiesgo = "normal" | "advertencia" | "critico";

export interface Clasificacion {
  texto: string;
  nivel: NivelRiesgo;
}

/** Clasificación del IMC según la OMS */
export function clasificarIMC(imc: number): Clasificacion {
  if (imc < 18.5) return { texto: "Bajo peso", nivel: "advertencia" };
  if (imc < 25) return { texto: "Normopeso", nivel: "normal" };
  if (imc < 30) return { texto: "Sobrepeso", nivel: "advertencia" };
  if (imc < 35) return { texto: "Obesidad grado I", nivel: "critico" };
  if (imc < 40) return { texto: "Obesidad grado II", nivel: "critico" };
  return { texto: "Obesidad grado III", nivel: "critico" };
}

/**
 * En la app el sexo se guarda como "M" (masculino), "F" (femenino) u "O".
 * OJO: los cuestionarios en papel usaban "M" para Mujer; aquí manda la app.
 * Con sexo "O" o desconocido se usan los umbrales femeninos, que son los
 * más prudentes (avisan antes).
 */
function esHombre(sexo?: string | null): boolean {
  return sexo === "M";
}

/** Riesgo cardiometabólico por índice cintura-cadera (OMS) */
export function clasificarICC(icc: number, sexo?: string | null): Clasificacion {
  const umbral = esHombre(sexo) ? 0.9 : 0.85;
  return icc > umbral
    ? { texto: "Riesgo cardiometabólico elevado", nivel: "critico" }
    : { texto: "Sin riesgo elevado", nivel: "normal" };
}

/** Riesgo por perímetro de cintura (criterios IDF/OMS para población europea) */
export function clasificarCintura(cintura: number, sexo?: string | null): Clasificacion {
  const [aumentado, muyAumentado] = esHombre(sexo) ? [94, 102] : [80, 88];
  if (cintura >= muyAumentado) return { texto: "Riesgo muy aumentado", nivel: "critico" };
  if (cintura >= aumentado) return { texto: "Riesgo aumentado", nivel: "advertencia" };
  return { texto: "Sin riesgo aumentado", nivel: "normal" };
}

/** Clasificación de la tensión arterial (umbrales de consulta, ESH) */
export function clasificarTension(sistolica: number, diastolica: number): Clasificacion {
  if (sistolica >= 140 || diastolica >= 90) return { texto: "Tensión elevada", nivel: "critico" };
  if (sistolica >= 130 || diastolica >= 85) return { texto: "Normal-alta", nivel: "advertencia" };
  return { texto: "Normal", nivel: "normal" };
}

// ==========================================
// EVOLUCIÓN
// ==========================================

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

/**
 * Las fechas del módulo se guardan como "YYYY-MM-DD". new Date() las
 * interpreta como medianoche UTC, lo que en zonas horarias negativas muestra
 * el día anterior; se fija el mediodía local para evitarlo.
 */
export function parsearFecha(fecha: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00` : fecha);
}

export function semanasEntre(desde: string, hasta: string): number {
  return (new Date(hasta).getTime() - new Date(desde).getTime()) / MS_POR_SEMANA;
}

/**
 * Visitas ordenadas por fecha ascendente y, en el mismo día, por creación
 * (mismo criterio que el servidor para decidir cuál es la inicial).
 */
export function ordenarVisitas(visitas: readonly VisitaNutricion[]): VisitaNutricion[] {
  return [...visitas].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
  );
}

/** Visita de referencia para la evolución: la más antigua (la inicial) */
export function visitaReferencia(visitas: readonly VisitaNutricion[]): VisitaNutricion | undefined {
  return ordenarVisitas(visitas)[0];
}

/** Número de sesión de una visita dentro del programa (la inicial es la 1) */
export function numeroSesion(visitas: readonly VisitaNutricion[], visitaId: string): number {
  return ordenarVisitas(visitas).findIndex((v) => v.id === visitaId) + 1;
}

/** Hitos de pérdida de peso clínicamente relevantes (% sobre el peso inicial) */
export const HITOS_PERDIDA = [5, 10, 15, 20] as const;

export interface ResumenEvolucion {
  pesoInicial: number | null;
  pesoActual: number | null;
  /** Negativo = pérdida */
  diferenciaPeso: number | null;
  /** Porcentaje de peso perdido respecto al inicial (positivo = pérdida) */
  porcentajePerdida: number | null;
  semanasPrograma: number;
  /** Ritmo entre las dos últimas visitas con peso, en kg/semana (negativo = pérdida) */
  ritmoRecienteKgSemana: number | null;
  diferenciaCintura: number | null;
  diferenciaMasaGrasa: number | null;
  diferenciaMasaMagra: number | null;
  /**
   * Fracción del peso perdido que corresponde a masa magra (0-1).
   * Solo se calcula si hay pérdida de peso y bioimpedancia al inicio y ahora.
   */
  proporcionMagraPerdida: number | null;
  /** Mayor hito de pérdida alcanzado (5, 10, 15, 20) o null */
  hitoAlcanzado: number | null;
}

function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function diferencia(inicial?: number | null, actual?: number | null): number | null {
  if (inicial == null || actual == null) return null;
  return redondear(actual - inicial);
}

/** Último valor no nulo de un campo, recorriendo las visitas de más reciente a más antigua */
function ultimaConValor<K extends keyof VisitaNutricion>(visitas: VisitaNutricion[], campo: K): VisitaNutricion | undefined {
  for (let i = visitas.length - 1; i >= 0; i--) {
    if (visitas[i][campo] != null) return visitas[i];
  }
  return undefined;
}

export function resumirEvolucion(visitas: readonly VisitaNutricion[]): ResumenEvolucion {
  const ordenadas = ordenarVisitas(visitas);
  const referencia = visitaReferencia(ordenadas);
  const ultima = ordenadas[ordenadas.length - 1];
  const ultimaConPeso = ultimaConValor(ordenadas, "peso");

  const pesoInicial = referencia?.peso ?? null;
  const pesoActual = ultimaConPeso?.peso ?? null;
  const diferenciaPeso = diferencia(pesoInicial, pesoActual);
  const porcentajePerdida =
    pesoInicial && diferenciaPeso != null ? redondear((-diferenciaPeso / pesoInicial) * 100) : null;

  // Ritmo reciente: entre las dos últimas visitas que tienen peso
  const conPeso = ordenadas.filter((v) => v.peso != null);
  let ritmoRecienteKgSemana: number | null = null;
  if (conPeso.length >= 2) {
    const [anterior, reciente] = conPeso.slice(-2);
    const semanas = semanasEntre(anterior.fecha, reciente.fecha);
    if (semanas > 0) {
      ritmoRecienteKgSemana = redondear((reciente.peso! - anterior.peso!) / semanas, 2);
    }
  }

  // Composición corporal: se compara la referencia con la última visita con bioimpedancia
  const ultimaConMagra = ultimaConValor(ordenadas, "masaMagra");
  const diferenciaMasaMagra = diferencia(referencia?.masaMagra, ultimaConMagra?.masaMagra);
  let proporcionMagraPerdida: number | null = null;
  if (
    referencia?.peso != null &&
    ultimaConMagra?.peso != null &&
    diferenciaMasaMagra != null &&
    referencia.id !== ultimaConMagra.id
  ) {
    const pesoPerdido = referencia.peso - ultimaConMagra.peso;
    if (pesoPerdido > 0) {
      proporcionMagraPerdida = redondear(Math.max(0, -diferenciaMasaMagra) / pesoPerdido, 2);
    }
  }

  const hitoAlcanzado =
    porcentajePerdida != null ? [...HITOS_PERDIDA].reverse().find((h) => porcentajePerdida >= h) ?? null : null;

  return {
    pesoInicial,
    pesoActual,
    diferenciaPeso,
    porcentajePerdida,
    semanasPrograma: referencia && ultima ? redondear(semanasEntre(referencia.fecha, ultima.fecha)) : 0,
    ritmoRecienteKgSemana,
    diferenciaCintura: diferencia(referencia?.cintura, ultimaConValor(ordenadas, "cintura")?.cintura),
    diferenciaMasaGrasa: diferencia(referencia?.masaGrasa, ultimaConValor(ordenadas, "masaGrasa")?.masaGrasa),
    diferenciaMasaMagra,
    proporcionMagraPerdida,
    hitoAlcanzado,
  };
}

export interface PuntoEvolucion {
  fecha: string;
  etiqueta: string;
  peso: number | null;
  porcentajePerdida: number | null;
  imc: number | null;
  cintura: number | null;
  cadera: number | null;
  masaGrasa: number | null;
  masaMagra: number | null;
  porcentajeGrasa: number | null;
  systolic: number | null;
  diastolic: number | null;
  adherencia: number | null;
  motivacion: number | null;
}

/** Serie temporal para los gráficos de evolución */
export function serieEvolucion(visitas: readonly VisitaNutricion[]): PuntoEvolucion[] {
  const ordenadas = ordenarVisitas(visitas);
  const pesoInicial = visitaReferencia(ordenadas)?.peso ?? null;

  return ordenadas.map((v) => ({
    fecha: v.fecha,
    etiqueta: parsearFecha(v.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    peso: v.peso ?? null,
    porcentajePerdida: pesoInicial && v.peso != null ? redondear(((pesoInicial - v.peso) / pesoInicial) * 100) : null,
    imc: v.imc ?? null,
    cintura: v.cintura ?? null,
    cadera: v.cadera ?? null,
    masaGrasa: v.masaGrasa ?? null,
    masaMagra: v.masaMagra ?? null,
    porcentajeGrasa: v.porcentajeGrasa ?? null,
    systolic: v.systolic ?? null,
    diastolic: v.diastolic ?? null,
    adherencia: v.adherencia ?? null,
    motivacion: v.motivacion ?? null,
  }));
}

/** Minutos de ejercicio semanales declarados en una visita */
export function minutosEjercicioSemana(visita: Pick<VisitaNutricion, "ejercicio" | "ejercicioDiasSemana" | "ejercicioMinutosSesion">): number | null {
  if (visita.ejercicio === "no") return 0;
  if (visita.ejercicioDiasSemana == null || visita.ejercicioMinutosSesion == null) return null;
  return visita.ejercicioDiasSemana * visita.ejercicioMinutosSesion;
}
