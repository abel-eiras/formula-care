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
  origen?: 'manual' | 'autoregistro'; // "manual" = registrado por farmacia, "autoregistro" = formulario público
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

export interface SolicitudCita {
  id: string;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  tipo: 'dermo' | 'bio' | 'evento';
  fecha: string; // Formato ISO
  hora: string; // Formato "HH:mm"
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  notas?: string;
  pacienteId?: string;
  citaId?: string;
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

export interface ConfiguracionCalendario {
  id: string;
  horariosPorTipo: string; // JSON: { "dermo": { "lunes": ["09:00-14:00"], ... }, "bio": {...} }
  fechasBloqueadas: string; // JSON: ["2026-01-20", "2026-01-21"]
  horasBloqueadas: string; // JSON: { "2026-01-20": ["10:00", "11:00"] }
  autoAceptar: boolean;
  duracionPorTipo: string; // JSON: { "dermo": 30, "bio": 45, "consulta": 30, "seguimiento": 20 }
  createdAt?: string;
  updatedAt?: string;
}

// Tipos auxiliares para ConfiguracionCalendario
export interface Cita {
  id: string;
  titulo: string;
  pacienteId: string;
  fecha: string; // Formato ISO
  hora: string; // Formato "HH:mm"
  tipo: 'dermo' | 'bio' | 'consulta' | 'seguimiento';
  notas?: string;
  recordatorioEnviado?: boolean;
  createdAt?: string;
  updatedAt?: string;
  paciente?: {
    id: string;
    name: string;
    phone?: string;
  };
}

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface HorariosPorTipo {
  [tipo: string]: {
    [dia in DiaSemana]?: string[]; // Array de rangos horarios: ["09:00-14:00", "16:00-19:00"]
  };
}

export interface DuracionPorTipo {
  [tipo: string]: number; // Duración en minutos
}

export interface Evento {
  id: string;
  nombre: string;
  activo: boolean;
  fechas: string; // JSON array de fechas
  horas: string; // JSON array de rangos horarios
  duracion: number; // En minutos
  maxAsistentes: number;
  descripcion?: string;
  createdAt?: string;
  updatedAt?: string;
}
