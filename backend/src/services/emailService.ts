/**
 * Servicio de Email con soporte dual: Resend + SMTP (Nodemailer)
 * Carga plantillas dinámicas desde la base de datos
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma.js';
import { generarTokensAccionCita, construirUrlsAccion, type TipoAccionCita } from './tokenService.js';

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
  urlConfirmar?: string;
  urlModificar?: string;
  urlCancelar?: string;
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

/**
 * Obtiene la configuración de email: farmacia → ConfiguracionPlataforma → variables de entorno
 */
async function obtenerConfigEmail(farmaciaId: string): Promise<ConfigEmail> {
  const [config, configPlataforma] = await Promise.all([
    prisma.configuracion.findUnique({ where: { farmaciaId } }),
    prisma.configuracionPlataforma.findFirst({ orderBy: { createdAt: 'asc' } }),
  ]);

  return {
    provider: (config?.emailProvider as 'smtp' | 'resend') ?? configPlataforma?.emailProvider ?? 'smtp',
    resendApiKey: config?.resendApiKey ?? configPlataforma?.resendApiKey ?? process.env.RESEND_API_KEY ?? undefined,
    emailRemitente: config?.emailRemitente ?? configPlataforma?.smtpFrom ?? process.env.SMTP_FROM ?? config?.farmaciaEmail ?? undefined,
    nombreRemitente: config?.emailNombreRemitente ?? configPlataforma?.emailNombreRemitente ?? config?.farmaciaNombre ?? 'Sistema de Gestión',
    smtpHost: config?.smtpHost ?? configPlataforma?.smtpHost ?? process.env.SMTP_HOST ?? undefined,
    smtpPort: config?.smtpPort ?? configPlataforma?.smtpPort ?? parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: config?.smtpSecure ?? configPlataforma?.smtpSecure ?? process.env.SMTP_SECURE === 'true',
    smtpUser: config?.smtpUser ?? configPlataforma?.smtpUser ?? process.env.SMTP_USER ?? undefined,
    smtpPass: config?.smtpPass ?? configPlataforma?.smtpPass ?? process.env.SMTP_PASS ?? undefined,
  };
}

/**
 * Obtiene la configuración de email solo de plataforma (sin farmacia)
 * Para envío de correo de prueba desde el panel superadmin
 */
async function obtenerConfigEmailPlataforma(): Promise<ConfigEmail> {
  const configPlataforma = await prisma.configuracionPlataforma.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  return {
    provider: (configPlataforma?.emailProvider as 'smtp' | 'resend') ?? 'smtp',
    resendApiKey: configPlataforma?.resendApiKey ?? process.env.RESEND_API_KEY ?? undefined,
    emailRemitente: configPlataforma?.smtpFrom ?? process.env.SMTP_FROM ?? undefined,
    nombreRemitente: configPlataforma?.emailNombreRemitente ?? 'Sistema de Gestión',
    smtpHost: configPlataforma?.smtpHost ?? process.env.SMTP_HOST ?? undefined,
    smtpPort: configPlataforma?.smtpPort ?? parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: configPlataforma?.smtpSecure ?? process.env.SMTP_SECURE === 'true',
    smtpUser: configPlataforma?.smtpUser ?? process.env.SMTP_USER ?? undefined,
    smtpPass: configPlataforma?.smtpPass ?? process.env.SMTP_PASS ?? undefined,
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
 * Obtiene una plantilla de email por tipo y farmacia
 */
async function obtenerPlantilla(tipo: string, farmaciaId: string) {
  const plantilla = await prisma.plantillaEmail.findUnique({
    where: { 
      farmaciaId_tipo: { farmaciaId, tipo }
    },
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

  // Lista de todas las variables disponibles
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
    urlConfirmar: datos.urlConfirmar,
    urlModificar: datos.urlModificar,
    urlCancelar: datos.urlCancelar,
    motivoRechazo: datos.motivoRechazo,
    // Añadir año actual para footer
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

/**
 * Obtiene los datos de la farmacia desde la configuración (por farmaciaId)
 */
async function obtenerDatosFarmacia(farmaciaId: string) {
  const config = await prisma.configuracion.findUnique({
    where: { farmaciaId },
  });

  return {
    nombre: config?.farmaciaNombre || 'Tu Farmacia',
    direccion: config?.farmaciaDireccion || '',
    ciudad: config?.farmaciaCiudad || '',
    telefono: config?.farmaciaTelefono || '',
    email: config?.farmaciaEmail || '',
    web: config?.farmaciaWeb || '',
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
  farmaciaId: string,
  texto?: string
): Promise<boolean> {
  const config = await obtenerConfigEmail(farmaciaId);

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
        sugerencia: 'Comprueba host y puerto. Si usas Gmail u Outlook, verifica que tengas una contraseña de aplicación o el acceso para aplicaciones permitido.',
      };
    case 'EAUTH':
    case 'EENVELOPE':
      return {
        mensaje: 'Usuario o contraseña incorrectos.',
        sugerencia: 'Comprueba el usuario y la contraseña SMTP. En Gmail/Outlook suele ser necesario usar una contraseña de aplicación, no la contraseña de tu cuenta.',
      };
    case 'ESOCKET':
      return {
        mensaje: 'Error de conexión con el servidor.',
        sugerencia: 'Revisa el host, el puerto (587 para TLS, 465 para SSL) y que el servidor SMTP esté activo. Prueba con "Seguro (TLS)" activado o desactivado según tu proveedor.',
      };
    default:
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
    config = await obtenerConfigEmailPlataforma();
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

  // SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure ?? false,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
    const from = config.emailRemitente || config.smtpUser || 'noreply@sistema.local';
    await transporter.sendMail({
      from: `"${config.nombreRemitente}" <${from}>`,
      to: destinatario,
      subject: asunto,
      text: texto,
      html,
    });
    pasos.push({ paso: 'Conectar y enviar correo (SMTP)', ok: true });
    console.log(`✅ Email de prueba enviado vía SMTP a ${destinatario}`);
    return { enviado: true, pasos };
  } catch (error) {
    const { mensaje, sugerencia } = mapearErrorSMTP(error);
    pasos.push({ paso: 'Conectar y enviar correo (SMTP)', ok: false, mensaje, sugerencia });
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
 * Envía un correo de prueba usando la configuración de plataforma
 * Usado desde el panel superadmin para verificar SMTP/Resend
 */
export async function enviarCorreoPruebaPlataforma(destinatario: string): Promise<boolean> {
  const config = await obtenerConfigEmailPlataforma();
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
    // Obtener farmaciaId de la cita
    const cita = await prisma.cita.findUnique({
      where: { id: datosCita.citaId },
      select: { farmaciaId: true },
    });
    const farmaciaId = cita?.farmaciaId;
    if (!farmaciaId) {
      console.warn('❌ No se puede enviar confirmación: cita sin farmaciaId');
      return false;
    }

    const datosFarmacia = await obtenerDatosFarmacia(farmaciaId);

    // Generar tokens de acción
    const tokens = await generarTokensAccionCita(datosCita.citaId);
    const urls = construirUrlsAccion(tokens);

    // Preparar datos para la plantilla
    const datos: DatosEmail = {
      nombrePaciente: datosCita.nombreCliente,
      fechaCita: formatearFecha(datosCita.fecha),
      horaCita: datosCita.hora,
      tipoServicio: obtenerNombreTipoServicio(datosCita.tipo),
      nombreFarmacia: datosFarmacia.nombre,
      direccionFarmacia: `${datosFarmacia.direccion}, ${datosFarmacia.ciudad}`,
      telefonoFarmacia: datosFarmacia.telefono,
      emailFarmacia: datosFarmacia.email,
      webFarmacia: datosFarmacia.web,
      urlConfirmar: urls.confirmar,
      urlModificar: urls.modificar,
      urlCancelar: urls.cancelar,
    };

    // Obtener plantilla (si hay farmaciaId)
    const plantilla = farmaciaId ? await obtenerPlantilla('confirmacion', farmaciaId) : null;

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

    const enviado = await enviarEmail(emailDestinatario, asunto, html, farmaciaId);

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
    // Obtener farmaciaId de la cita
    const cita = await prisma.cita.findUnique({
      where: { id: datosCita.citaId },
      select: { farmaciaId: true },
    });
    const farmaciaId = cita?.farmaciaId;
    if (!farmaciaId) {
      console.warn('❌ No se puede enviar recordatorio: cita sin farmaciaId');
      return false;
    }

    const datosFarmacia = await obtenerDatosFarmacia(farmaciaId);
    const tokens = await generarTokensAccionCita(datosCita.citaId);
    const urls = construirUrlsAccion(tokens);

    const datos: DatosEmail = {
      nombrePaciente: datosCita.nombreCliente,
      fechaCita: formatearFecha(datosCita.fecha),
      horaCita: datosCita.hora,
      tipoServicio: obtenerNombreTipoServicio(datosCita.tipo),
      nombreFarmacia: datosFarmacia.nombre,
      direccionFarmacia: `${datosFarmacia.direccion}, ${datosFarmacia.ciudad}`,
      telefonoFarmacia: datosFarmacia.telefono,
      emailFarmacia: datosFarmacia.email,
      webFarmacia: datosFarmacia.web,
      urlConfirmar: urls.confirmar,
      urlModificar: urls.modificar,
      urlCancelar: urls.cancelar,
    };

    const plantilla = farmaciaId ? await obtenerPlantilla('recordatorio', farmaciaId) : null;

    let html: string;
    let asunto: string;

    if (plantilla) {
      html = reemplazarVariables(plantilla.contenidoHtml, datos);
      asunto = reemplazarVariables(plantilla.asunto, datos);
    } else {
      html = generarPlantillaRecordatorioDefault(datos);
      asunto = `Recordatorio: Tu cita es mañana - ${datos.tipoServicio}`;
    }

    const enviado = await enviarEmail(emailDestinatario, asunto, html, farmaciaId);

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
    farmaciaId?: string; // Requerido cuando no hay citaId (ej. rechazo de solicitud)
  }
): Promise<boolean> {
  try {
    // Obtener farmaciaId de la cita o del parámetro
    let farmaciaId: string | undefined = datosCita.farmaciaId;
    if (!farmaciaId && datosCita.citaId) {
      const cita = await prisma.cita.findUnique({
        where: { id: datosCita.citaId },
        select: { farmaciaId: true },
      });
      farmaciaId = cita?.farmaciaId;
    }
    if (!farmaciaId) {
      console.warn('❌ No se puede enviar cancelación: falta farmaciaId');
      return false;
    }

    const datosFarmacia = await obtenerDatosFarmacia(farmaciaId);

    const datos: DatosEmail = {
      nombrePaciente: datosCita.nombreCliente,
      fechaCita: formatearFecha(datosCita.fecha),
      horaCita: datosCita.hora,
      tipoServicio: obtenerNombreTipoServicio(datosCita.tipo),
      nombreFarmacia: datosFarmacia.nombre,
      direccionFarmacia: `${datosFarmacia.direccion}, ${datosFarmacia.ciudad}`,
      telefonoFarmacia: datosFarmacia.telefono,
      emailFarmacia: datosFarmacia.email,
      webFarmacia: datosFarmacia.web,
      motivoRechazo: datosCita.motivoRechazo,
    };

    const plantilla = farmaciaId ? await obtenerPlantilla('cancelacion', farmaciaId) : null;

    let html: string;
    let asunto: string;

    if (plantilla) {
      html = reemplazarVariables(plantilla.contenidoHtml, datos);
      asunto = reemplazarVariables(plantilla.asunto, datos);
    } else {
      html = generarPlantillaCancelacionDefault(datos);
      asunto = `Cita cancelada - ${datos.tipoServicio}`;
    }

    return await enviarEmail(emailDestinatario, asunto, html, farmaciaId);
  } catch (error) {
    console.error('❌ Error al enviar cancelación:', error);
    return false;
  }
}

/**
 * Envía email de rechazo de solicitud (mantener compatibilidad)
 * Requiere farmaciaId para cargar datos y plantilla de la farmacia.
 */
export async function enviarRechazoSolicitud(
  emailDestinatario: string,
  datosSolicitud: {
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
    motivo?: string;
    farmaciaId: string;
  }
): Promise<boolean> {
  return enviarCancelacionCita(emailDestinatario, {
    ...datosSolicitud,
    motivoRechazo: datosSolicitud.motivo,
    farmaciaId: datosSolicitud.farmaciaId,
  });
}

/**
 * Envía email de invitación para que un nuevo usuario establezca su contraseña
 */
export async function enviarInvitacionUsuario(
  emailDestinatario: string,
  nombreUsuario: string,
  nombreFarmacia: string,
  urlEstablecerContrasena: string,
  farmaciaId: string
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
  return enviarEmail(emailDestinatario, asunto, html, farmaciaId, texto);
}

// ==========================================
// PLANTILLAS POR DEFECTO
// ==========================================

/**
 * Genera plantilla HTML de confirmación por defecto
 */
function generarPlantillaConfirmacionDefault(datos: DatosEmail): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #79438f; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">✅ Cita Confirmada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    
    <p>Tu cita ha sido confirmada correctamente. Aquí tienes los detalles:</p>
    
    <div style="background-color: #f8f4fa; padding: 20px; margin: 20px 0; border-left: 4px solid #79438f; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> ${datos.tipoServicio}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación.</p>
    
    <!-- Botones de acción -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${datos.urlConfirmar}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">✓ Confirmar asistencia</a>
      <a href="${datos.urlModificar}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">✎ Modificar cita</a>
      <a href="${datos.urlCancelar}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">✕ Cancelar cita</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia}</p>
      <p style="margin: 3px 0;">✉️ ${datos.emailFarmacia}</p>
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
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
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
    
    <!-- Botones de acción -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${datos.urlConfirmar}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">✓ Confirmar asistencia</a>
      <a href="${datos.urlModificar}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">✎ Modificar cita</a>
      <a href="${datos.urlCancelar}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">✕ Cancelar cita</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia}</p>
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
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Cancelada</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
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
      <a href="${datos.webFarmacia || '#'}" style="display: inline-block; background-color: #79438f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Solicitar nueva cita</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia}</p>
      <p style="margin: 3px 0;">📞 ${datos.telefonoFarmacia}</p>
      <p style="margin: 3px 0;">✉️ ${datos.emailFarmacia}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © ${new Date().getFullYear()} ${datos.nombreFarmacia}
  </p>
</body>
</html>`;
}
