/**
 * Servicio de Email con soporte dual: Resend + SMTP (Nodemailer)
 * Carga plantillas dinámicas desde la base de datos
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma.js';

// ==========================================
// TIPOS
// ==========================================

interface DatosEmail {
  nombrePaciente: string;
  fechaCita: string;
  horaCita: string;
  tipoServicio: string;
  nombreFarmacia?: string;
  direccionFarmacia?: string;
  telefonoFarmacia?: string;
  emailFarmacia?: string;
  webFarmacia?: string;
  urlSolicitarCita?: string;
  urlWhatsapp?: string;
  urlTelefono?: string;
  logoFarmacia?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  colorAcento?: string;
  motivoRechazo?: string;
  [key: string]: string | undefined; // Para variables adicionales
}

interface ConfigEmail {
  provider: 'smtp' | 'resend';
  resendApiKey?: string;
  emailRemitente?: string;
  nombreRemitente?: string;
  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpAcceptSelfSigned?: boolean; // Para servidores con certificado autofirmado (p. ej. Raiola)
  smtpUser?: string;
  smtpPass?: string;
}

/** Un paso del diagnóstico de envío de correo (para mostrar al usuario) */
export interface PasoDiagnosticoEmail {
  paso: string;
  ok: boolean;
  mensaje?: string;
  sugerencia?: string;
}

/** Resultado del envío de prueba con diagnóstico paso a paso */
export interface ResultadoDiagnosticoEmail {
  enviado: boolean;
  pasos: PasoDiagnosticoEmail[];
  mensajeError?: string;
  sugerencia?: string;
}

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let smtpTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================

// ID fijo de la fila única de configuración (instalación local de una sola farmacia)
const CONFIG_ID = 'singleton';

/**
 * Obtiene la configuración de email: configuración de la instalación → variables de entorno
 */
async function obtenerConfigEmail(): Promise<ConfigEmail> {
  const config = await prisma.configuracion.findUnique({ where: { id: CONFIG_ID } });

  return {
    provider: (config?.emailProvider as 'smtp' | 'resend') ?? 'smtp',
    resendApiKey: config?.resendApiKey ?? process.env.RESEND_API_KEY ?? undefined,
    emailRemitente: config?.emailRemitente ?? process.env.SMTP_FROM ?? config?.farmaciaEmail ?? undefined,
    nombreRemitente: config?.emailNombreRemitente ?? config?.farmaciaNombre ?? 'Sistema de Gestión',
    smtpHost: config?.smtpHost ?? process.env.SMTP_HOST ?? undefined,
    smtpPort: config?.smtpPort ?? parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: config?.smtpSecure ?? process.env.SMTP_SECURE === 'true',
    smtpAcceptSelfSigned: config?.smtpAcceptSelfSigned ?? false,
    smtpUser: config?.smtpUser ?? process.env.SMTP_USER ?? undefined,
    smtpPass: config?.smtpPass ?? process.env.SMTP_PASS ?? undefined,
  };
}

// Credenciales de Ethereal para pruebas (se generan una vez)
let etherealCredentials: { user: string; pass: string } | null = null;

/**
 * Inicializa el transportador SMTP
 */
async function inicializarSMTP(config: ConfigEmail): Promise<nodemailer.Transporter | null> {
  if (smtpTransporter) return smtpTransporter;

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    // En desarrollo, crear cuenta de prueba en Ethereal
    console.warn('⚠️  Configuración SMTP incompleta. Usando Ethereal Email para pruebas...');
    
    try {
      // Generar cuenta de prueba de Ethereal solo una vez
      if (!etherealCredentials) {
        const testAccount = await nodemailer.createTestAccount();
        etherealCredentials = {
          user: testAccount.user,
          pass: testAccount.pass,
        };
        console.log('📧 Cuenta de prueba Ethereal creada:');
        console.log(`   Usuario: ${etherealCredentials.user}`);
        console.log(`   Los emails se pueden ver en: https://ethereal.email/login`);
      }
      
      smtpTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: etherealCredentials,
        tls: {
          // Ignorar errores de certificado en desarrollo (Ethereal)
          rejectUnauthorized: false,
        },
      });
      
      console.log('✅ Transportador Ethereal configurado (modo pruebas)');
    } catch (error) {
      console.error('❌ Error al crear cuenta Ethereal:', error);
      return null;
    }
    
    return smtpTransporter;
  }

  smtpTransporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    tls: { rejectUnauthorized: !config.smtpAcceptSelfSigned },
  });

  try {
    await smtpTransporter.verify();
    console.log('✅ Servidor SMTP configurado correctamente');
  } catch (error) {
    console.error('❌ Error al verificar SMTP:', error);
  }

  return smtpTransporter;
}

/**
 * Inicializa el cliente de Resend
 */
function inicializarResend(config: ConfigEmail): Resend | null {
  if (resendClient) return resendClient;

  if (!config.resendApiKey) {
    console.warn('⚠️  API Key de Resend no configurada.');
    return null;
  }

  resendClient = new Resend(config.resendApiKey);
  console.log('✅ Cliente Resend inicializado');
  return resendClient;
}

// ==========================================
// PLANTILLAS
// ==========================================

/**
 * Obtiene una plantilla de email por tipo
 */
async function obtenerPlantilla(tipo: string) {
  const plantilla = await prisma.plantillaEmail.findUnique({
    where: { tipo },
  });

  if (!plantilla || !plantilla.activa) {
    return null;
  }

  return plantilla;
}

/**
 * Reemplaza variables en el contenido de la plantilla
 * Variables soportadas: {{nombrePaciente}}, {{fechaCita}}, etc.
 */
function reemplazarVariables(contenido: string, datos: DatosEmail): string {
  let resultado = contenido;

  // Lista de todas las variables disponibles (incluye las de datos + extras)
  const variables: Record<string, string | undefined> = {
    nombrePaciente: datos.nombrePaciente,
    fechaCita: datos.fechaCita,
    horaCita: datos.horaCita,
    tipoServicio: datos.tipoServicio,
    nombreFarmacia: datos.nombreFarmacia,
    direccionFarmacia: datos.direccionFarmacia,
    telefonoFarmacia: datos.telefonoFarmacia,
    emailFarmacia: datos.emailFarmacia,
    webFarmacia: datos.webFarmacia,
    urlSolicitarCita: datos.urlSolicitarCita,
    urlWhatsapp: datos.urlWhatsapp,
    urlTelefono: datos.urlTelefono,
    logoFarmacia: datos.logoFarmacia,
    bloqueLogo: datos.logoFarmacia && datos.nombreFarmacia
      ? `<img src="${datos.logoFarmacia}" alt="${(datos.nombreFarmacia || '').replace(/"/g, '&quot;')}" style="max-height: 60px; display: block; margin: 0 auto;" />`
      : '',
    bloqueWhatsapp: datos.urlWhatsapp
      ? ` | <a href="${datos.urlWhatsapp}" style="color: #25d366;">Contactar por WhatsApp</a>`
      : '',
    bloqueTelefono: datos.urlTelefono
      ? ` | <a href="${datos.urlTelefono}">Llamar</a>`
      : '',
    colorPrimario: datos.colorPrimario,
    colorSecundario: datos.colorSecundario,
    colorAcento: datos.colorAcento,
    motivoRechazo: datos.motivoRechazo,
    anioActual: new Date().getFullYear().toString(),
  };

  // Reemplazar cada variable
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    resultado = resultado.replace(regex, value || '');
  }

  return resultado;
}

/**
 * Genera versión texto plano desde HTML
 */
function htmlATexto(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// ==========================================
// DATOS DE FARMACIA
// ==========================================

/** Colores por defecto cuando no hay tema/colores configurados (alineados con frontend) */
const COLORES_DEFAULT = {
  primario: '#79438f',
  secundario: '#4a7484',
  acento: '#79438f',
};

/**
 * Temas preconfigurados: DEBEN coincidir con TEMAS_PRECONFIGURADOS de
 * src/lib/coloresMarca.ts (frontend). Los emails ponen texto blanco sobre
 * primario y secundario, que en todos los temas tienen contraste suficiente.
 */
const TEMAS_PRECONFIGURADOS: Record<string, { primario: string; secundario: string; acento: string }> = {
  default: { primario: '#79438f', secundario: '#4a7484', acento: '#79438f' },
  porDefecto: { primario: '#79438f', secundario: '#4a7484', acento: '#79438f' },
  verdeFarmacia: { primario: '#3e551b', secundario: '#56732b', acento: '#a4c639' },
  verde: { primario: '#0c7f75', secundario: '#0f766e', acento: '#0c7f75' },
  azul: { primario: '#2563eb', secundario: '#1d4ed8', acento: '#2563eb' },
  oceano: { primario: '#0b4f6c', secundario: '#1a6f8a', acento: '#2bb3a8' },
  pizarraAmbar: { primario: '#334155', secundario: '#475569', acento: '#f59e0b' },
  burdeos: { primario: '#7a1f3d', secundario: '#8f4a5e', acento: '#d4a373' },
  terracota: { primario: '#8c3f26', secundario: '#56695a', acento: '#e07a5f' },
};

/**
 * Obtiene los colores de marca según tema y colores personalizados
 */
function obtenerColoresMarca(config: {
  temaActivo?: string | null;
  coloresMarca?: string | null;
} | null): { primario: string; secundario: string; acento: string } {
  if (!config) return { ...COLORES_DEFAULT };
  const tema = config.temaActivo || 'default';
  let colores = config.temaActivo === 'custom' && config.coloresMarca
    ? ((): Record<string, string> => {
        try {
          return typeof config.coloresMarca === 'string'
            ? (JSON.parse(config.coloresMarca) as Record<string, string>)
            : (config.coloresMarca as unknown as Record<string, string>) ?? {};
        } catch {
          return {};
        }
      })()
    : TEMAS_PRECONFIGURADOS[tema];
  if (!colores) colores = TEMAS_PRECONFIGURADOS.default;
  return {
    primario: colores.primario ?? COLORES_DEFAULT.primario,
    secundario: colores.secundario ?? COLORES_DEFAULT.secundario,
    acento: colores.acento ?? colores.primario ?? COLORES_DEFAULT.acento,
  };
}

export interface DatosFarmaciaParaEmail {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  web: string;
  urlSolicitarCita: string;
  urlWhatsapp: string;
  urlTelefono: string;
  logoFarmacia: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
}

/**
 * Obtiene los datos de la farmacia desde la configuración de la instalación
 * Incluye logo, colores de marca y enlaces WhatsApp/teléfono
 */
async function obtenerDatosFarmacia(): Promise<DatosFarmaciaParaEmail> {
  const config = await prisma.configuracion.findUnique({ where: { id: CONFIG_ID } });

  const direccion = config?.farmaciaDireccion || '';
  const ciudad = config?.farmaciaCiudad || '';
  const telefono = config?.farmaciaTelefono || '';
  const whatsapp = config?.farmaciaWhatsapp || '';

  // El logo se guarda siempre como data: URI (base64) desde el formulario de Configuración
  const logoFarmacia = config?.farmaciaLogo || '';

  // URL solicitar cita: usa la web configurada de la farmacia (no hay reserva pública en este backend)
  const urlSolicitarCita = config?.farmaciaWeb || '';

  // WhatsApp: https://wa.me/34XXXXXXXXX (sin + ni espacios)
  const urlWhatsapp = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}`
    : '';

  // Teléfono: tel:+34...
  const urlTelefono = telefono
    ? `tel:${telefono.replace(/\s/g, '')}`
    : '';

  const colores = obtenerColoresMarca(config);

  return {
    nombre: config?.farmaciaNombre || 'Tu Farmacia',
    direccion,
    ciudad,
    telefono,
    email: config?.farmaciaEmail || '',
    web: config?.farmaciaWeb || '',
    urlSolicitarCita,
    urlWhatsapp,
    urlTelefono,
    logoFarmacia,
    colorPrimario: colores.primario,
    colorSecundario: colores.secundario,
    colorAcento: colores.acento,
  };
}

/**
 * Formatea la fecha para mostrar en el email
 */
function formatearFecha(fecha: string): string {
  const fechaObj = new Date(fecha);
  const opciones: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return fechaObj.toLocaleDateString('es-ES', opciones);
}

/**
 * Obtiene el nombre del tipo de servicio en español
 */
function obtenerNombreTipoServicio(tipo: string): string {
  const nombres: Record<string, string> = {
    dermo: 'Dermocosmética',
    bio: 'Análisis Bioquímico',
    consulta: 'Consulta General',
    seguimiento: 'Seguimiento',
  };
  return nombres[tipo] || tipo;
}

/** Datos básicos de cita para construir DatosEmail */
interface DatosCitaBase {
  nombreCliente: string;
  fecha: string;
  hora: string;
  tipo: string;
  motivoRechazo?: string;
}

/**
 * Construye DatosEmail completos con logo, colores y enlaces (WhatsApp, teléfono, solicitar cita).
 */
async function obtenerDatosEmailCompletos(datosCita: DatosCitaBase): Promise<DatosEmail> {
  const datosFarmacia = await obtenerDatosFarmacia();

  const direccionCompleta = [datosFarmacia.direccion, datosFarmacia.ciudad].filter(Boolean).join(', ');

  return {
    nombrePaciente: datosCita.nombreCliente,
    fechaCita: formatearFecha(datosCita.fecha),
    horaCita: datosCita.hora,
    tipoServicio: obtenerNombreTipoServicio(datosCita.tipo),
    nombreFarmacia: datosFarmacia.nombre,
    direccionFarmacia: direccionCompleta,
    telefonoFarmacia: datosFarmacia.telefono,
    emailFarmacia: datosFarmacia.email,
    webFarmacia: datosFarmacia.web,
    urlSolicitarCita: datosFarmacia.urlSolicitarCita,
    urlWhatsapp: datosFarmacia.urlWhatsapp,
    urlTelefono: datosFarmacia.urlTelefono,
    logoFarmacia: datosFarmacia.logoFarmacia,
    colorPrimario: datosFarmacia.colorPrimario,
    colorSecundario: datosFarmacia.colorSecundario,
    colorAcento: datosFarmacia.colorAcento,
    motivoRechazo: datosCita.motivoRechazo,
  };
}

// ==========================================
// ENVÍO DE EMAILS
// ==========================================

/**
 * Envía un email usando el proveedor configurado de la farmacia
 */
async function enviarEmail(
  destinatario: string,
  asunto: string,
  html: string,
  texto?: string
): Promise<boolean> {
  const config = await obtenerConfigEmail();

  try {
    if (config.provider === 'resend' && config.resendApiKey) {
      // Usar Resend
      const resend = inicializarResend(config);
      if (!resend) {
        console.warn('⚠️  Resend no disponible, intentando SMTP...');
        return enviarConSMTP(config, destinatario, asunto, html, texto);
      }

      const { error } = await resend.emails.send({
        from: `${config.nombreRemitente} <${config.emailRemitente || 'noreply@sistema.local'}>`,
        to: destinatario,
        subject: asunto,
        html: html,
        text: texto || htmlATexto(html),
      });

      if (error) {
        console.error('❌ Error Resend:', error);
        // Fallback a SMTP
        return enviarConSMTP(config, destinatario, asunto, html, texto);
      }

      console.log(`✅ Email enviado vía Resend a ${destinatario}`);
      return true;
    } else {
      // Usar SMTP
      return enviarConSMTP(config, destinatario, asunto, html, texto);
    }
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return false;
  }
}

/**
 * Envía email usando SMTP/Nodemailer
 */
async function enviarConSMTP(
  config: ConfigEmail,
  destinatario: string,
  asunto: string,
  html: string,
  texto?: string
): Promise<boolean> {
  try {
    const transporter = await inicializarSMTP(config);
    if (!transporter) {
      console.error('❌ No se pudo inicializar el transportador SMTP');
      return false;
    }

    const from = config.emailRemitente || config.smtpUser || 'noreply@sistema.local';

    const info = await transporter.sendMail({
      from: `"${config.nombreRemitente}" <${from}>`,
      to: destinatario,
      subject: asunto,
      text: texto || htmlATexto(html),
      html: html,
    });

    console.log(`✅ Email enviado vía SMTP a ${destinatario}`);
    
    // Si es Ethereal, mostrar enlace de preview
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📬 Preview del email (Ethereal):');
      console.log(`   ${previewUrl}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error SMTP:', error);
    return false;
  }
}

/**
 * Envía un email SMTP con un transportador temporal (no cachea)
 * Para correo de prueba sin afectar el transportador global
 */
async function enviarConSMTPTemporal(
  config: ConfigEmail,
  destinatario: string,
  asunto: string,
  html: string,
  texto?: string
): Promise<boolean> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.error('❌ Configuración SMTP incompleta para prueba');
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure ?? false,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      tls: { rejectUnauthorized: !config.smtpAcceptSelfSigned },
    });
    const from = config.emailRemitente || config.smtpUser || 'noreply@sistema.local';
    await transporter.sendMail({
      from: `"${config.nombreRemitente}" <${from}>`,
      to: destinatario,
      subject: asunto,
      text: texto || htmlATexto(html),
      html,
    });
    console.log(`✅ Email de prueba enviado vía SMTP a ${destinatario}`);
    return true;
  } catch (error) {
    console.error('❌ Error SMTP (prueba):', error);
    return false;
  }
}

/**
 * Clasifica un error SMTP para saber si falló la conexión (host/puerto) o la autenticación (usuario/contraseña)
 */
function clasificarErrorSMTP(error: unknown): 'conexion' | 'autenticacion' | 'otro' {
  const err = error as NodeJS.ErrnoException & { responseCode?: number };
  const code = err?.code ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ESOCKET'].includes(code)) return 'conexion';
  if (code === 'EAUTH' || err?.responseCode === 535 || msg.includes('invalid login') || msg.includes('authentication failed')) return 'autenticacion';
  return 'otro';
}

/**
 * Convierte un error de nodemailer/Node a mensaje y sugerencia en lenguaje claro
 */
function mapearErrorSMTP(error: unknown): { mensaje: string; sugerencia: string } {
  const err = error as NodeJS.ErrnoException & { code?: string; response?: string; responseCode?: number };
  const code = err?.code ?? '';
  const msg = (err?.message ?? '').toLowerCase();

  switch (code) {
    case 'ECONNREFUSED':
      return {
        mensaje: 'No se puede conectar con el servidor de correo.',
        sugerencia: 'Comprueba el host y el puerto (p. ej. smtp.gmail.com y 587). Asegúrate de que el servidor esté accesible y no bloqueado por un firewall.',
      };
    case 'ETIMEDOUT':
      return {
        mensaje: 'El servidor de correo no responde a tiempo.',
        sugerencia:
          'Si la app está en un hosting (p. ej. Render), el servidor SMTP puede no aceptar conexiones desde sus IPs o el puerto 465 puede estar bloqueado. Prueba usar Resend en producción o configura el firewall del servidor de correo para permitir conexiones desde el hosting.',
      };
    case 'EAUTH':
    case 'EENVELOPE':
      return {
        mensaje: 'Usuario o contraseña incorrectos.',
        sugerencia: 'Comprueba el usuario y la contraseña SMTP. En Gmail/Outlook suele ser necesario usar una contraseña de aplicación, no la contraseña de tu cuenta.',
      };
    case 'ESOCKET':
      if (msg.includes('self-signed') || msg.includes('certificate')) {
        return {
          mensaje: 'El servidor usa un certificado SSL autofirmado o no verificado.',
          sugerencia: 'Activa la opción "Aceptar certificado autofirmado" en la configuración SMTP para servidores como Raiola o correo propio.',
        };
      }
      return {
        mensaje: 'Error de conexión con el servidor.',
        sugerencia: 'Revisa el host, el puerto (587 para TLS, 465 para SSL) y que el servidor SMTP esté activo. Prueba con "Seguro (TLS)" activado o desactivado según tu proveedor.',
      };
    default:
      if (msg.includes('self-signed') || msg.includes('certificate')) {
        return {
          mensaje: 'El servidor usa un certificado SSL autofirmado o no verificado.',
          sugerencia: 'Activa la opción "Aceptar certificado autofirmado" en la configuración SMTP.',
        };
      }
      if (msg.includes('invalid login') || msg.includes('authentication') || (err?.responseCode === 535)) {
        return {
          mensaje: 'Usuario o contraseña incorrectos.',
          sugerencia: 'Comprueba el usuario y la contraseña SMTP. Si usas Gmail, genera una contraseña de aplicación en la cuenta de Google.',
        };
      }
      if (msg.includes('timeout') || msg.includes('timed out')) {
        return {
          mensaje: 'El servidor tardó demasiado en responder.',
          sugerencia: 'Comprueba la conexión a internet y que el host/puerto del servidor SMTP sean correctos.',
        };
      }
      return {
        mensaje: 'Error al conectar o enviar el correo.',
        sugerencia: 'Revisa la configuración SMTP (host, puerto, usuario, contraseña) y los logs del servidor si tienes acceso.',
      };
  }
}

/**
 * Convierte un error de Resend a mensaje y sugerencia en lenguaje claro
 */
function mapearErrorResend(error: { message?: string; name?: string }): { mensaje: string; sugerencia: string } {
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('invalid') && (msg.includes('api') || msg.includes('key'))) {
    return {
      mensaje: 'Clave API de Resend incorrecta o no válida.',
      sugerencia: 'Comprueba que la clave API en Resend sea la correcta y que no esté revocada. Genera una nueva en el panel de Resend si es necesario.',
    };
  }
  if (msg.includes('domain') || msg.includes('sender')) {
    return {
      mensaje: 'El remitente o dominio no está autorizado.',
      sugerencia: 'En Resend, verifica que el dominio esté verificado o usa el dominio de prueba. Comprueba el email remitente configurado.',
    };
  }
  if (msg.includes('rate') || msg.includes('limit')) {
    return {
      mensaje: 'Límite de envíos alcanzado.',
      sugerencia: 'Resend tiene límites por plan. Espera un momento o revisa el uso en tu cuenta de Resend.',
    };
  }
  return {
    mensaje: 'Error al enviar con Resend.',
    sugerencia: 'Revisa la clave API y la configuración del remitente en Resend.',
  };
}

/**
 * Envía un correo de prueba y devuelve un diagnóstico paso a paso para mostrar al usuario
 */
export async function enviarCorreoPruebaPlataformaConDiagnostico(destinatario: string): Promise<ResultadoDiagnosticoEmail> {
  const pasos: PasoDiagnosticoEmail[] = [];

  // Paso 1: Obtener configuración
  let config: ConfigEmail;
  try {
    config = await obtenerConfigEmail();
    pasos.push({ paso: 'Obtener configuración de correo', ok: true });
  } catch (e) {
    pasos.push({
      paso: 'Obtener configuración de correo',
      ok: false,
      mensaje: 'No se pudo cargar la configuración.',
      sugerencia: 'Guarda primero la configuración SMTP o Resend en esta página.',
    });
    return { enviado: false, pasos, mensajeError: 'No se pudo cargar la configuración.', sugerencia: 'Guarda primero la configuración en esta página.' };
  }

  // Paso 2: Comprobar datos según proveedor
  if (config.provider === 'resend') {
    const tieneResend = !!(config.resendApiKey && config.resendApiKey !== '********');
    if (!tieneResend) {
      pasos.push(
        { paso: 'Comprobar datos de conexión', ok: true },
        {
          paso: 'Enviar correo con Resend',
          ok: false,
          mensaje: 'Falta la clave API de Resend.',
          sugerencia: 'Introduce tu clave API de Resend en el campo correspondiente y guarda la configuración.',
        }
      );
      return {
        enviado: false,
        pasos,
        mensajeError: 'Falta la clave API de Resend.',
        sugerencia: 'Introduce tu clave API de Resend y guarda la configuración.',
      };
    }
    pasos.push({ paso: 'Comprobar datos de conexión (Resend)', ok: true });
  } else {
    const tieneSMTP = !!(config.smtpHost && config.smtpUser && config.smtpPass);
    if (!tieneSMTP) {
      pasos.push(
        { paso: 'Comprobar datos de conexión', ok: false, mensaje: 'Faltan datos SMTP.', sugerencia: 'Completa al menos servidor (host), usuario y contraseña SMTP.' }
      );
      return {
        enviado: false,
        pasos,
        mensajeError: 'Faltan datos SMTP (servidor, usuario o contraseña).',
        sugerencia: 'Completa todos los campos SMTP y guarda la configuración.',
      };
    }
    pasos.push({ paso: 'Comprobar datos de conexión (SMTP)', ok: true });
  }

  const asunto = 'Correo de prueba - Configuración SMTP';
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Prueba</title></head>
<body style="font-family: sans-serif; padding: 20px;">
  <p>Este es un correo de prueba de la configuración SMTP de la plataforma.</p>
  <p>Si lo recibes, la configuración es correcta.</p>
  <p><em>Enviado el ${new Date().toLocaleString('es-ES')}</em></p>
</body>
</html>`;
  const texto = 'Correo de prueba de la configuración SMTP. Si lo recibes, la configuración es correcta.';

  // Paso 3: Enviar
  if (config.provider === 'resend' && config.resendApiKey && config.resendApiKey !== '********') {
    const resend = inicializarResend(config);
    if (!resend) {
      pasos.push({
        paso: 'Enviar correo con Resend',
        ok: false,
        mensaje: 'No se pudo inicializar Resend.',
        sugerencia: 'Comprueba que la clave API sea válida.',
      });
      return { enviado: false, pasos, mensajeError: 'No se pudo inicializar Resend.', sugerencia: 'Comprueba la clave API.' };
    }
    const { error } = await resend.emails.send({
      from: `${config.nombreRemitente} <${config.emailRemitente || 'noreply@sistema.local'}>`,
      to: destinatario,
      subject: asunto,
      html,
      text: texto,
    });
    if (error) {
      const { mensaje, sugerencia } = mapearErrorResend(error);
      pasos.push({ paso: 'Enviar correo con Resend', ok: false, mensaje, sugerencia });
      return { enviado: false, pasos, mensajeError: mensaje, sugerencia };
    }
    pasos.push({ paso: 'Enviar correo con Resend', ok: true });
    return { enviado: true, pasos };
  }

  // SMTP: primero verify() para distinguir fallo de conexión (host/puerto) de fallo de autenticación (usuario/contraseña)
  const acceptSelfSigned = config.smtpAcceptSelfSigned === true;
  if (config.smtpHost) {
    console.log('[SMTP prueba] host:', config.smtpHost, '| aceptar certificado autofirmado:', acceptSelfSigned);
  }
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort ?? 587,
    secure: config.smtpSecure ?? false,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    tls: { rejectUnauthorized: !acceptSelfSigned },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
  });

  try {
    await transporter.verify();
  } catch (error) {
    const tipo = clasificarErrorSMTP(error);
    const { mensaje, sugerencia } = mapearErrorSMTP(error);
    if (tipo === 'conexion') {
      pasos.push({
        paso: 'Conectar con el servidor (host y puerto)',
        ok: false,
        mensaje,
        sugerencia,
      });
      return { enviado: false, pasos, mensajeError: mensaje, sugerencia };
    }
    if (tipo === 'autenticacion') {
      pasos.push({ paso: 'Conectar con el servidor (host y puerto)', ok: true });
      pasos.push({
        paso: 'Autenticación (usuario y contraseña)',
        ok: false,
        mensaje,
        sugerencia,
      });
      return { enviado: false, pasos, mensajeError: mensaje, sugerencia };
    }
    pasos.push({
      paso: 'Conectar con el servidor (host y puerto)',
      ok: false,
      mensaje,
      sugerencia,
    });
    return { enviado: false, pasos, mensajeError: mensaje, sugerencia };
  }

  pasos.push({ paso: 'Conectar con el servidor (host y puerto)', ok: true });
  pasos.push({ paso: 'Autenticación (usuario y contraseña)', ok: true });

  try {
    const from = config.emailRemitente || config.smtpUser || 'noreply@sistema.local';
    await transporter.sendMail({
      from: `"${config.nombreRemitente}" <${from}>`,
      to: destinatario,
      subject: asunto,
      text: texto,
      html,
    });
    pasos.push({ paso: 'Enviar correo', ok: true });
    console.log(`✅ Email de prueba enviado vía SMTP a ${destinatario}`);
    return { enviado: true, pasos };
  } catch (error) {
    const { mensaje, sugerencia } = mapearErrorSMTP(error);
    pasos.push({ paso: 'Enviar correo', ok: false, mensaje, sugerencia });
    return { enviado: false, pasos, mensajeError: mensaje, sugerencia };
  }
}

/**
 * Envía un email usando una config dada (sin usar el transportador cacheado)
 * Usado para correo de prueba desde el panel para no afectar el envío normal
 */
async function enviarEmailConConfig(
  config: ConfigEmail,
  destinatario: string,
  asunto: string,
  html: string,
  texto?: string
): Promise<boolean> {
  try {
    if (config.provider === 'resend' && config.resendApiKey) {
      const resend = inicializarResend(config);
      if (!resend) return enviarConSMTPTemporal(config, destinatario, asunto, html, texto);
      const { error } = await resend.emails.send({
        from: `${config.nombreRemitente} <${config.emailRemitente || 'noreply@sistema.local'}>`,
        to: destinatario,
        subject: asunto,
        html,
        text: texto || htmlATexto(html),
      });
      if (error) {
        console.error('❌ Error Resend:', error);
        return enviarConSMTPTemporal(config, destinatario, asunto, html, texto);
      }
      console.log(`✅ Email de prueba enviado vía Resend a ${destinatario}`);
      return true;
    }
    return enviarConSMTPTemporal(config, destinatario, asunto, html, texto);
  } catch (error) {
    console.error('❌ Error al enviar email de prueba:', error);
    return false;
  }
}

// ==========================================
// FUNCIONES PÚBLICAS DE ENVÍO
// ==========================================

/**
 * Envía un correo de prueba usando la configuración de la instalación
 * Usado desde el panel de configuración para verificar SMTP/Resend
 */
export async function enviarCorreoPruebaPlataforma(destinatario: string): Promise<boolean> {
  const config = await obtenerConfigEmail();
  const asunto = 'Correo de prueba - Configuración SMTP';
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Prueba</title></head>
<body style="font-family: sans-serif; padding: 20px;">
  <p>Este es un correo de prueba de la configuración SMTP de la plataforma.</p>
  <p>Si lo recibes, la configuración es correcta.</p>
  <p><em>Enviado el ${new Date().toLocaleString('es-ES')}</em></p>
</body>
</html>`;
  const texto = 'Correo de prueba de la configuración SMTP. Si lo recibes, la configuración es correcta.';
  return enviarEmailConConfig(config, destinatario, asunto, html, texto);
}

// ==========================================
// FUNCIONES PÚBLICAS DE ENVÍO
// ==========================================

/**
 * Envía email de confirmación de cita con botones de acción
 */
export async function enviarConfirmacionCita(
  emailDestinatario: string,
  datosCita: {
    citaId: string;
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
  }
): Promise<boolean> {
  try {
    // Preparar datos para la plantilla (incluye logo, colores, WhatsApp, teléfono, urlSolicitarCita)
    const datos = await obtenerDatosEmailCompletos(datosCita);

    const plantilla = await obtenerPlantilla('confirmacion');

    let html: string;
    let asunto: string;

    if (plantilla) {
      html = reemplazarVariables(plantilla.contenidoHtml, datos);
      asunto = reemplazarVariables(plantilla.asunto, datos);
    } else {
      // Plantilla por defecto si no existe en BD
      html = generarPlantillaConfirmacionDefault(datos);
      asunto = `Confirmación de cita - ${datos.tipoServicio}`;
    }

    const enviado = await enviarEmail(emailDestinatario, asunto, html);

    if (enviado) {
      // Marcar cita como email de confirmación enviado
      await prisma.cita.update({
        where: { id: datosCita.citaId },
        data: { confirmacionEnviada: true },
      });
    }

    return enviado;
  } catch (error) {
    console.error('❌ Error al enviar email de confirmación:', error);
    return false;
  }
}

/**
 * Envía email de recordatorio de cita
 */
export async function enviarRecordatorioCita(
  emailDestinatario: string,
  datosCita: {
    citaId: string;
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
  }
): Promise<boolean> {
  try {
    const datos = await obtenerDatosEmailCompletos(datosCita);

    const plantilla = await obtenerPlantilla('recordatorio');

    let html: string;
    let asunto: string;

    if (plantilla) {
      html = reemplazarVariables(plantilla.contenidoHtml, datos);
      asunto = reemplazarVariables(plantilla.asunto, datos);
    } else {
      html = generarPlantillaRecordatorioDefault(datos);
      asunto = `Recordatorio: Tu cita es mañana - ${datos.tipoServicio}`;
    }

    const enviado = await enviarEmail(emailDestinatario, asunto, html);

    if (enviado) {
      await prisma.cita.update({
        where: { id: datosCita.citaId },
        data: { recordatorioEnviado: true },
      });
    }

    return enviado;
  } catch (error) {
    console.error('❌ Error al enviar recordatorio:', error);
    return false;
  }
}

/**
 * Envía email de cancelación de cita
 */
export async function enviarCancelacionCita(
  emailDestinatario: string,
  datosCita: {
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
    motivoRechazo?: string;
    citaId?: string;
  }
): Promise<boolean> {
  try {
    const datos = await obtenerDatosEmailCompletos(datosCita);

    const plantilla = await obtenerPlantilla('cancelacion');

    let html: string;
    let asunto: string;

    if (plantilla) {
      html = reemplazarVariables(plantilla.contenidoHtml, datos);
      asunto = reemplazarVariables(plantilla.asunto, datos);
    } else {
      html = generarPlantillaCancelacionDefault(datos);
      asunto = `Cita cancelada - ${datos.tipoServicio}`;
    }

    return await enviarEmail(emailDestinatario, asunto, html);
  } catch (error) {
    console.error('❌ Error al enviar cancelación:', error);
    return false;
  }
}

/**
 * Envía email de modificación de cita
 */
export async function enviarModificacionCita(
  emailDestinatario: string,
  datosCita: {
    citaId: string;
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
  }
): Promise<boolean> {
  try {
    const datos = await obtenerDatosEmailCompletos(datosCita);

    const plantilla = await obtenerPlantilla('modificacion');

    let html: string;
    let asunto: string;

    if (plantilla) {
      html = reemplazarVariables(plantilla.contenidoHtml, datos);
      asunto = reemplazarVariables(plantilla.asunto, datos);
    } else {
      html = generarPlantillaModificacionDefault(datos);
      asunto = `Tu cita ha sido modificada - ${datos.tipoServicio}`;
    }

    return await enviarEmail(emailDestinatario, asunto, html);
  } catch (error) {
    console.error('❌ Error al enviar modificación:', error);
    return false;
  }
}

/**
 * Envía email de invitación para que un nuevo usuario establezca su contraseña
 */
export async function enviarInvitacionUsuario(
  emailDestinatario: string,
  nombreUsuario: string,
  nombreFarmacia: string,
  urlEstablecerContrasena: string
): Promise<boolean> {
  const asunto = `Crea tu contraseña - ${nombreFarmacia}`;
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #79438f; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">Invitación a la plataforma</h1>
  </div>
  <div style="background-color: white; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hola <strong>${nombreUsuario}</strong>,</p>
    <p>Te han invitado a formar parte del equipo de <strong>${nombreFarmacia}</strong> en la plataforma de gestión.</p>
    <p>Haz clic en el siguiente enlace para crear tu contraseña y acceder a tu cuenta:</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${urlEstablecerContrasena}" style="display: inline-block; background-color: #79438f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Crear mi contraseña</a>
    </p>
    <p style="color: #666; font-size: 14px;">Este enlace caduca en 7 días. Si no has solicitado esta invitación, puedes ignorar este correo.</p>
  </div>
</body>
</html>`;
  const texto = `Hola ${nombreUsuario}, te han invitado a ${nombreFarmacia}. Crea tu contraseña aquí: ${urlEstablecerContrasena}. El enlace caduca en 7 días.`;
  return enviarEmail(emailDestinatario, asunto, html, texto);
}

// ==========================================
// FELICITACIÓN DE CUMPLEAÑOS
// ==========================================

/**
 * Envía la felicitación de cumpleaños al paciente con la plantilla
 * "cumpleanos" (editable en Configuración) o, si no existe, la de por defecto.
 * Si la plantilla está desactivada no se envía nada.
 */
export async function enviarFelicitacionCumpleanos(emailDestinatario: string, nombrePaciente: string): Promise<boolean> {
  try {
    const datosFarmacia = await obtenerDatosFarmacia();
    const datos: DatosEmail = {
      nombrePaciente,
      // Campos de cita: no aplican a una felicitación
      fechaCita: '',
      horaCita: '',
      tipoServicio: '',
      nombreFarmacia: datosFarmacia.nombre,
      direccionFarmacia: [datosFarmacia.direccion, datosFarmacia.ciudad].filter(Boolean).join(', '),
      telefonoFarmacia: datosFarmacia.telefono,
      emailFarmacia: datosFarmacia.email,
      webFarmacia: datosFarmacia.web,
      urlSolicitarCita: datosFarmacia.urlSolicitarCita,
      urlWhatsapp: datosFarmacia.urlWhatsapp,
      urlTelefono: datosFarmacia.urlTelefono,
      logoFarmacia: datosFarmacia.logoFarmacia,
      colorPrimario: datosFarmacia.colorPrimario,
      colorSecundario: datosFarmacia.colorSecundario,
      colorAcento: datosFarmacia.colorAcento,
    };

    const existente = await prisma.plantillaEmail.findUnique({ where: { tipo: 'cumpleanos' } });
    if (existente && !existente.activa) {
      console.log('ℹ️  Plantilla de cumpleaños desactivada: no se envía la felicitación');
      return false;
    }

    const html = existente
      ? reemplazarVariables(existente.contenidoHtml, datos)
      : generarPlantillaCumpleanosDefault(datos);
    const asunto = existente
      ? reemplazarVariables(existente.asunto, datos)
      : `¡Feliz cumpleaños, ${nombrePaciente}!`;

    return await enviarEmail(emailDestinatario, asunto, html);
  } catch (error) {
    console.error('❌ Error al enviar felicitación de cumpleaños:', error);
    return false;
  }
}

// ==========================================
// PLANTILLAS POR DEFECTO
// ==========================================

/** Genera bloque logo y contactos para plantillas default */
function bloquesDesdeDatos(datos: DatosEmail) {
  const logo = datos.logoFarmacia && datos.nombreFarmacia
    ? `<div style="text-align: center; padding: 16px 0;"><img src="${datos.logoFarmacia}" alt="${(datos.nombreFarmacia || '').replace(/"/g, '&quot;')}" style="max-height: 60px; display: block; margin: 0 auto;" /></div>`
    : '';
  const whatsapp = datos.urlWhatsapp ? ` | <a href="${datos.urlWhatsapp}" style="color: #25d366;">Contactar por WhatsApp</a>` : '';
  const telefono = datos.urlTelefono ? ` | <a href="${datos.urlTelefono}">Llamar</a>` : '';
  const color = datos.colorPrimario || '#79438f';
  return { logo, whatsapp, telefono, color };
}

/**
 * Genera plantilla HTML de confirmación por defecto
 */
function generarPlantillaConfirmacionDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono, color } = bloquesDesdeDatos(datos);
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: ${color}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">✅ Cita Confirmada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    
    <p>Tu cita ha sido confirmada correctamente. Aquí tienes los detalles:</p>
    
    <div style="background-color: #f8f4fa; padding: 20px; margin: 20px 0; border-left: 4px solid ${color}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> ${datos.tipoServicio}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación.</p>
    
    <div style="text-align: center; margin: 30px 0;">
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">✉️ ${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © ${new Date().getFullYear()} ${datos.nombreFarmacia}. Todos los derechos reservados.
  </p>
</body>
</html>`;
}

/**
 * Genera plantilla HTML de recordatorio por defecto
 */
function generarPlantillaRecordatorioDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono } = bloquesDesdeDatos(datos);
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: #f59e0b; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⏰ Recordatorio de Cita</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    
    <p>Te recordamos que tienes una cita programada para <strong>mañana</strong>:</p>
    
    <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> ${datos.tipoServicio}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación. Si no puedes asistir, te agradecemos que nos lo comuniques.</p>
    
    <div style="text-align: center; margin: 30px 0;">
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">✉️ ${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © ${new Date().getFullYear()} ${datos.nombreFarmacia}
  </p>
</body>
</html>`;
}

/**
 * Genera plantilla HTML de cancelación por defecto
 */
function generarPlantillaCancelacionDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono, color } = bloquesDesdeDatos(datos);
  const urlSolicitar = datos.urlSolicitarCita || datos.webFarmacia || '#';
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Cancelada</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: #ef4444; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">❌ Cita Cancelada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    
    <p>Lamentamos informarte que tu cita ha sido cancelada:</p>
    
    <div style="background-color: #fef2f2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> ${datos.tipoServicio}</p>
      ${datos.motivoRechazo ? `<p style="margin: 10px 0 0 0;"><strong>Motivo:</strong> ${datos.motivoRechazo}</p>` : ''}
    </div>
    
    <p>Si deseas reagendar tu cita, puedes contactarnos o visitar nuestra página de solicitud de citas.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${urlSolicitar}" style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Solicitar nueva cita</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">✉️ ${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © ${new Date().getFullYear()} ${datos.nombreFarmacia}
  </p>
</body>
</html>`;
}

/**
 * Genera plantilla HTML de modificación por defecto
 */
function generarPlantillaModificacionDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono } = bloquesDesdeDatos(datos);
  const colorSec = datos.colorSecundario || COLORES_DEFAULT.secundario;
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Modificada</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: ${colorSec}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">📝 Cita Modificada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    
    <p>Tu cita ha sido modificada. Aquí tienes los nuevos detalles:</p>
    
    <div style="background-color: #eff6ff; padding: 20px; margin: 20px 0; border-left: 4px solid ${colorSec}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Nueva fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>🕐 Nueva hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> ${datos.tipoServicio}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación.</p>
    
    <div style="text-align: center; margin: 30px 0;">
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">✉️ ${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © ${new Date().getFullYear()} ${datos.nombreFarmacia}
  </p>
</body>
</html>`;
}

/**
 * Genera plantilla HTML de felicitación de cumpleaños por defecto
 */
function generarPlantillaCumpleanosDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono, color } = bloquesDesdeDatos(datos);
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 10px; overflow: hidden;">
    ${logo}
    <div style="background: ${color}; color: white; padding: 28px; text-align: center;">
      <p style="font-size: 40px; margin: 0;">🎉</p>
      <h1 style="margin: 8px 0 0; font-size: 26px;">¡Feliz cumpleaños, ${datos.nombrePaciente}!</h1>
    </div>
    <div style="padding: 28px; text-align: center;">
      <p>Todo el equipo de <strong>${datos.nombreFarmacia}</strong> te desea un día estupendo.</p>
      <p>Gracias por confiar en nosotros para cuidar de tu salud.</p>
    </div>
    <div style="padding: 16px 28px; border-top: 1px solid #eee; font-size: 13px; color: #666; text-align: center;">
      ${datos.nombreFarmacia}${datos.direccionFarmacia ? ` · ${datos.direccionFarmacia}` : ''}${telefono}${whatsapp}
    </div>
  </div>
</body>
</html>`;
}
