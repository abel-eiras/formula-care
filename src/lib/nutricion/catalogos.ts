/**
 * Catálogos del servicio de nutrición.
 *
 * Sustituyen al texto libre de los cuestionarios en papel: con ids fijos los
 * datos se pueden contar, comparar entre visitas y alimentar las sugerencias.
 * Los ids se guardan en la base de datos, así que NO deben renombrarse;
 * las etiquetas sí se pueden cambiar sin problema.
 */

export interface Opcion<T extends string = string> {
  id: T;
  label: string;
}

// ==========================================
// PROGRAMA: ANTECEDENTES Y HÁBITOS TÓXICOS
// ==========================================

export const ANTECEDENTES: Opcion[] = [
  { id: "diabetes_2", label: "Diabetes tipo 2" },
  { id: "prediabetes", label: "Prediabetes / resistencia a la insulina" },
  { id: "hipertension", label: "Hipertensión arterial" },
  { id: "colesterol", label: "Colesterol elevado" },
  { id: "trigliceridos", label: "Triglicéridos elevados" },
  { id: "hipotiroidismo", label: "Hipotiroidismo" },
  { id: "hipertiroidismo", label: "Hipertiroidismo" },
  { id: "apnea_sueno", label: "Apnea del sueño" },
  { id: "higado_graso", label: "Hígado graso" },
  { id: "menopausia", label: "Menopausia / perimenopausia" },
  { id: "sop", label: "Síndrome de ovario poliquístico" },
  { id: "depresion_ansiedad", label: "Depresión / ansiedad" },
  { id: "tca", label: "Trastorno de la conducta alimentaria (actual o pasado)" },
  { id: "pancreatitis", label: "Pancreatitis (actual o pasada)" },
  { id: "vesicula", label: "Enfermedad de la vesícula biliar" },
  { id: "digestivo", label: "Trastorno digestivo (reflujo, colon irritable...)" },
];

export const OPCIONES_TABACO: Opcion<"no" | "exfumador" | "si">[] = [
  { id: "no", label: "No fuma" },
  { id: "exfumador", label: "Exfumador" },
  { id: "si", label: "Fuma" },
];

export const OPCIONES_ALCOHOL: Opcion<"nunca" | "ocasional" | "semanal" | "diario">[] = [
  { id: "nunca", label: "Nunca" },
  { id: "ocasional", label: "Ocasional" },
  { id: "semanal", label: "Semanal" },
  { id: "diario", label: "Diario" },
];

export const ESTADOS_PROGRAMA: Opcion<"activo" | "pausado" | "finalizado">[] = [
  { id: "activo", label: "Activo" },
  { id: "pausado", label: "Pausado" },
  { id: "finalizado", label: "Finalizado" },
];

// ==========================================
// TRATAMIENTO GLP-1
// ==========================================

export interface FarmacoGlp1 extends Opcion {
  /** Pauta de administración, para orientar al rellenar la dosis */
  pauta: string;
  /** Dosis habituales de la escalada (orientativas, verificar con ficha técnica) */
  dosis: string[];
}

export const FARMACOS_GLP1: FarmacoGlp1[] = [
  {
    id: "semaglutida_obesidad",
    label: "Semaglutida s.c. – obesidad (Wegovy)",
    pauta: "semanal",
    dosis: ["0,25 mg", "0,5 mg", "1 mg", "1,7 mg", "2,4 mg", "7,2 mg"],
  },
  {
    id: "semaglutida_diabetes",
    label: "Semaglutida s.c. – diabetes (Ozempic)",
    pauta: "semanal",
    dosis: ["0,25 mg", "0,5 mg", "1 mg", "2 mg"],
  },
  {
    id: "semaglutida_oral",
    label: "Semaglutida oral (Rybelsus)",
    pauta: "diaria",
    dosis: ["1,5 mg", "3 mg", "4 mg", "7 mg", "9 mg", "14 mg"],
  },
  {
    id: "tirzepatida",
    label: "Tirzepatida (Mounjaro)",
    pauta: "semanal",
    dosis: ["2,5 mg", "5 mg", "7,5 mg", "10 mg", "12,5 mg", "15 mg"],
  },
  {
    id: "liraglutida_obesidad",
    label: "Liraglutida – obesidad (Saxenda)",
    pauta: "diaria",
    dosis: ["0,6 mg", "1,2 mg", "1,8 mg", "2,4 mg", "3 mg"],
  },
  {
    id: "liraglutida_diabetes",
    label: "Liraglutida – diabetes (Victoza)",
    pauta: "diaria",
    dosis: ["0,6 mg", "1,2 mg", "1,8 mg"],
  },
  {
    id: "dulaglutida",
    label: "Dulaglutida (Trulicity)",
    pauta: "semanal",
    dosis: ["0,75 mg", "1,5 mg", "3 mg", "4,5 mg"],
  },
  { id: "otro", label: "Otro", pauta: "", dosis: [] },
];

export const EFECTOS_SECUNDARIOS: Opcion[] = [
  { id: "nauseas", label: "Náuseas" },
  { id: "vomitos", label: "Vómitos" },
  { id: "estrenimiento", label: "Estreñimiento" },
  { id: "diarrea", label: "Diarrea" },
  { id: "reflujo", label: "Reflujo / ardor" },
  { id: "dolor_abdominal", label: "Dolor abdominal" },
  { id: "hinchazon", label: "Hinchazón / gases" },
  { id: "falta_apetito", label: "Falta de apetito excesiva" },
  { id: "cansancio", label: "Cansancio" },
  { id: "mareo", label: "Mareo" },
  { id: "cefalea", label: "Dolor de cabeza" },
  { id: "caida_pelo", label: "Caída del pelo" },
  { id: "zona_inyeccion", label: "Reacción en la zona de inyección" },
];

/** Efectos que, con intensidad moderada o grave, conviene comunicar al prescriptor */
export const EFECTOS_DIGESTIVOS = ["nauseas", "vomitos", "diarrea", "dolor_abdominal", "estrenimiento", "reflujo"];

export const INTENSIDADES: Opcion<"leve" | "moderada" | "grave">[] = [
  { id: "leve", label: "Leve" },
  { id: "moderada", label: "Moderada" },
  { id: "grave", label: "Grave" },
];

// ==========================================
// VISITA: EVOLUCIÓN Y HÁBITOS
// ==========================================

export const EVOLUCION_SUBJETIVA: Opcion<"muy_buena" | "buena" | "regular" | "dificultosa">[] = [
  { id: "muy_buena", label: "Muy buena" },
  { id: "buena", label: "Buena" },
  { id: "regular", label: "Regular" },
  { id: "dificultosa", label: "Dificultosa" },
];

export const FRECUENCIA_PICOTEO: Opcion<"ocasional" | "diario" | "varias_diarias">[] = [
  { id: "ocasional", label: "Ocasional (menos de 1 vez al día)" },
  { id: "diario", label: "1 vez al día" },
  { id: "varias_diarias", label: "Varias veces al día" },
];

/** Causas de picoteo: compartidas por la visita y el registro de alimentación */
export const CAUSAS_PICOTEO: Opcion[] = [
  { id: "hambre", label: "Hambre real" },
  { id: "ansiedad", label: "Ansiedad / estrés" },
  { id: "aburrimiento", label: "Aburrimiento" },
  { id: "emocional", label: "Tristeza / otras emociones" },
  { id: "social", label: "Situación social" },
  { id: "costumbre", label: "Costumbre / horario" },
  { id: "antojo", label: "Antojo" },
  { id: "cansancio", label: "Cansancio / falta de sueño" },
  { id: "otro", label: "Otro" },
];

/** Causas de origen emocional: son las que activan la sugerencia de gestión emocional */
export const CAUSAS_EMOCIONALES = ["ansiedad", "aburrimiento", "emocional"];

export const CALIDAD_SUENO: Opcion<"buena" | "regular" | "mala">[] = [
  { id: "buena", label: "Buena" },
  { id: "regular", label: "Regular" },
  { id: "mala", label: "Mala" },
];

export const NIVEL_ESTRES: Opcion<"bajo" | "moderado" | "alto">[] = [
  { id: "bajo", label: "Bajo" },
  { id: "moderado", label: "Moderado" },
  { id: "alto", label: "Alto" },
];

export const ESTADO_EJERCICIO: Opcion<"no" | "parcial" | "si">[] = [
  { id: "no", label: "No" },
  { id: "parcial", label: "Parcialmente" },
  { id: "si", label: "Sí" },
];

export const TIPOS_EJERCICIO: Opcion[] = [
  { id: "caminar", label: "Caminar" },
  { id: "fuerza", label: "Fuerza / pesas" },
  { id: "cardio", label: "Cardio (correr, elíptica...)" },
  { id: "bicicleta", label: "Bicicleta" },
  { id: "natacion", label: "Natación / aquagym" },
  { id: "yoga_pilates", label: "Yoga / pilates" },
  { id: "clases", label: "Clases dirigidas" },
  { id: "otro", label: "Otro" },
];

// ==========================================
// REGISTRO DE ALIMENTACIÓN
// ==========================================

export const MOMENTOS_COMIDA: Opcion<
  "desayuno" | "media_manana" | "comida" | "merienda" | "cena" | "recena" | "picoteo"
>[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "media_manana", label: "Media mañana" },
  { id: "comida", label: "Comida" },
  { id: "merienda", label: "Merienda" },
  { id: "cena", label: "Cena" },
  { id: "recena", label: "Recena" },
  { id: "picoteo", label: "Picoteo" },
];

export const CANTIDADES: Opcion<"pequena" | "normal" | "grande">[] = [
  { id: "pequena", label: "Pequeña" },
  { id: "normal", label: "Normal" },
  { id: "grande", label: "Grande" },
];

export const SENSACIONES: Opcion[] = [
  { id: "satisfecho", label: "Satisfecho" },
  { id: "con_hambre", label: "Con hambre todavía" },
  { id: "lleno_exceso", label: "Lleno en exceso" },
  { id: "pesadez", label: "Pesadez" },
  { id: "nauseas", label: "Náuseas" },
  { id: "reflujo", label: "Reflujo / ardor" },
  { id: "culpa", label: "Culpa" },
  { id: "tranquilo", label: "Tranquilo / bien" },
];

/** Sensaciones físicas negativas tras comer (relevantes con GLP-1) */
export const SENSACIONES_MALESTAR = ["lleno_exceso", "pesadez", "nauseas", "reflujo"];

export const COMPANIAS: Opcion<"solo" | "familia" | "amigos" | "trabajo">[] = [
  { id: "solo", label: "Solo" },
  { id: "familia", label: "Familia / pareja" },
  { id: "amigos", label: "Amigos" },
  { id: "trabajo", label: "Compañeros de trabajo" },
];

export const LUGARES: Opcion<"casa" | "trabajo" | "fuera" | "otro">[] = [
  { id: "casa", label: "Casa" },
  { id: "trabajo", label: "Trabajo" },
  { id: "fuera", label: "Restaurante / fuera" },
  { id: "otro", label: "Otro" },
];

// ==========================================
// UTILIDADES
// ==========================================

/** Devuelve la etiqueta de un id de catálogo (o el propio id si no existe) */
export function etiqueta(catalogo: readonly Opcion[], id: string | null | undefined): string {
  if (!id) return "";
  return catalogo.find((o) => o.id === id)?.label ?? id;
}

/** Etiquetas de varios ids, separadas por comas */
export function etiquetas(catalogo: readonly Opcion[], ids: readonly string[]): string {
  return ids.map((id) => etiqueta(catalogo, id)).join(", ");
}
