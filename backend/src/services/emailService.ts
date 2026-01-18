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

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let smtpTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================

/**
 * Obtiene la configuración de email desde BD y variables de entorno
 */
async function obtenerConfigEmail(): Promise<ConfigEmail> {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' },
  });

  return {
    provider: (config?.emailProvider as 'smtp' | 'resend') || 'smtp',
    resendApiKey: config?.resendApiKey ?? process.env.RESEND_API_KEY ?? undefined,
    emailRemitente: config?.emailRemitente ?? process.env.SMTP_FROM ?? config?.farmaciaEmail ?? undefined,
    nombreRemitente: config?.emailNombreRemitente ?? config?.farmaciaNombre ?? 'Farmacia Pontevea',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  };
}

/**
 * Inicializa el transportador SMTP
 */
async function inicializarSMTP(config: ConfigEmail): Promise<nodemailer.Transporter | null> {
  if (smtpTransporter) return smtpTransporter;

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.warn('⚠️  Configuración SMTP incompleta. Usando modo de prueba.');
    // Transportador de prueba (Ethereal)
    smtpTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: 'test@ethereal.email', pass: 'test' },
    });
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
 * Obtiene los datos de la farmacia desde la configuración
 */
async function obtenerDatosFarmacia() {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' },
  });

  return {
    nombre: config?.farmaciaNombre || 'Farmacia Pontevea',
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
 * Envía un email usando el proveedor configurado
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
        from: `${config.nombreRemitente} <${config.emailRemitente || 'noreply@farmaciapontevea.com'}>`,
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

    const from = config.emailRemitente || config.smtpUser || 'noreply@farmaciapontevea.com';

    await transporter.sendMail({
      from: `"${config.nombreRemitente}" <${from}>`,
      to: destinatario,
      subject: asunto,
      text: texto || htmlATexto(html),
      html: html,
    });

    console.log(`✅ Email enviado vía SMTP a ${destinatario}`);
    return true;
  } catch (error) {
    console.error('❌ Error SMTP:', error);
    return false;
  }
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
    const datosFarmacia = await obtenerDatosFarmacia();

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

    // Obtener plantilla
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
    const datosFarmacia = await obtenerDatosFarmacia();
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
  }
): Promise<boolean> {
  try {
    const datosFarmacia = await obtenerDatosFarmacia();

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
 * Envía email de rechazo de solicitud (mantener compatibilidad)
 */
export async function enviarRechazoSolicitud(
  emailDestinatario: string,
  datosSolicitud: {
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
    motivo?: string;
  }
): Promise<boolean> {
  return enviarCancelacionCita(emailDestinatario, {
    ...datosSolicitud,
    motivoRechazo: datosSolicitud.motivo,
  });
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
