/**
 * Tipos TypeScript compartidos en la aplicación
 */

export interface Paciente {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F" | "O";
  phone: string;
  email?: string;
  birthDate?: string;
  address?: string;
  notes?: string;
  lastVisit?: string;
  services?: ("dermo" | "bio")[];
  createdAt?: string;
  updatedAt?: string;
  // Relaciones (vienen del backend)
  analisisDermo?: AnalisisDermo[];
  analisisBio?: AnalisisBio[];
  citas?: Cita[];
  _count?: {
    analisisDermo?: number;
    analisisBio?: number;
    citas?: number;
  };
}

// Tipos para rutinas y cuidados
export interface RutinaDia {
  higiene?: string;
  contornoOjos?: string;
  productoIntensivo?: string;
  hidratacion?: string;
  proteccionSolar?: string;
}

export interface RutinaNoche {
  limpieza?: string;
  contornoOjos?: string;
  productoIntensivo?: string;
  hidratacion?: string;
}

export interface CuidadosSemanales {
  exfoliante?: string;
  mascarilla?: string;
}

export interface AnalisisDermo {
  id: string;
  pacienteId: string;
  fecha: string;
  // Nuevos campos de la plantilla
  motivoConsulta?: string;
  valoracionPiel: string[];
  habitos: string[];
  medicacionHabitual?: string;
  patologias?: string;
  etapaHormonal?: string;
  rutinaDia?: RutinaDia;
  rutinaNoche?: RutinaNoche;
  cuidadosSemanales?: CuidadosSemanales;
  suplementacionOral?: string;
  proximaRevision?: string;
  farmaceutico?: string;
  // Campos legacy (mantener para compatibilidad)
  skinType?: string;
  phototype?: string;
  concerns: string[];
  hydration?: number;
  sebum?: number;
  elasticity?: number;
  spots?: number;
  ph?: number;
  treatment?: string;
  cleaning?: string;
  sunProtection?: string;
  supplements?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relación
  paciente?: Paciente;
}

export interface AnalisisBio {
  id: string;
  pacienteId: string;
  fecha: string;
  // Parámetros básicos
  glucemia?: number; // Antes "glucose"
  cholesterol?: number; // Colesterol total
  cholesterolHDL?: number; // Colesterol HDL
  cholesterolLDL?: number; // Colesterol LDL
  triglycerides?: number;
  // Parámetros avanzados
  hemoglobinaGlucosilada?: number; // HbA1c
  proteinaCReactiva?: number; // PCR
  vitaminaD?: number;
  ferritina?: number;
  // Tensión arterial y pulsaciones
  systolic?: number;
  diastolic?: number;
  pulsaciones?: number;
  // Medidas corporales
  weight?: number;
  height?: number;
  imc?: number; // Calculado automáticamente
  createdAt?: string;
  updatedAt?: string;
  // Relación
  paciente?: Paciente;
  // Campo legacy para compatibilidad
  glucose?: number;
}

export interface Cita {
  id: string;
  titulo: string;
  pacienteId: string;
  paciente?: Paciente;
  fecha: Date | string;
  hora: string;
  tipo: "dermo" | "bio" | "consulta" | "seguimiento";
  notas?: string;
  createdAt?: string;
}
