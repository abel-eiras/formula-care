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
  parametrosBioConfig?: ParametroBioConfig[]; // Configuración de parámetros dinámicos
  createdAt?: string;
  updatedAt?: string;
}

// Plantillas de Email
export interface PlantillaEmail {
  id: string;
  tipo: 'confirmacion' | 'recordatorio' | 'cancelacion' | 'modificacion';
  nombre: string;
  asunto: string;
  contenidoHtml: string;
  contenidoTexto?: string;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariablePlantilla {
  nombre: string;
  descripcion: string;
}

// Configuración RGPD y Legal
export interface ConfiguracionRgpd {
  // Datos del responsable del tratamiento
  rgpdRazonSocial?: string | null;
  rgpdCif?: string | null;
  rgpdDireccionFiscal?: string | null;
  rgpdEmailContacto?: string | null;
  rgpdResponsable?: string | null;
  rgpdDpo?: string | null;
  // Textos legales
  textoAvisoLegal?: string | null;
  textoPoliticaPrivacidad?: string | null;
  textoPoliticaCookies?: string | null;
  textoConsentimiento?: string | null;
  // Configuración de consentimiento
  consentimientoRequerido?: boolean;
  consentimientoVersion?: string | null;
  retencionDatosMeses?: number;
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

// Configuración de un parámetro bioquímico
export interface ParametroBioConfig {
  id: string;           // Identificador único (ej: "glucemia", "custom_1")
  label: string;        // Nombre visible (ej: "Glucemia")
  unit: string;         // Unidad (ej: "mg/dL")
  grupo: 'basicos' | 'avanzados' | 'corporales'; // Grupo para maquetación
  activo: boolean;      // Si está activo/visible
  orden: number;        // Orden dentro del grupo
  esPersonalizado?: boolean; // Si es un parámetro creado por el usuario
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
  fechas: string[]; // Array de fechas en formato YYYY-MM-DD
  horas: string[]; // Array de rangos horarios (ej: "10:00-14:00")
  duracion: number; // En minutos
  maxAsistentes: number;
  descripcion?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// TIPOS MULTI-TENANT Y SUPERADMIN
// ==========================================

export type PlanFarmacia = 'basico' | 'profesional' | 'enterprise';

export interface Farmacia {
  id: string;
  nombre: string;
  slug: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  web?: string;
  logo?: string;
  activa: boolean;
  plan: PlanFarmacia;
  fechaAlta: string;
  fechaExpiracion?: string;
  maxUsuarios: number;
  maxPacientes: number;
  // Contadores (calculados en el servidor)
  totalUsuarios?: number;
  totalPacientes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FarmaciaDetalle extends Farmacia {
  usuarios: Usuario[];
  estadisticas: {
    totalUsuarios: number;
    totalPacientes: number;
    totalCitas: number;
    totalEventos: number;
  };
  configuracion?: {
    id: string;
    valoracionBioActiva: boolean;
    emailProvider?: string;
  };
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'superadmin' | 'admin' | 'farmaceutico' | 'usuario';
  activo: boolean;
  farmaciaId?: string;
  farmacia?: {
    id: string;
    nombre: string;
    slug: string;
  };
  ultimoAcceso?: string;
  createdAt?: string;
}

export interface CrearFarmaciaData {
  nombre: string;
  slug?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  web?: string;
  plan: PlanFarmacia;
  maxUsuarios?: number;
  maxPacientes?: number;
  fechaExpiracion?: string;
  // Datos del admin inicial
  adminEmail: string;
  adminPassword: string;
  adminNombre: string;
}

export interface ActualizarFarmaciaData {
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  web?: string;
  activa?: boolean;
  plan?: PlanFarmacia;
  maxUsuarios?: number;
  maxPacientes?: number;
  fechaExpiracion?: string | null;
}

export interface EstadisticasPlataforma {
  // Contadores principales
  totalFarmacias: number;
  farmaciasActivas: number;
  farmaciasInactivas: number;
  totalUsuarios: number;
  totalPacientes: number;
  // Citas
  citasHoy: number;
  citasSemana: number;
  citasMes: number;
  // Distribución por plan
  farmaciasPorPlan: {
    basico: number;
    profesional: number;
    enterprise: number;
  };
  // Alertas
  farmaciasProximasExpirar: {
    id: string;
    nombre: string;
    slug: string;
    plan: PlanFarmacia;
    fechaExpiracion: string;
  }[];
  // Actividad
  ultimasFarmacias: {
    id: string;
    nombre: string;
    slug: string;
    plan: PlanFarmacia;
    activa: boolean;
    fechaAlta: string;
    totalUsuarios: number;
    totalPacientes: number;
  }[];
  crecimientoMensual: {
    mes: string;
    farmacias: number;
  }[];
  actividadReciente: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    ultimoAcceso: string;
    farmacia?: {
      nombre: string;
      slug: string;
    };
  }[];
  topFarmacias: {
    id: string;
    nombre: string;
    slug: string;
    plan: PlanFarmacia;
    totalCitas: number;
    totalPacientes: number;
  }[];
}
