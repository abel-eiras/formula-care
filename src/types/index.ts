export interface ColoresMarca {
  primario?: string;
  secundario?: string;
  fondo?: string;
  texto?: string;
  /** Color para subtítulos y texto secundario (mejor contraste en sidebar e informes) */
  textoSecundario?: string;
  /** Color de acento: botones, ítem activo en sidebar */
  acento?: string;
  /** Color de líneas divisorias y bordes de marca */
  linea?: string;
  [key: string]: string | undefined;
}

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
  temaActivo?: string;
  coloresMarca?: ColoresMarca | null;
  valoracionBioActiva: boolean;
  parametrosReferencia: Record<string, ParametroReferencia>;
  parametrosBioConfig?: ParametroBioConfig[]; // Configuración de parámetros dinámicos
  createdAt?: string;
  updatedAt?: string;
}

// Plantillas de Email
export interface PlantillaEmail {
  id: string;
  tipo: 'confirmacion' | 'recordatorio' | 'cancelacion' | 'modificacion' | 'cumpleanos';
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
  grupo: 'basicos' | 'avanzados' | 'tension' | 'corporales'; // Grupo para maquetación
  activo: boolean;      // Si está activo/visible
  orden: number;        // Orden dentro del grupo
  esPersonalizado?: boolean; // Si es un parámetro creado por el usuario
}

export type EstadoValoracion = 'normal' | 'advertencia' | 'critico';

// ==========================================
// MEDICIONES (tabla única para todos los servicios)
// ==========================================

/**
 * Medidas corporales y constantes. Bio y Nutrición las reciben y devuelven
 * como campos planos, pero se guardan en una única tabla por paciente.
 * Desde la API pueden llegar como null.
 */
export interface CamposMedicion {
  peso?: number | null; // kg
  altura?: number | null; // cm
  cintura?: number | null; // cm (perímetro abdominal)
  cadera?: number | null; // cm
  imc?: number | null; // Calculado en el servidor
  icc?: number | null; // Índice cintura-cadera, calculado en el servidor
  porcentajeGrasa?: number | null;
  masaGrasa?: number | null; // kg
  masaMagra?: number | null; // kg (masa libre de grasa)
  systolic?: number | null; // mmHg
  diastolic?: number | null; // mmHg
  pulsaciones?: number | null; // lpm
}

/** Una medición del historial único del paciente (GET /pacientes/:id/mediciones) */
export interface Medicion extends CamposMedicion {
  id: string;
  fecha: string; // YYYY-MM-DD
  origen: 'bio' | 'nutricion';
  analisisBioId?: string | null;
  visitaNutricionId?: string | null;
}

export interface AnalisisBio extends CamposMedicion {
  id: string;
  pacienteId: string;
  fecha: string;
  // Parámetros básicos
  glucemia?: number;
  cholesterol?: number; // Colesterol total
  cholesterolHDL?: number; // Colesterol HDL
  cholesterolLDL?: number; // Colesterol LDL
  triglycerides?: number;
  // Parámetros avanzados
  hemoglobinaGlucosilada?: number; // HbA1c
  proteinaCReactiva?: number; // PCR
  vitaminaD?: number;
  ferritina?: number;
  // Observaciones y recomendaciones
  observaciones?: string;
  recomendaciones?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relación
  paciente?: Paciente;
}

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
  motivoConsulta?: string;
  valoracionPiel: string[];
  habitos: string[];
  medicacionHabitual?: string;
  patologias?: string;
  etapaHormonal?: string; // Solo para mujeres
  rutinaDia?: RutinaDia | null;
  rutinaNoche?: RutinaNoche | null;
  cuidadosSemanales?: CuidadosSemanales | null;
  suplementacionOral?: string;
  proximaRevision?: string;
  farmaceutico?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relación
  paciente?: Paciente;
}

export interface Paciente {
  id: string;
  name: string;
  sex: string;
  phone: string;
  email?: string;
  /** YYYY-MM-DD. La edad no se guarda: se calcula con calcularEdad() de @/lib/edad */
  birthDate: string;
  address?: string;
  notes?: string;
  /** Último servicio (Dermo, Bio o Nutrición); lo calcula el servidor en listados */
  ultimaVisita?: UltimaVisita | null;
  origen?: 'manual' | 'autoregistro'; // "manual" = registrado por farmacia, "autoregistro" = formulario público
  createdAt?: string;
  updatedAt?: string;
  // Relaciones: presentes solo en el detalle (GET /pacientes/:id), no en el listado
  analisisDermo?: AnalisisDermo[];
  analisisBio?: AnalisisBio[];
  citas?: Cita[];
  // Presente solo en el listado (GET /pacientes): recuento de relaciones, sin los datos completos
  _count?: {
    analisisDermo: number;
    analisisBio: number;
    programasNutricion: number;
    citas: number;
  };
}

export type ServicioPaciente = 'dermo' | 'bio' | 'nutricion';

export interface UltimaVisita {
  fecha: string; // YYYY-MM-DD
  servicio: ServicioPaciente;
}

export interface Notificacion {
  id: string;
  tipo: 'cita' | 'revision' | 'recordatorio' | 'alerta' | 'cumpleanos';
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
  tipo: 'dermo' | 'bio' | 'nutricion' | 'consulta' | 'seguimiento';
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
// USUARIOS
// ==========================================

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'farmaceutico' | 'usuario';
  activo: boolean;
  ultimoAcceso?: string;
  createdAt?: string;
}

export * from "./nutricion";

// ==========================================
// CUMPLEAÑOS
// ==========================================

export type CanalFelicitacion = 'whatsapp' | 'email' | 'llamada' | 'en_persona';

/** Cumpleaños calculado desde la fecha de nacimiento (GET /cumpleanos) */
export interface Cumpleanos {
  pacienteId: string;
  nombre: string;
  telefono: string;
  email: string | null;
  fechaNacimiento: string;
  /** Día en que se celebra (YYYY-MM-DD) */
  fecha: string;
  /** Años que cumple ese día */
  edad: number;
  felicitacion: { canal: CanalFelicitacion; usuario: string | null; fecha: string } | null;
}
