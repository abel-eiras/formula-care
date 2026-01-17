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

export interface AnalisisDermo {
  id: string;
  pacienteId: string;
  fecha: string;
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
}

export interface AnalisisBio {
  id: string;
  pacienteId: string;
  fecha: string;
  glucose?: number;
  cholesterol?: number;
  triglycerides?: number;
  systolic?: number;
  diastolic?: number;
  weight?: number;
  height?: number;
  imc?: number;
  createdAt?: string;
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
