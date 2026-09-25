/**
 * SCORE2 y SCORE2-OP (ESC 2021): riesgo a 10 años de enfermedad
 * cardiovascular mortal y no mortal en personas aparentemente sanas.
 *
 * Coeficientes, supervivencias basales y escalas de recalibración del
 * artículo original (Eur Heart J 2021;42:2439-54 y 2455-67, material
 * suplementario), comprobados con el paquete de R RiskScorescvd (CRAN).
 * España pertenece a la región de RIESGO BAJO, que es la calibración que se
 * aplica aquí (la misma de las tablas SCORE2 para España).
 *
 * El modelo se calcula sin diabetes: en personas con diabetes, enfermedad
 * cardiovascular establecida, enfermedad renal crónica o hipercolesterolemia
 * familiar SCORE2 no es la herramienta adecuada.
 */

// mg/dL → mmol/L para el colesterol
const MGDL_POR_MMOL = 38.67;

export interface DatosScore2 {
  edad: number;
  sexo: "M" | "F";
  fumador: boolean;
  /** Presión arterial sistólica (mmHg) */
  sistolica: number;
  /** Colesterol total (mg/dL) */
  colesterolTotal: number;
  /** Colesterol HDL (mg/dL) */
  colesterolHDL: number;
}

export type CategoriaScore2 = "bajo-moderado" | "alto" | "muy-alto";

export interface ResultadoScore2 {
  /** Riesgo a 10 años, en % con un decimal */
  riesgo: number;
  modelo: "SCORE2" | "SCORE2-OP";
  categoria: CategoriaScore2;
  /** Umbrales de la franja de edad, para explicar la categoría */
  umbrales: [number, number];
}

// Recalibración para la región de riesgo bajo (España)
const ESCALAS_RIESGO_BAJO = {
  SCORE2: { M: [-0.5699, 0.7476], F: [-0.738, 0.7019] },
  "SCORE2-OP": { M: [-0.34, 1.19], F: [-0.52, 1.01] },
} as const;

/** Predictor lineal de SCORE2 (40-69 años) y riesgo sin recalibrar */
function riesgoSinCalibrar40a69(d: DatosScore2, colT: number, hdl: number): number {
  const edad = (d.edad - 60) / 5;
  const pas = (d.sistolica - 120) / 20;
  const ct = colT - 6;
  const hd = (hdl - 1.3) / 0.5;
  const fuma = d.fumador ? 1 : 0;
  if (d.sexo === "M") {
    const x =
      0.3742 * edad + 0.6012 * fuma + 0.2777 * pas + 0.1458 * ct - 0.2698 * hd -
      0.0755 * edad * fuma - 0.0255 * edad * pas - 0.0281 * edad * ct + 0.0426 * edad * hd;
    return 1 - Math.pow(0.9605, Math.exp(x));
  }
  const x =
    0.4648 * edad + 0.7744 * fuma + 0.3131 * pas + 0.1002 * ct - 0.2606 * hd -
    0.1088 * edad * fuma - 0.0277 * edad * pas - 0.0226 * edad * ct + 0.0613 * edad * hd;
  return 1 - Math.pow(0.9776, Math.exp(x));
}

/** Predictor lineal de SCORE2-OP (70 años o más) y riesgo sin recalibrar */
function riesgoSinCalibrar70oMas(d: DatosScore2, colT: number, hdl: number): number {
  const edad = d.edad - 73;
  const pas = d.sistolica - 150;
  const ct = colT - 6;
  const hd = hdl - 1.4;
  const fuma = d.fumador ? 1 : 0;
  if (d.sexo === "M") {
    const x =
      0.0634 * edad + 0.3524 * fuma + 0.0094 * pas + 0.085 * ct - 0.3564 * hd -
      0.0247 * edad * fuma - 0.0005 * edad * pas + 0.0073 * edad * ct + 0.0091 * edad * hd;
    return 1 - Math.pow(0.7576, Math.exp(x - 0.0929));
  }
  const x =
    0.0789 * edad + 0.4921 * fuma + 0.0102 * pas + 0.0605 * ct - 0.304 * hd -
    0.0255 * edad * fuma - 0.0004 * edad * pas - 0.0009 * edad * ct + 0.0154 * edad * hd;
  return 1 - Math.pow(0.8082, Math.exp(x - 0.229));
}

/** Umbrales de la ESC 2021 según la edad (riesgo bajo-moderado / alto / muy alto) */
function umbralesPorEdad(edad: number): [number, number] {
  if (edad < 50) return [2.5, 7.5];
  if (edad < 70) return [5, 10];
  return [7.5, 15];
}

/** Edades para las que el modelo está validado */
export const EDAD_MINIMA_SCORE2 = 40;
export const EDAD_MAXIMA_SCORE2 = 89;

export function calcularScore2(d: DatosScore2): ResultadoScore2 | null {
  if (d.edad < EDAD_MINIMA_SCORE2 || d.edad > EDAD_MAXIMA_SCORE2) return null;
  const colT = d.colesterolTotal / MGDL_POR_MMOL;
  const hdl = d.colesterolHDL / MGDL_POR_MMOL;
  const modelo = d.edad < 70 ? "SCORE2" : "SCORE2-OP";
  const sinCalibrar = modelo === "SCORE2" ? riesgoSinCalibrar40a69(d, colT, hdl) : riesgoSinCalibrar70oMas(d, colT, hdl);
  const [escala1, escala2] = ESCALAS_RIESGO_BAJO[modelo][d.sexo];
  const calibrado = 1 - Math.exp(-Math.exp(escala1 + escala2 * Math.log(-Math.log(1 - sinCalibrar))));
  const riesgo = Math.round(calibrado * 1000) / 10;
  const umbrales = umbralesPorEdad(d.edad);
  const categoria: CategoriaScore2 = riesgo < umbrales[0] ? "bajo-moderado" : riesgo < umbrales[1] ? "alto" : "muy-alto";
  return { riesgo, modelo, categoria, umbrales };
}

export const TEXTO_CATEGORIA_SCORE2: Record<CategoriaScore2, string> = {
  "bajo-moderado": "Riesgo bajo-moderado",
  alto: "Riesgo alto",
  "muy-alto": "Riesgo muy alto",
};

/** Qué falta para poder calcular SCORE2 (vacío si se puede) */
export function faltaParaScore2(d: Partial<Omit<DatosScore2, "sexo">> & { sexo?: string | null }): string[] {
  const faltan: string[] = [];
  if (d.edad == null) faltan.push("fecha de nacimiento");
  else if (d.edad < EDAD_MINIMA_SCORE2 || d.edad > EDAD_MAXIMA_SCORE2) faltan.push(`edad entre ${EDAD_MINIMA_SCORE2} y ${EDAD_MAXIMA_SCORE2} años`);
  if (d.sexo !== "M" && d.sexo !== "F") faltan.push("sexo (hombre o mujer)");
  if (d.fumador == null) faltan.push("si fuma");
  if (!d.sistolica) faltan.push("tensión sistólica");
  if (!d.colesterolTotal) faltan.push("colesterol total");
  if (!d.colesterolHDL) faltan.push("colesterol HDL");
  return faltan;
}
