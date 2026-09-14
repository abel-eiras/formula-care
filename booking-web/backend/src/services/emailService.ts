/**
 * Servicio de Email con soporte dual: Resend + SMTP (Nodemailer).
 * Adaptado del backend original (multi-tenant) a una configuración single-tenant:
 * la config de email vive en el singleton Configuracion, sin resolución por farmacia.
 *
 * Si no hay SMTP ni Resend configurados, los envíos se registran en consola
 * (modo "dry-run") en vez de fallar — así el servicio arranca y puede probarse
 * sin credenciales de correo reales.
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma.js';
import { decrypt } from './encryptionService.js';
import { generarTokensAccionCita, construirUrlsAccion, type TipoAccionCita } from './tokenService.js';

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
  urlSolicitarCita?: string;
  urlWhatsapp?: string;
  urlTelefono?: string;
  logoFarmacia?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  motivoRechazo?: string;
  [key: string]: string | undefined;
}

interface ConfigEmail {
  provider: 'smtp' | 'resend';
  resendApiKey?: string;
  emailRemitente?: string;
  nombreRemitente?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpAcceptSelfSigned?: boolean;
  smtpUser?: string;
  smtpPass?: string;
}

let smtpTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

/**
 * Config de email: fila Configuracion singleton → variables de entorno.
 */
async function obtenerConfigEmail(): Promise<ConfigEmail> {
  const config = await prisma.configuracion.findUnique({ where: { id: 'singleton' } });

  return {
    provider: (config?.emailProvider as 'smtp' | 'resend') ?? 'smtp',
    resendApiKey: config?.resendApiKey ?? process.env.RESEND_API_KEY ?? undefined,
    emailRemitente: config?.emailRemitente ?? process.env.SMTP_FROM ?? config?.farmaciaEmail ?? undefined,
    nombreRemitente: config?.emailNombreRemitente ?? config?.farmaciaNombre ?? 'Reserva de citas',
    smtpHost: config?.smtpHost ?? process.env.SMTP_HOST ?? undefined,
    smtpPort: config?.smtpPort ?? parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: config?.smtpSecure ?? process.env.SMTP_SECURE === 'true',
    smtpAcceptSelfSigned: config?.smtpAcceptSelfSigned ?? false,
    smtpUser: config?.smtpUser ?? process.env.SMTP_USER ?? undefined,
    smtpPass: (() => {
      const raw = config?.smtpPass ?? process.env.SMTP_PASS ?? undefined;
      if (!raw) return undefined;
      // Puede venir encriptado (guardado desde el panel de staff) o en claro (env var)
      try {
        return raw.includes(':') ? decrypt(raw) : raw;
      } catch {
        return raw;
      }
    })(),
  };
}

function tieneSmtpCompleto(config: ConfigEmail): boolean {
  return !!(config.smtpHost && config.smtpUser && config.smtpPass);
}

function tieneResend(config: ConfigEmail): boolean {
  return !!config.resendApiKey;
}

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

async function inicializarSMTP(config: ConfigEmail): Promise<nodemailer.Transporter | null> {
  if (smtpTransporter) return smtpTransporter;
  if (!tieneSmtpCompleto(config)) return null;

  smtpTransporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    tls: { rejectUnauthorized: !config.smtpAcceptSelfSigned },
  });

  return smtpTransporter;
}

function inicializarResend(config: ConfigEmail): Resend | null {
  if (resendClient) return resendClient;
  if (!config.resendApiKey) return null;
  resendClient = new Resend(config.resendApiKey);
  return resendClient;
}

/**
 * Envía un email usando el proveedor configurado. Si no hay ningún proveedor
 * configurado, registra el email en consola (modo dry-run) y devuelve true,
 * para que el resto del flujo (crear cita, marcar solicitud, etc.) no falle
 * solo por falta de credenciales de correo.
 */
async function enviarEmail(destinatario: string, asunto: string, html: string, texto?: string): Promise<boolean> {
  const config = await obtenerConfigEmail();

  if (!tieneSmtpCompleto(config) && !tieneResend(config)) {
    console.log('✉️  [dry-run] No hay SMTP/Resend configurado. Email NO enviado, solo registrado:');
    console.log(`   Para: ${destinatario}`);
    console.log(`   Asunto: ${asunto}`);
    console.log(`   Texto: ${texto || htmlATexto(html)}`);
    return true;
  }

  try {
    if (config.provider === 'resend' && tieneResend(config)) {
      const resend = inicializarResend(config);
      if (!resend) return enviarConSMTP(config, destinatario, asunto, html, texto);

      const { error } = await resend.emails.send({
        from: `${config.nombreRemitente} <${config.emailRemitente || 'noreply@sistema.local'}>`,
        to: destinatario,
        subject: asunto,
        html,
        text: texto || htmlATexto(html),
      });

      if (error) {
        console.error('❌ Error Resend:', error);
        return enviarConSMTP(config, destinatario, asunto, html, texto);
      }
      console.log(`✅ Email enviado vía Resend a ${destinatario}`);
      return true;
    }

    return enviarConSMTP(config, destinatario, asunto, html, texto);
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return false;
  }
}

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

    await transporter.sendMail({
      from: `"${config.nombreRemitente}" <${from}>`,
      to: destinatario,
      subject: asunto,
      text: texto || htmlATexto(html),
      html,
    });

    console.log(`✅ Email enviado vía SMTP a ${destinatario}`);
    return true;
  } catch (error) {
    console.error('❌ Error SMTP:', error);
    return false;
  }
}

async function obtenerPlantilla(tipo: string) {
  const plantilla = await prisma.plantillaEmail.findUnique({ where: { tipo } });
  if (!plantilla || !plantilla.activa) return null;
  return plantilla;
}

function reemplazarVariables(contenido: string, datos: DatosEmail): string {
  let resultado = contenido;

  const variables: Record<string, string | undefined> = {
    ...datos,
    bloqueLogo:
      datos.logoFarmacia && datos.nombreFarmacia
        ? `<img src="${datos.logoFarmacia}" alt="${(datos.nombreFarmacia || '').replace(/"/g, '&quot;')}" style="max-height: 60px; display: block; margin: 0 auto;" />`
        : '',
    bloqueWhatsapp: datos.urlWhatsapp ? ` | <a href="${datos.urlWhatsapp}" style="color: #25d366;">Contactar por WhatsApp</a>` : '',
    bloqueTelefono: datos.urlTelefono ? ` | <a href="${datos.urlTelefono}">Llamar</a>` : '',
    anioActual: new Date().getFullYear().toString(),
  };

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    resultado = resultado.replace(regex, value || '');
  }

  return resultado;
}

const COLOR_DEFAULT = '#79438f';

function formatearFecha(fecha: string): string {
  const fechaObj = new Date(fecha + 'T00:00:00');
  return fechaObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function obtenerNombreTipoServicio(tipo: string): string {
  const nombres: Record<string, string> = {
    dermo: 'Dermocosmética',
    bio: 'Análisis Bioquímico',
    consulta: 'Consulta General',
    seguimiento: 'Seguimiento',
  };
  if (tipo.startsWith('evento:')) return 'Evento';
  return nombres[tipo] || tipo;
}

interface DatosCitaBase {
  nombreCliente: string;
  fecha: string;
  hora: string;
  tipo: string;
  motivoRechazo?: string;
}

async function obtenerDatosFarmacia() {
  const config = await prisma.configuracion.findUnique({ where: { id: 'singleton' } });
  const baseUrl = process.env.APP_URL || 'http://localhost:5174';

  const direccion = [config?.farmaciaDireccion, config?.farmaciaCiudad].filter(Boolean).join(', ');
  const whatsapp = config?.farmaciaWhatsapp || '';
  const telefono = config?.farmaciaTelefono || '';

  let colores: { primario: string; secundario: string } = { primario: COLOR_DEFAULT, secundario: '#6495a8' };
  if (config?.temaActivo === 'custom' && config.coloresMarca) {
    try {
      const parsed = JSON.parse(config.coloresMarca);
      colores = { primario: parsed.primario || COLOR_DEFAULT, secundario: parsed.secundario || '#6495a8' };
    } catch {
      /* ignore, usar default */
    }
  }

  return {
    nombre: config?.farmaciaNombre || 'Reserva de citas',
    direccion,
    telefono,
    email: config?.farmaciaEmail || '',
    web: config?.farmaciaWeb || '',
    logoFarmacia: config?.farmaciaLogo || '',
    urlSolicitarCita: config?.farmaciaWeb || baseUrl,
    urlWhatsapp: whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : '',
    urlTelefono: telefono ? `tel:${telefono.replace(/\s/g, '')}` : '',
    colorPrimario: colores.primario,
    colorSecundario: colores.secundario,
  };
}

async function obtenerDatosEmailCompletos(
  datosCita: DatosCitaBase,
  tokens?: Record<TipoAccionCita, string>
): Promise<DatosEmail> {
  const farmacia = await obtenerDatosFarmacia();
  const urls = tokens ? construirUrlsAccion(tokens) : null;

  return {
    nombrePaciente: datosCita.nombreCliente,
    fechaCita: formatearFecha(datosCita.fecha),
    horaCita: datosCita.hora,
    tipoServicio: obtenerNombreTipoServicio(datosCita.tipo),
    nombreFarmacia: farmacia.nombre,
    direccionFarmacia: farmacia.direccion,
    telefonoFarmacia: farmacia.telefono,
    emailFarmacia: farmacia.email,
    webFarmacia: farmacia.web,
    urlConfirmar: urls?.confirmar,
    urlModificar: urls?.modificar,
    urlCancelar: urls?.cancelar,
    urlSolicitarCita: farmacia.urlSolicitarCita,
    urlWhatsapp: farmacia.urlWhatsapp,
    urlTelefono: farmacia.urlTelefono,
    logoFarmacia: farmacia.logoFarmacia,
    colorPrimario: farmacia.colorPrimario,
    colorSecundario: farmacia.colorSecundario,
    motivoRechazo: datosCita.motivoRechazo,
  };
}

function bloquesContacto(datos: DatosEmail) {
  const whatsapp = datos.urlWhatsapp ? ` | <a href="${datos.urlWhatsapp}" style="color:#25d366;">WhatsApp</a>` : '';
  const telefono = datos.urlTelefono ? ` | <a href="${datos.urlTelefono}">Llamar</a>` : '';
  const logo = datos.logoFarmacia
    ? `<div style="text-align:center;margin-bottom:16px;"><img src="${datos.logoFarmacia}" alt="${datos.nombreFarmacia || ''}" style="max-height:60px;" /></div>`
    : '';
  const color = datos.colorPrimario || COLOR_DEFAULT;
  return { whatsapp, telefono, logo, color };
}

// ==========================================
// PLANTILLAS POR DEFECTO (usadas si no hay PlantillaEmail activa en BD)
// ==========================================

function generarPlantillaConfirmacionDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono, color } = bloquesContacto(datos);
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Confirmación de Cita</title></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: ${color}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Solicitud recibida</h1>
  </div>
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    <p>Tu cita ha sido confirmada. Aquí tienes los detalles:</p>
    <div style="background-color: #f8f4fa; padding: 20px; margin: 20px 0; border-left: 4px solid ${color}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>Fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>Hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>Servicio:</strong> ${datos.tipoServicio}</p>
    </div>
    <p>Por favor, llega con unos minutos de antelación.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${datos.urlConfirmar}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Confirmar asistencia</a>
      <a href="${datos.urlModificar}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Modificar cita</a>
      <a href="${datos.urlCancelar}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Cancelar cita</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia || ''}</p>
      <p style="margin: 3px 0;">${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} ${datos.nombreFarmacia}</p>
</body>
</html>`;
}

function generarPlantillaCancelacionDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono, color } = bloquesContacto(datos);
  const urlSolicitar = datos.urlSolicitarCita || datos.webFarmacia || '#';
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Cita Cancelada</title></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: #ef4444; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Cita Cancelada</h1>
  </div>
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    <p>Te informamos de que tu cita ha sido cancelada:</p>
    <div style="background-color: #fef2f2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>Fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>Hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>Servicio:</strong> ${datos.tipoServicio}</p>
      ${datos.motivoRechazo ? `<p style="margin: 10px 0 0 0;"><strong>Motivo:</strong> ${datos.motivoRechazo}</p>` : ''}
    </div>
    <p>Si deseas reagendar, puedes solicitar una nueva cita cuando quieras.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${urlSolicitar}" style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Solicitar nueva cita</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia || ''}</p>
      <p style="margin: 3px 0;">${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} ${datos.nombreFarmacia}</p>
</body>
</html>`;
}

function generarPlantillaModificacionDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono } = bloquesContacto(datos);
  const colorSec = datos.colorSecundario || '#6495a8';
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Cita Modificada</title></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: ${colorSec}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Cita Modificada</h1>
  </div>
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    <p>Tu cita ha sido modificada. Nuevos detalles:</p>
    <div style="background-color: #eff6ff; padding: 20px; margin: 20px 0; border-left: 4px solid ${colorSec}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>Nueva fecha:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>Nueva hora:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>Servicio:</strong> ${datos.tipoServicio}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${datos.urlConfirmar}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Confirmar asistencia</a>
      <a href="${datos.urlModificar}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Modificar cita</a>
      <a href="${datos.urlCancelar}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Cancelar cita</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia || ''}</p>
      <p style="margin: 3px 0;">${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} ${datos.nombreFarmacia}</p>
</body>
</html>`;
}

function generarPlantillaRechazoDefault(datos: DatosEmail): string {
  const { logo, whatsapp, telefono, color } = bloquesContacto(datos);
  const urlSolicitar = datos.urlSolicitarCita || datos.webFarmacia || '#';
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Solicitud no disponible</title></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  ${logo}
  <div style="background-color: #6b7280; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Solicitud no disponible</h1>
  </div>
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>${datos.nombrePaciente}</strong>,</p>
    <p>Lamentamos informarte de que no hemos podido confirmar tu solicitud de cita:</p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-left: 4px solid #6b7280; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>Fecha solicitada:</strong> ${datos.fechaCita}</p>
      <p style="margin: 5px 0;"><strong>Hora solicitada:</strong> ${datos.horaCita}</p>
      <p style="margin: 5px 0;"><strong>Servicio:</strong> ${datos.tipoServicio}</p>
      ${datos.motivoRechazo ? `<p style="margin: 10px 0 0 0;"><strong>Motivo:</strong> ${datos.motivoRechazo}</p>` : ''}
    </div>
    <p>Puedes intentar solicitar una cita en otro horario disponible.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${urlSolicitar}" style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Solicitar otra cita</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <div style="color: #666; font-size: 14px;">
      <p><strong>${datos.nombreFarmacia}</strong></p>
      <p style="margin: 3px 0;">${datos.direccionFarmacia || ''}</p>
      <p style="margin: 3px 0;">${datos.telefonoFarmacia || ''}${whatsapp}${telefono}</p>
      <p style="margin: 3px 0;">${datos.emailFarmacia || ''}</p>
    </div>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} ${datos.nombreFarmacia}</p>
</body>
</html>`;
}

// ==========================================
// FUNCIONES PÚBLICAS DE ENVÍO
// ==========================================

export async function enviarConfirmacionCita(
  emailDestinatario: string,
  datosCita: { citaId: string; tipo: string; fecha: string; hora: string; nombreCliente: string }
): Promise<boolean> {
  try {
    const tokens = await generarTokensAccionCita(datosCita.citaId);
    const datos = await obtenerDatosEmailCompletos(datosCita, tokens);
    const plantilla = await obtenerPlantilla('confirmacion');

    const html = plantilla ? reemplazarVariables(plantilla.contenidoHtml, datos) : generarPlantillaConfirmacionDefault(datos);
    const asunto = plantilla ? reemplazarVariables(plantilla.asunto, datos) : `Confirmación de cita - ${datos.tipoServicio}`;

    const enviado = await enviarEmail(emailDestinatario, asunto, html);

    if (enviado) {
      await prisma.cita.update({ where: { id: datosCita.citaId }, data: { confirmacionEnviada: true } });
    }

    return enviado;
  } catch (error) {
    console.error('❌ Error al enviar email de confirmación:', error);
    return false;
  }
}

export async function enviarCancelacionCita(
  emailDestinatario: string,
  datosCita: { tipo: string; fecha: string; hora: string; nombreCliente: string; motivoRechazo?: string }
): Promise<boolean> {
  try {
    const datos = await obtenerDatosEmailCompletos(datosCita);
    const plantilla = await obtenerPlantilla('cancelacion');

    const html = plantilla ? reemplazarVariables(plantilla.contenidoHtml, datos) : generarPlantillaCancelacionDefault(datos);
    const asunto = plantilla ? reemplazarVariables(plantilla.asunto, datos) : `Cita cancelada - ${datos.tipoServicio}`;

    return await enviarEmail(emailDestinatario, asunto, html);
  } catch (error) {
    console.error('❌ Error al enviar email de cancelación:', error);
    return false;
  }
}

export async function enviarModificacionCita(
  emailDestinatario: string,
  datosCita: { citaId: string; tipo: string; fecha: string; hora: string; nombreCliente: string }
): Promise<boolean> {
  try {
    const tokens = await generarTokensAccionCita(datosCita.citaId);
    const datos = await obtenerDatosEmailCompletos(datosCita, tokens);
    const plantilla = await obtenerPlantilla('modificacion');

    const html = plantilla ? reemplazarVariables(plantilla.contenidoHtml, datos) : generarPlantillaModificacionDefault(datos);
    const asunto = plantilla ? reemplazarVariables(plantilla.asunto, datos) : `Tu cita ha sido modificada - ${datos.tipoServicio}`;

    return await enviarEmail(emailDestinatario, asunto, html);
  } catch (error) {
    console.error('❌ Error al enviar email de modificación:', error);
    return false;
  }
}

/**
 * Email de rechazo de una SolicitudCita (nunca llegó a convertirse en Cita).
 */
export async function enviarRechazoSolicitud(
  emailDestinatario: string,
  datosSolicitud: { tipo: string; fecha: string; hora: string; nombreCliente: string; motivo?: string }
): Promise<boolean> {
  try {
    const datos = await obtenerDatosEmailCompletos({ ...datosSolicitud, motivoRechazo: datosSolicitud.motivo });
    const plantilla = await obtenerPlantilla('rechazo');

    const html = plantilla ? reemplazarVariables(plantilla.contenidoHtml, datos) : generarPlantillaRechazoDefault(datos);
    const asunto = plantilla ? reemplazarVariables(plantilla.asunto, datos) : `Tu solicitud de cita - ${datos.tipoServicio}`;

    return await enviarEmail(emailDestinatario, asunto, html);
  } catch (error) {
    console.error('❌ Error al enviar email de rechazo:', error);
    return false;
  }
}

export {
  generarPlantillaConfirmacionDefault,
  generarPlantillaCancelacionDefault,
  generarPlantillaModificacionDefault,
  generarPlantillaRechazoDefault,
};
