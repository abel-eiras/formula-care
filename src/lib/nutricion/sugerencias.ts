import type { ProgramaNutricion, RegistroAlimentacion, VisitaNutricion } from "@/types";
import { CAUSAS_EMOCIONALES, EFECTOS_DIGESTIVOS, EFECTOS_SECUNDARIOS, etiqueta } from "./catalogos";
import { analizarRegistro, FRANJAS_HORARIAS, type AnalisisRegistro } from "./analisisRegistro";
import { minutosEjercicioSemana, ordenarVisitas, resumirEvolucion, type ResumenEvolucion } from "./metricas";

/**
 * Motor de sugerencias del servicio de nutrición.
 *
 * Son reglas fijas y explicables, NO un sistema de IA: cada sugerencia
 * indica el dato que la ha disparado ("motivo") para que el farmacéutico
 * decida si la aplica. Las sugerencias van dirigidas al profesional; solo
 * llegan al paciente si el farmacéutico las copia a las recomendaciones.
 * No sustituyen el criterio clínico ni la pauta del médico prescriptor.
 */

export type PrioridadSugerencia = "alta" | "media" | "info";
export type CategoriaSugerencia =
  | "seguridad"
  | "tratamiento"
  | "composicion"
  | "alimentacion"
  | "picoteo"
  | "actividad"
  | "habitos"
  | "adherencia"
  | "progreso";

export interface Sugerencia {
  id: string;
  categoria: CategoriaSugerencia;
  prioridad: PrioridadSugerencia;
  titulo: string;
  /** Texto listo para copiar a las recomendaciones del paciente */
  texto: string;
  /** Dato concreto que ha disparado la regla */
  motivo: string;
  /** Si conviene derivar o informar al médico */
  derivar?: boolean;
}

export const ETIQUETAS_CATEGORIA: Record<CategoriaSugerencia, string> = {
  seguridad: "Seguridad",
  tratamiento: "Tratamiento",
  composicion: "Composición corporal",
  alimentacion: "Alimentación",
  picoteo: "Picoteo",
  actividad: "Actividad física",
  habitos: "Hábitos",
  adherencia: "Adherencia y motivación",
  progreso: "Progreso",
};

// ==========================================
// UMBRALES
// ==========================================
// Agrupados aquí para poder revisarlos de un vistazo.
export const UMBRALES = {
  /** Fracción del peso perdido que es masa magra a partir de la que se avisa */
  magraAviso: 0.25,
  magraAlta: 0.4,
  /** Pérdida semanal (% del peso) considerada demasiado rápida */
  ritmoRapidoPorcentajeSemana: 1.5,
  /** Cambio semanal (kg) por debajo del cual se considera estancamiento */
  estancamientoKgSemana: 0.1,
  estancamientoSemanasMin: 3,
  proteinaRacionesMin: 3,
  frutaVerduraRacionesMin: 5,
  aguaLitrosMin: 1.5,
  minutosEjercicioSemana: 150,
  suenoHorasMin: 6,
  motivacionBaja: 4,
  dosisOlvidadasAviso: 2,
  imcBajoConGlp1: 20,
  picoteosEmocionalesAviso: 3,
  picoteosPorDiaAviso: 1,
  porcentajeSinHambreAviso: 30,
  porcentajeMalestarAviso: 20,
} as const;

interface Contexto {
  programa: ProgramaNutricion;
  visita: VisitaNutricion;
  visitas: VisitaNutricion[];
  resumen: ResumenEvolucion;
  registro: AnalisisRegistro;
}

type Regla = (ctx: Contexto) => Sugerencia | null;

// ==========================================
// REGLAS: SEGURIDAD Y TRATAMIENTO
// ==========================================

const efectosDigestivosRelevantes: Regla = ({ visita }) => {
  if (!visita.glp1Activo) return null;
  const relevantes = visita.efectosSecundarios.filter(
    (e) => EFECTOS_DIGESTIVOS.includes(e.id) && e.intensidad !== "leve"
  );
  if (relevantes.length === 0) return null;
  const lista = relevantes.map((e) => `${etiqueta(EFECTOS_SECUNDARIOS, e.id).toLowerCase()} (${e.intensidad})`).join(", ");
  return {
    id: "efectos_digestivos",
    categoria: "seguridad",
    prioridad: "alta",
    derivar: true,
    titulo: "Efectos digestivos moderados o graves",
    texto:
      "Comunicar al médico prescriptor los efectos digestivos antes de la próxima subida de dosis. " +
      "Mientras tanto: comidas pequeñas y frecuentes, comer despacio, evitar fritos y comidas muy grasas, y beber agua a sorbos durante el día.",
    motivo: `Con GLP-1 activo refiere ${lista}.`,
  };
};

const dolorAbdominalGrave: Regla = ({ visita }) => {
  const grave = visita.efectosSecundarios.some((e) => e.id === "dolor_abdominal" && e.intensidad === "grave");
  if (!grave) return null;
  return {
    id: "dolor_abdominal_grave",
    categoria: "seguridad",
    prioridad: "alta",
    derivar: true,
    titulo: "Dolor abdominal intenso",
    texto: "Derivar para valoración médica sin demora: el dolor abdominal intenso y persistente debe descartarse como posible pancreatitis o problema biliar.",
    motivo: "Refiere dolor abdominal de intensidad grave.",
  };
};

const tensionElevada: Regla = ({ visita }) => {
  if (visita.systolic == null || visita.diastolic == null) return null;
  if (visita.systolic < 140 && visita.diastolic < 90) return null;
  return {
    id: "tension_elevada",
    categoria: "seguridad",
    prioridad: "alta",
    derivar: true,
    titulo: "Tensión arterial elevada",
    texto: "Repetir la toma de tensión en reposo y, si se confirma, derivar al médico para su valoración.",
    motivo: `TA ${visita.systolic}/${visita.diastolic} mmHg (≥ 140/90).`,
  };
};

const imcBajoConGlp1: Regla = ({ visita }) => {
  if (!visita.glp1Activo || visita.imc == null || visita.imc >= UMBRALES.imcBajoConGlp1) return null;
  return {
    id: "imc_bajo_glp1",
    categoria: "seguridad",
    prioridad: "alta",
    derivar: true,
    titulo: "IMC bajo en tratamiento con GLP-1",
    texto: "Informar al médico prescriptor para que valore si procede mantener o ajustar el tratamiento.",
    motivo: `IMC actual ${visita.imc} kg/m² (< ${UMBRALES.imcBajoConGlp1}).`,
  };
};

const ritmoDemasiadoRapido: Regla = ({ resumen }) => {
  const { ritmoRecienteKgSemana, pesoActual } = resumen;
  if (ritmoRecienteKgSemana == null || !pesoActual || ritmoRecienteKgSemana >= 0) return null;
  const porcentajeSemana = (-ritmoRecienteKgSemana / pesoActual) * 100;
  if (porcentajeSemana <= UMBRALES.ritmoRapidoPorcentajeSemana) return null;
  return {
    id: "ritmo_rapido",
    categoria: "seguridad",
    prioridad: "media",
    titulo: "Pérdida de peso muy rápida",
    texto:
      "Revisar que la ingesta sea suficiente: asegurar proteína en cada comida, fruta, verdura e hidratación. " +
      "Una pérdida demasiado rápida aumenta la pérdida de músculo y el riesgo de problemas de vesícula.",
    motivo: `Ritmo reciente de ${Math.abs(ritmoRecienteKgSemana)} kg/semana (${porcentajeSemana.toFixed(1)} % del peso por semana).`,
  };
};

const antecedentesConGlp1: Regla = ({ programa, visita }) => {
  if (!visita.glp1Activo) return null;
  const delicados = programa.antecedentes.filter((a) => ["tca", "pancreatitis", "vesicula"].includes(a));
  if (delicados.length === 0) return null;
  const nombres: Record<string, string> = {
    tca: "trastorno de la conducta alimentaria",
    pancreatitis: "pancreatitis",
    vesicula: "enfermedad de la vesícula biliar",
  };
  return {
    id: "antecedentes_glp1",
    categoria: "tratamiento",
    prioridad: "alta",
    derivar: true,
    titulo: "Antecedentes a tener en cuenta con GLP-1",
    texto: "Confirmar que el médico prescriptor conoce estos antecedentes y vigilar su evolución en cada visita.",
    motivo: `Antecedentes de ${delicados.map((d) => nombres[d]).join(", ")} con tratamiento GLP-1 activo.`,
  };
};

const dosisOlvidadas: Regla = ({ visita }) => {
  if (!visita.glp1Activo || (visita.glp1DosisOlvidadas ?? 0) < UMBRALES.dosisOlvidadasAviso) return null;
  return {
    id: "dosis_olvidadas",
    categoria: "tratamiento",
    prioridad: "media",
    titulo: "Dosis olvidadas",
    texto:
      "Poner una alarma o asociar la administración a una rutina fija (mismo día y momento). " +
      "Si se olvidan varias dosis seguidas, consultar al prescriptor antes de retomar la misma dosis.",
    motivo: `${visita.glp1DosisOlvidadas} dosis olvidadas desde la última visita.`,
  };
};

// ==========================================
// REGLAS: COMPOSICIÓN CORPORAL Y ALIMENTACIÓN
// ==========================================

const perdidaMasaMagra: Regla = ({ resumen }) => {
  const { proporcionMagraPerdida, diferenciaMasaMagra } = resumen;
  if (proporcionMagraPerdida == null || proporcionMagraPerdida <= UMBRALES.magraAviso) return null;
  return {
    id: "perdida_masa_magra",
    categoria: "composicion",
    prioridad: proporcionMagraPerdida > UMBRALES.magraAlta ? "alta" : "media",
    titulo: "Pérdida de masa magra",
    texto:
      "Priorizar la proteína en cada comida (carne, pescado, huevo, lácteos o legumbre) y hacer ejercicio de fuerza 2-3 días por semana para conservar el músculo.",
    motivo: `El ${Math.round(proporcionMagraPerdida * 100)} % del peso perdido es masa magra (${diferenciaMasaMagra} kg).`,
  };
};

const proteinaInsuficiente: Regla = ({ visita }) => {
  if (visita.racionesProteinaDia == null || visita.racionesProteinaDia >= UMBRALES.proteinaRacionesMin) return null;
  return {
    id: "proteina_insuficiente",
    categoria: "alimentacion",
    prioridad: visita.glp1Activo ? "alta" : "media",
    titulo: "Poca proteína",
    texto: "Incluir una ración de proteína en cada comida principal (al menos 3 al día); con poco apetito, empezar el plato por la proteína.",
    motivo: `${visita.racionesProteinaDia} raciones de proteína al día (< ${UMBRALES.proteinaRacionesMin}).`,
  };
};

const hidratacionInsuficiente: Regla = ({ visita }) => {
  if (visita.aguaLitros == null || visita.aguaLitros >= UMBRALES.aguaLitrosMin) return null;
  const estrenimiento = visita.efectosSecundarios.some((e) => e.id === "estrenimiento");
  return {
    id: "hidratacion",
    categoria: "alimentacion",
    prioridad: visita.glp1Activo || estrenimiento ? "alta" : "media",
    titulo: "Hidratación insuficiente",
    texto: "Beber al menos 1,5-2 litros de agua al día, repartidos en pequeñas cantidades (llevar una botella a mano ayuda).",
    motivo: `Bebe ${visita.aguaLitros} L de agua al día.`,
  };
};

const frutaVerduraInsuficiente: Regla = ({ visita }) => {
  if (visita.racionesFrutaVerduraDia == null || visita.racionesFrutaVerduraDia >= UMBRALES.frutaVerduraRacionesMin) return null;
  return {
    id: "fruta_verdura",
    categoria: "alimentacion",
    prioridad: "media",
    titulo: "Poca fruta y verdura",
    texto: "Llegar a 5 raciones de fruta y verdura al día: verdura en comida y cena, y fruta como postre o tentempié.",
    motivo: `${visita.racionesFrutaVerduraDia} raciones de fruta y verdura al día.`,
  };
};

const pocasComidasConGlp1: Regla = ({ visita }) => {
  if (!visita.glp1Activo || visita.comidasDia == null || visita.comidasDia > 2) return null;
  return {
    id: "pocas_comidas",
    categoria: "alimentacion",
    prioridad: "media",
    titulo: "Pocas comidas al día",
    texto: "Repartir la alimentación en 3-4 tomas pequeñas para cubrir las necesidades de proteína y nutrientes a pesar del poco apetito.",
    motivo: `Hace ${visita.comidasDia} comidas al día con GLP-1 activo.`,
  };
};

const malestarTrasComer: Regla = ({ visita, registro }) => {
  const nauseasVisita = visita.efectosSecundarios.some((e) => e.id === "nauseas" && e.intensidad === "leve");
  const porcentajeMalestar = registro.totalIngestas > 0 ? (registro.ingestasConMalestar / registro.totalIngestas) * 100 : 0;
  const malestarRegistro = porcentajeMalestar >= UMBRALES.porcentajeMalestarAviso;
  if (!nauseasVisita && !malestarRegistro) return null;
  return {
    id: "malestar_comidas",
    categoria: "alimentacion",
    prioridad: "media",
    titulo: "Malestar tras las comidas",
    texto:
      "Servir raciones más pequeñas, comer despacio y parar al notar la primera sensación de saciedad. " +
      "Evitar fritos, salsas y comidas muy grasas o picantes, y no tumbarse justo después de comer.",
    motivo: malestarRegistro
      ? `${registro.ingestasConMalestar} de ${registro.totalIngestas} ingestas registradas con pesadez, náuseas o reflujo.`
      : "Refiere náuseas leves.",
  };
};

const estrenimiento: Regla = ({ visita }) => {
  if (!visita.efectosSecundarios.some((e) => e.id === "estrenimiento")) return null;
  return {
    id: "estrenimiento",
    categoria: "alimentacion",
    prioridad: "media",
    titulo: "Estreñimiento",
    texto: "Aumentar la fibra de forma progresiva (verdura, fruta con piel, legumbre, integrales), beber más agua y caminar a diario.",
    motivo: "Refiere estreñimiento.",
  };
};

// ==========================================
// REGLAS: PICOTEO (visita + registro)
// ==========================================

const picoteoEmocional: Regla = ({ visita, registro }) => {
  const causasVisita = visita.picoteoCausas.filter((c) => CAUSAS_EMOCIONALES.includes(c));
  const enRegistro = registro.picoteosEmocionales >= UMBRALES.picoteosEmocionalesAviso;
  if (causasVisita.length === 0 && !enRegistro) return null;
  return {
    id: "picoteo_emocional",
    categoria: "picoteo",
    prioridad: "media",
    titulo: "Picoteo por causas emocionales",
    texto:
      "Antes de picar, parar un momento y preguntarse si es hambre real. Tener preparada una alternativa (paseo corto, infusión, llamar a alguien) " +
      "y no tener a la vista alimentos de picoteo. Si la ansiedad es frecuente, valorar apoyo psicológico.",
    motivo: enRegistro
      ? `${registro.picoteosEmocionales} picoteos por ansiedad, aburrimiento u otras emociones en el registro.`
      : "En la visita refiere picoteo por causas emocionales.",
  };
};

const picoteoFrecuente: Regla = ({ visita, registro }) => {
  const enVisita = visita.picoteoFrecuencia === "varias_diarias";
  const enRegistro = registro.diasRegistrados > 0 && registro.picoteosPorDia >= UMBRALES.picoteosPorDiaAviso;
  if (!enVisita && !enRegistro) return null;
  const franja = FRANJAS_HORARIAS.find((f) => f.id === registro.franjaPicoteo);
  return {
    id: "picoteo_frecuente",
    categoria: "picoteo",
    prioridad: "media",
    titulo: "Picoteo frecuente",
    texto:
      "Planificar un tentempié saludable a la hora en que suele aparecer el picoteo (fruta, yogur natural, un puñado de frutos secos) " +
      "y asegurar que las comidas principales incluyan proteína y fibra para llegar con menos hambre.",
    motivo: enRegistro
      ? `${registro.picoteosPorDia} picoteos al día de media${franja ? `, sobre todo por la ${franja.label.toLowerCase()}` : ""}.`
      : "Refiere picoteo varias veces al día.",
  };
};

const comerSinHambre: Regla = ({ registro }) => {
  if (registro.totalIngestas < 5) return null;
  const porcentaje = (registro.ingestasSinHambre / registro.totalIngestas) * 100;
  if (porcentaje < UMBRALES.porcentajeSinHambreAviso) return null;
  return {
    id: "comer_sin_hambre",
    categoria: "picoteo",
    prioridad: "info",
    titulo: "Come sin hambre a menudo",
    texto: "Practicar la alimentación consciente: comer sentado, sin pantallas, despacio, y valorar el hambre antes de empezar.",
    motivo: `${Math.round(porcentaje)} % de las ingestas registradas con hambre 0-2 sobre 10.`,
  };
};

const sinDesayuno: Regla = ({ registro }) => {
  if (registro.diasRegistrados < 3 || registro.diasConDesayuno >= registro.diasRegistrados / 2) return null;
  return {
    id: "sin_desayuno",
    categoria: "alimentacion",
    prioridad: "info",
    titulo: "Se salta el desayuno",
    texto: "Valorar un desayuno sencillo con proteína (yogur, huevo, queso fresco) si llega con mucha hambre a media mañana o pica más por la tarde.",
    motivo: `Desayuna ${registro.diasConDesayuno} de ${registro.diasRegistrados} días registrados.`,
  };
};

// ==========================================
// REGLAS: ACTIVIDAD FÍSICA Y HÁBITOS
// ==========================================

const ejercicioInsuficiente: Regla = ({ visita }) => {
  const minutos = minutosEjercicioSemana(visita);
  if (minutos == null || minutos >= UMBRALES.minutosEjercicioSemana) return null;
  return {
    id: "ejercicio_insuficiente",
    categoria: "actividad",
    prioridad: "media",
    titulo: "Poca actividad física",
    texto: "Aumentar de forma progresiva hasta al menos 150 minutos de actividad moderada a la semana (por ejemplo, 30 minutos de paseo a buen ritmo 5 días).",
    motivo: `${minutos} minutos de ejercicio a la semana.`,
  };
};

const sinFuerza: Regla = ({ visita, resumen }) => {
  if (visita.ejercicioTipos.includes("fuerza")) return null;
  const perdiendoPeso = (resumen.diferenciaPeso ?? 0) < 0;
  if (!visita.glp1Activo && !perdiendoPeso) return null;
  return {
    id: "sin_fuerza",
    categoria: "actividad",
    prioridad: "media",
    titulo: "Sin ejercicio de fuerza",
    texto: "Incluir ejercicios de fuerza 2-3 días por semana (sentadillas, bandas elásticas, pesas ligeras) para conservar la masa muscular durante la pérdida de peso.",
    motivo: visita.glp1Activo ? "Tratamiento GLP-1 activo sin ejercicio de fuerza." : "Está perdiendo peso sin ejercicio de fuerza.",
  };
};

const suenoInsuficiente: Regla = ({ visita }) => {
  const pocasHoras = visita.suenoHoras != null && visita.suenoHoras < UMBRALES.suenoHorasMin;
  if (!pocasHoras && visita.suenoCalidad !== "mala") return null;
  return {
    id: "sueno",
    categoria: "habitos",
    prioridad: "media",
    titulo: "Descanso insuficiente",
    texto: "Mantener horarios regulares de sueño, cenar al menos 2 horas antes de acostarse y evitar pantallas y cafeína por la tarde. Dormir poco aumenta el apetito.",
    motivo: pocasHoras ? `Duerme ${visita.suenoHoras} h.` : "Refiere mala calidad del sueño.",
  };
};

const estresAlto: Regla = ({ visita }) => {
  if (visita.estres !== "alto") return null;
  return {
    id: "estres",
    categoria: "habitos",
    prioridad: "media",
    titulo: "Estrés alto",
    texto: "Reservar cada día un momento para una actividad que relaje (paseo, respiración, lectura). El estrés favorece el picoteo y dificulta la adherencia.",
    motivo: "Refiere nivel de estrés alto.",
  };
};

const alcohol: Regla = ({ programa }) => {
  if (programa.alcohol !== "semanal" && programa.alcohol !== "diario") return null;
  return {
    id: "alcohol",
    categoria: "habitos",
    prioridad: "info",
    titulo: "Consumo de alcohol",
    texto: "Reducir el alcohol: aporta calorías sin nutrientes y abre el apetito.",
    motivo: `Consumo de alcohol ${programa.alcohol}.`,
  };
};

const tabaco: Regla = ({ programa }) => {
  if (programa.tabaco !== "si") return null;
  return {
    id: "tabaco",
    categoria: "habitos",
    prioridad: "info",
    titulo: "Fumador",
    texto: "Ofrecer el servicio de deshabituación tabáquica de la farmacia cuando el paciente esté preparado.",
    motivo: "El paciente fuma.",
  };
};

// ==========================================
// REGLAS: ADHERENCIA Y PROGRESO
// ==========================================

const motivacionBaja: Regla = ({ visita }) => {
  const baja = (v?: number | null) => v != null && v <= UMBRALES.motivacionBaja;
  if (!baja(visita.motivacion) && !baja(visita.adherencia)) return null;
  const datos = [
    visita.motivacion != null ? `motivación ${visita.motivacion}/10` : null,
    visita.adherencia != null ? `adherencia ${visita.adherencia}/10` : null,
  ].filter(Boolean);
  return {
    id: "motivacion_baja",
    categoria: "adherencia",
    prioridad: "alta",
    titulo: "Motivación o adherencia bajas",
    texto: "Acordar 1-2 objetivos pequeños y concretos para la próxima visita y adelantar el seguimiento si es posible.",
    motivo: `${datos.join(", ")}.`,
  };
};

const estancamiento: Regla = ({ visitas, resumen }) => {
  const conPeso = visitas.filter((v) => v.peso != null);
  if (conPeso.length < 3 || resumen.ritmoRecienteKgSemana == null) return null;
  const [anterior, reciente] = conPeso.slice(-2);
  const semanas = (new Date(reciente.fecha).getTime() - new Date(anterior.fecha).getTime()) / (7 * 24 * 3600 * 1000);
  if (semanas < UMBRALES.estancamientoSemanasMin) return null;
  if (Math.abs(resumen.ritmoRecienteKgSemana) >= UMBRALES.estancamientoKgSemana) return null;
  return {
    id: "estancamiento",
    categoria: "adherencia",
    prioridad: "media",
    titulo: "Peso estancado",
    texto: "Revisar con el paciente la pauta, las raciones y la actividad física. Valorar la evolución de la cintura y la composición corporal, que pueden mejorar aunque el peso no cambie.",
    motivo: `Sin cambios de peso relevantes en ${Math.round(semanas)} semanas.`,
  };
};

const hitoAlcanzado: Regla = ({ resumen }) => {
  if (resumen.hitoAlcanzado == null) return null;
  return {
    id: "hito",
    categoria: "progreso",
    prioridad: "info",
    titulo: `Ha superado el ${resumen.hitoAlcanzado} % de pérdida de peso`,
    texto: `¡Enhorabuena! Ha perdido un ${resumen.porcentajePerdida} % de su peso inicial, un cambio con beneficios reales para la salud.`,
    motivo: `Pérdida acumulada de ${Math.abs(resumen.diferenciaPeso ?? 0)} kg (${resumen.porcentajePerdida} %).`,
  };
};

const objetivoAlcanzado: Regla = ({ programa, resumen }) => {
  if (!programa.pesoObjetivo || resumen.pesoActual == null || resumen.pesoActual > programa.pesoObjetivo) return null;
  return {
    id: "objetivo_alcanzado",
    categoria: "progreso",
    prioridad: "info",
    titulo: "Peso objetivo alcanzado",
    texto: "Plantear la fase de mantenimiento: consolidar hábitos y espaciar las visitas de seguimiento.",
    motivo: `Peso actual ${resumen.pesoActual} kg; objetivo ${programa.pesoObjetivo} kg.`,
  };
};

const REGLAS: Regla[] = [
  dolorAbdominalGrave,
  efectosDigestivosRelevantes,
  tensionElevada,
  imcBajoConGlp1,
  antecedentesConGlp1,
  ritmoDemasiadoRapido,
  dosisOlvidadas,
  motivacionBaja,
  perdidaMasaMagra,
  proteinaInsuficiente,
  hidratacionInsuficiente,
  pocasComidasConGlp1,
  malestarTrasComer,
  estrenimiento,
  frutaVerduraInsuficiente,
  sinDesayuno,
  picoteoEmocional,
  picoteoFrecuente,
  comerSinHambre,
  ejercicioInsuficiente,
  sinFuerza,
  suenoInsuficiente,
  estresAlto,
  alcohol,
  tabaco,
  estancamiento,
  hitoAlcanzado,
  objetivoAlcanzado,
];

const ORDEN_PRIORIDAD: Record<PrioridadSugerencia, number> = { alta: 0, media: 1, info: 2 };

export interface EntradaSugerencias {
  programa: ProgramaNutricion;
  visitas: readonly VisitaNutricion[];
  registros?: readonly RegistroAlimentacion[];
  /** Visita a evaluar; por defecto la más reciente. Solo cuentan las visitas hasta ella. */
  visitaId?: string;
}

/**
 * Genera las sugerencias para una visita del programa, ordenadas por prioridad.
 */
export function generarSugerencias({ programa, visitas, registros = [], visitaId }: EntradaSugerencias): Sugerencia[] {
  const ordenadas = ordenarVisitas(visitas);
  const indice = visitaId ? ordenadas.findIndex((v) => v.id === visitaId) : ordenadas.length - 1;
  if (indice < 0) return [];

  const hastaVisita = ordenadas.slice(0, indice + 1);
  const visita = hastaVisita[hastaVisita.length - 1];
  // En la visita más reciente cuenta todo el registro (puede haberse transcrito
  // después); en visitas anteriores, solo lo anotado hasta su fecha.
  const esUltima = indice === ordenadas.length - 1;
  const fechaLimite = visita.fecha.slice(0, 10);
  const registrosVisita = esUltima ? registros : registros.filter((r) => r.fecha.slice(0, 10) <= fechaLimite);

  const ctx: Contexto = {
    programa,
    visita,
    visitas: hastaVisita,
    resumen: resumirEvolucion(hastaVisita),
    registro: analizarRegistro(registrosVisita),
  };

  return REGLAS.map((regla) => regla(ctx))
    .filter((s): s is Sugerencia => s !== null)
    .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
}
