import type { CamposMedicion } from './index';

// ==========================================
// SERVICIO DE NUTRICIÓN (con seguimiento GLP-1 opcional)
// ==========================================
// Los campos opcionales pueden llegar como null desde la API (SQLite).

export type EstadoPrograma = 'activo' | 'pausado' | 'finalizado';
export type TipoVisita = 'inicial' | 'seguimiento';
export type EvolucionSubjetiva = 'muy_buena' | 'buena' | 'regular' | 'dificultosa';
export type Intensidad = 'leve' | 'moderada' | 'grave';
export type Calidad = 'buena' | 'regular' | 'mala';
export type NivelEstres = 'bajo' | 'moderado' | 'alto';
export type EstadoEjercicio = 'no' | 'parcial' | 'si';
export type FrecuenciaPicoteo = 'ocasional' | 'diario' | 'varias_diarias';
export type Tabaco = 'no' | 'exfumador' | 'si';
export type FrecuenciaAlcohol = 'nunca' | 'ocasional' | 'semanal' | 'diario';
export type MomentoComida = 'desayuno' | 'media_manana' | 'comida' | 'merienda' | 'cena' | 'recena' | 'picoteo';
export type CantidadComida = 'pequena' | 'normal' | 'grande';
export type Compania = 'solo' | 'familia' | 'amigos' | 'trabajo';
export type LugarComida = 'casa' | 'trabajo' | 'fuera' | 'otro';

export interface EfectoSecundario {
  id: string;
  intensidad: Intensidad;
}

export interface ProgramaNutricion {
  id: string;
  pacienteId: string;
  fechaInicio: string;
  estado: EstadoPrograma;
  fechaFin?: string | null;
  motivoConsulta?: string | null;
  objetivoPrincipal?: string | null;
  pesoObjetivo?: number | null;
  dietasPrevias?: string | null;
  antecedentes: string[];
  otrosProblemasMedicos?: string | null;
  antecedentesFamiliares?: string | null;
  tabaco?: Tabaco | null;
  alcohol?: FrecuenciaAlcohol | null;
  glp1Previo: boolean;
  glp1PrevioFarmaco?: string | null;
  glp1PrevioMotivoAbandono?: string | null;
  medicoPrescriptor?: string | null;
  otroTratamientoPeso?: string | null;
  farmaceutico?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Programa tal como lo devuelve el listado: con visitas y recuento de registros */
export interface ProgramaNutricionResumen extends ProgramaNutricion {
  visitas: VisitaNutricion[];
  totalRegistros: number;
}

/** Programa completo (detalle): con visitas y registro de alimentación */
export interface ProgramaNutricionDetalle extends ProgramaNutricion {
  visitas: VisitaNutricion[];
  registros: RegistroAlimentacion[];
}

/** Visita de nutrición. Sus medidas (peso, cintura, tensión...) se guardan en la tabla única de mediciones */
export interface VisitaNutricion extends CamposMedicion {
  id: string;
  programaId: string;
  fecha: string;
  tipo: TipoVisita;
  evolucionSubjetiva?: EvolucionSubjetiva | null;
  adherencia?: number | null;
  motivacion?: number | null;
  medicacionHabitual?: string | null;
  suplementacion?: string | null;
  glp1Activo: boolean;
  glp1Farmaco?: string | null;
  glp1Dosis?: string | null;
  glp1FechaInicio?: string | null;
  glp1DosisOlvidadas?: number | null;
  efectosSecundarios: EfectoSecundario[];
  toleranciaObservaciones?: string | null;
  cambioDieteticoIniciado?: boolean | null;
  pautaDietetica?: string | null;
  comidasDia?: number | null;
  racionesProteinaDia?: number | null;
  racionesFrutaVerduraDia?: number | null;
  picoteo?: boolean | null;
  picoteoFrecuencia?: FrecuenciaPicoteo | null;
  picoteoCausas: string[];
  aguaLitros?: number | null;
  suenoHoras?: number | null;
  suenoCalidad?: Calidad | null;
  estres?: NivelEstres | null;
  ejercicio?: EstadoEjercicio | null;
  ejercicioTipos: string[];
  ejercicioDiasSemana?: number | null;
  ejercicioMinutosSesion?: number | null;
  ejercicioDetalle?: string | null;
  dificultades?: string | null;
  observaciones?: string | null;
  objetivosProximaSesion?: string | null;
  recomendaciones?: string | null;
  proximaRevision?: string | null;
  farmaceutico?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistroAlimentacion {
  id: string;
  programaId: string;
  fecha: string;
  hora?: string | null;
  momento: MomentoComida;
  descripcion: string;
  cantidad?: CantidadComida | null;
  hambreAntes?: number | null;
  saciedadDespues?: number | null;
  sensaciones: string[];
  compania?: Compania | null;
  lugar?: LugarComida | null;
  causaPicoteo?: string | null;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Datos que el cliente envía al crear/editar (sin campos de servidor) */
export type DatosPrograma = Omit<ProgramaNutricion, 'id' | 'createdAt' | 'updatedAt'>;
export type DatosVisita = Omit<VisitaNutricion, 'id' | 'tipo' | 'imc' | 'icc' | 'createdAt' | 'updatedAt'>;
export type DatosRegistro = Omit<RegistroAlimentacion, 'id' | 'createdAt' | 'updatedAt'>;
