export interface Configuracion {
  id: string;
  farmaciaNombre?: string;
  farmaciaDireccion?: string;
  farmaciaCiudad?: string;
  farmaciaTelefono?: string;
  farmaciaEmail?: string;
  farmaciaWeb?: string;
  farmaciaWhatsapp?: string;
  farmaciaLogo?: string;
  valoracionBioActiva: boolean;
  parametrosReferencia: Record<string, ParametroReferencia>;
  // Google Calendar
  googleCalendarEnabled?: boolean;
  googleCalendarId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  // Cal.com
  calComEnabled?: boolean;
  calComLink?: string;
  calComApiKey?: string;
  calComWebhookSecret?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParametroReferencia {
  normalMin: number;
  normalMax: number;
  advertenciaMin?: number;
  advertenciaMax?: number;
  advertenciaMin2?: number;
  advertenciaMax2?: number;
  criticoMin?: number;
  criticoMax?: number;
  criticoMin2?: number;
  criticoMax2?: number;
}

export type EstadoValoracion = 'normal' | 'advertencia' | 'critico';

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
  // Observaciones y recomendaciones
  observaciones?: string;
  recomendaciones?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relación
  paciente?: Paciente;
  // Campo legacy para compatibilidad
  glucose?: number;
}

export interface Paciente {
  id: string;
  name: string;
  age: number;
  sex: string;
  phone: string;
  email?: string;
  birthDate?: string;
  address?: string;
  notes?: string;
  lastVisit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notificacion {
  id: string;
  tipo: 'cita' | 'revision' | 'recordatorio' | 'alerta';
  pacienteId?: string;
  citaId?: string;
  analisisId?: string;
  titulo: string;
  mensaje: string;
  canal: 'email' | 'sms' | 'whatsapp' | 'interno';
  enviada: boolean;
  fechaEnvio?: string;
  leida: boolean;
  fechaLectura?: string;
  createdAt?: string;
  updatedAt?: string;
  paciente?: Paciente;
  cita?: {
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
  };
}
