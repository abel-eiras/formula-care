/**
 * Test FINDRISC: riesgo de desarrollar diabetes tipo 2 en 10 años.
 * Ocho preguntas; edad, IMC y cintura se rellenan solos con los datos del
 * análisis cuando los hay. Se guarda la respuesta y los puntos de cada
 * pregunta para poder comparar entre visitas.
 */

export type IdPreguntaFindrisc =
  | "edad"
  | "imc"
  | "cintura"
  | "actividad"
  | "frutaVerdura"
  | "antihipertensivos"
  | "glucosaAlta"
  | "familiares";

export interface OpcionFindrisc {
  valor: string;
  texto: string;
  puntos: number;
}

export interface PreguntaFindrisc {
  id: IdPreguntaFindrisc;
  texto: string;
  /** Se calcula con los datos del análisis (edad, IMC, cintura) */
  automatica?: boolean;
  opciones: OpcionFindrisc[];
}

export const PREGUNTAS_FINDRISC: PreguntaFindrisc[] = [
  {
    id: "edad",
    texto: "Edad",
    automatica: true,
    opciones: [
      { valor: "<45", texto: "Menos de 45 años", puntos: 0 },
      { valor: "45-54", texto: "45-54 años", puntos: 2 },
      { valor: "55-64", texto: "55-64 años", puntos: 3 },
      { valor: ">64", texto: "Más de 64 años", puntos: 4 },
    ],
  },
  {
    id: "imc",
    texto: "Índice de masa corporal (IMC)",
    automatica: true,
    opciones: [
      { valor: "<25", texto: "Menos de 25", puntos: 0 },
      { valor: "25-30", texto: "Entre 25 y 30", puntos: 1 },
      { valor: ">30", texto: "Más de 30", puntos: 3 },
    ],
  },
  {
    id: "cintura",
    texto: "Perímetro de cintura (a la altura del ombligo)",
    automatica: true,
    opciones: [
      { valor: "bajo", texto: "Hombres < 94 cm · Mujeres < 80 cm", puntos: 0 },
      { valor: "medio", texto: "Hombres 94-102 cm · Mujeres 80-88 cm", puntos: 3 },
      { valor: "alto", texto: "Hombres > 102 cm · Mujeres > 88 cm", puntos: 4 },
    ],
  },
  {
    id: "actividad",
    texto: "¿Hace al menos 30 minutos de actividad física al día (en el trabajo o en su tiempo libre)?",
    opciones: [
      { valor: "si", texto: "Sí", puntos: 0 },
      { valor: "no", texto: "No", puntos: 2 },
    ],
  },
  {
    id: "frutaVerdura",
    texto: "¿Con qué frecuencia come verduras o fruta?",
    opciones: [
      { valor: "diario", texto: "Todos los días", puntos: 0 },
      { valor: "no-diario", texto: "No todos los días", puntos: 1 },
    ],
  },
  {
    id: "antihipertensivos",
    texto: "¿Toma medicación para la tensión alta con regularidad?",
    opciones: [
      { valor: "no", texto: "No", puntos: 0 },
      { valor: "si", texto: "Sí", puntos: 2 },
    ],
  },
  {
    id: "glucosaAlta",
    texto: "¿Le han encontrado alguna vez la glucosa alta (en un control, una enfermedad o el embarazo)?",
    opciones: [
      { valor: "no", texto: "No", puntos: 0 },
      { valor: "si", texto: "Sí", puntos: 5 },
    ],
  },
  {
    id: "familiares",
    texto: "¿Algún familiar tiene o ha tenido diabetes (tipo 1 o tipo 2)?",
    opciones: [
      { valor: "no", texto: "No", puntos: 0 },
      { valor: "segundo-grado", texto: "Sí: abuelos, tíos o primos hermanos", puntos: 3 },
      { valor: "primer-grado", texto: "Sí: padres, hermanos o hijos", puntos: 5 },
    ],
  },
];

/** Respuestas guardadas: valor elegido y puntos de cada pregunta */
export type RespuestasFindrisc = Partial<Record<IdPreguntaFindrisc, { valor: string; puntos: number }>>;

export function respuesta(pregunta: IdPreguntaFindrisc, valor: string): { valor: string; puntos: number } | undefined {
  const opcion = PREGUNTAS_FINDRISC.find((p) => p.id === pregunta)?.opciones.find((o) => o.valor === valor);
  return opcion ? { valor: opcion.valor, puntos: opcion.puntos } : undefined;
}

export function valorEdad(edad: number): string {
  return edad < 45 ? "<45" : edad <= 54 ? "45-54" : edad <= 64 ? "55-64" : ">64";
}

export function valorImc(imc: number): string {
  return imc < 25 ? "<25" : imc <= 30 ? "25-30" : ">30";
}

/** Cintura según sexo; sin sexo (M/F) no se puede decidir sola */
export function valorCintura(cintura: number, sexo: string | null | undefined): string | null {
  if (sexo === "M") return cintura < 94 ? "bajo" : cintura <= 102 ? "medio" : "alto";
  if (sexo === "F") return cintura < 80 ? "bajo" : cintura <= 88 ? "medio" : "alto";
  return null;
}

export type CategoriaFindrisc = "bajo" | "ligeramente-elevado" | "moderado" | "alto" | "muy-alto";

export interface ResultadoFindrisc {
  total: number;
  categoria: CategoriaFindrisc;
  texto: string;
  /** Riesgo estimado de diabetes tipo 2 en 10 años */
  riesgo: string;
}

export function completo(respuestas: RespuestasFindrisc): boolean {
  return PREGUNTAS_FINDRISC.every((p) => respuestas[p.id] !== undefined);
}

export function resultadoFindrisc(respuestas: RespuestasFindrisc): ResultadoFindrisc | null {
  if (!completo(respuestas)) return null;
  const total = PREGUNTAS_FINDRISC.reduce((suma, p) => suma + (respuestas[p.id]?.puntos ?? 0), 0);
  if (total < 7) return { total, categoria: "bajo", texto: "Riesgo bajo", riesgo: "1 de cada 100" };
  if (total <= 11) return { total, categoria: "ligeramente-elevado", texto: "Riesgo ligeramente elevado", riesgo: "1 de cada 25" };
  if (total <= 14) return { total, categoria: "moderado", texto: "Riesgo moderado", riesgo: "1 de cada 6" };
  if (total <= 20) return { total, categoria: "alto", texto: "Riesgo alto", riesgo: "1 de cada 3" };
  return { total, categoria: "muy-alto", texto: "Riesgo muy alto", riesgo: "1 de cada 2" };
}

/** Lee el JSON guardado en el análisis (tolerante a datos antiguos o vacíos) */
export function leerRespuestasFindrisc(json: string | null | undefined): RespuestasFindrisc | null {
  if (!json) return null;
  try {
    const datos = JSON.parse(json) as unknown;
    return datos && typeof datos === "object" ? (datos as RespuestasFindrisc) : null;
  } catch {
    return null;
  }
}
