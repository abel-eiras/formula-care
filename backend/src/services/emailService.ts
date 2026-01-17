import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';

// Configuración del transportador de email
let transporter: nodemailer.Transporter | null = null;

/**
 * Inicializa el transportador de email con configuración SMTP
 */
async function inicializarTransportador() {
  if (transporter) {
    return transporter;
  }

  // Obtener configuración SMTP de variables de entorno
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
  const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true para puerto 465, false para otros
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

  // Si no hay configuración SMTP, crear un transportador de prueba (solo para desarrollo)
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️  Configuración SMTP no encontrada. Usando transportador de prueba (solo desarrollo).');
    console.warn('   Configura SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS en .env para producción.');
    
    // Transportador de prueba (no envía emails reales, solo los muestra en consola)
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'test@ethereal.email',
        pass: 'test',
      },
    });
  } else {
    // Transportador real con configuración SMTP
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  // Verificar conexión
  try {
    await transporter.verify();
    console.log('✅ Servidor de email configurado correctamente');
  } catch (error) {
    console.error('❌ Error al verificar configuración de email:', error);
    console.warn('   Los emails no se enviarán hasta que se corrija la configuración.');
  }

  return transporter;
}

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
 * Formatea la fecha y hora para mostrar en el email
 */
function formatearFechaHora(fecha: string, hora: string): string {
  const fechaObj = new Date(fecha);
  const opciones: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
  return `${fechaFormateada} a las ${hora}`;
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

/**
 * Envía email de confirmación de cita
 */
export async function enviarConfirmacionCita(
  emailDestinatario: string,
  datosCita: {
    tipo: string;
    fecha: string;
    hora: string;
    nombreCliente: string;
  }
): Promise<boolean> {
  try {
    const transportador = await inicializarTransportador();
    const datosFarmacia = await obtenerDatosFarmacia();

    const nombreServicio = obtenerNombreTipoServicio(datosCita.tipo);
    const fechaHoraFormateada = formatearFechaHora(datosCita.fecha, datosCita.hora);

    // Plantilla HTML del email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Cita</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #79438f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0;">Confirmación de Cita</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
    <p>Estimado/a <strong>${datosCita.nombreCliente}</strong>,</p>
    
    <p>Le confirmamos que su solicitud de cita ha sido <strong>aprobada</strong>.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #79438f; border-radius: 4px;">
      <h2 style="margin-top: 0; color: #79438f;">Detalles de la Cita</h2>
      <p><strong>Tipo de servicio:</strong> ${nombreServicio}</p>
      <p><strong>Fecha y hora:</strong> ${fechaHoraFormateada}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p><strong>${datosFarmacia.nombre}</strong></p>
      ${datosFarmacia.direccion ? `<p>${datosFarmacia.direccion}</p>` : ''}
      ${datosFarmacia.ciudad ? `<p>${datosFarmacia.ciudad}</p>` : ''}
      ${datosFarmacia.telefono ? `<p>Teléfono: ${datosFarmacia.telefono}</p>` : ''}
      ${datosFarmacia.email ? `<p>Email: ${datosFarmacia.email}</p>` : ''}
      ${datosFarmacia.web ? `<p>Web: ${datosFarmacia.web}</p>` : ''}
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666;">
      Si necesita modificar o cancelar su cita, por favor contacte con nosotros.
    </p>
  </div>
</body>
</html>
    `;

    // Versión texto plano
    const texto = `
Confirmación de Cita

Estimado/a ${datosCita.nombreCliente},

Le confirmamos que su solicitud de cita ha sido aprobada.

Detalles de la Cita:
- Tipo de servicio: ${nombreServicio}
- Fecha y hora: ${fechaHoraFormateada}

Por favor, llegue con unos minutos de antelación.

${datosFarmacia.nombre}
${datosFarmacia.direccion ? datosFarmacia.direccion + '\n' : ''}${datosFarmacia.ciudad ? datosFarmacia.ciudad + '\n' : ''}${datosFarmacia.telefono ? 'Teléfono: ' + datosFarmacia.telefono + '\n' : ''}${datosFarmacia.email ? 'Email: ' + datosFarmacia.email + '\n' : ''}${datosFarmacia.web ? 'Web: ' + datosFarmacia.web + '\n' : ''}

Si necesita modificar o cancelar su cita, por favor contacte con nosotros.
    `;

    const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || datosFarmacia.email || 'noreply@farmaciapontevea.com';

    const info = await transportador.sendMail({
      from: `"${datosFarmacia.nombre}" <${SMTP_FROM}>`,
      to: emailDestinatario,
      subject: `Confirmación de cita - ${nombreServicio}`,
      text: texto,
      html: html,
    });

    console.log(`✅ Email de confirmación enviado a ${emailDestinatario} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email de confirmación:', error);
    // No lanzamos el error para que no falle la aplicación si el email no se puede enviar
    return false;
  }
}

/**
 * Envía email de rechazo de solicitud (opcional)
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
  try {
    const transportador = await inicializarTransportador();
    const datosFarmacia = await obtenerDatosFarmacia();

    const nombreServicio = obtenerNombreTipoServicio(datosSolicitud.tipo);
    const fechaHoraFormateada = formatearFechaHora(datosSolicitud.fecha, datosSolicitud.hora);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Cita</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0;">Solicitud de Cita</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
    <p>Estimado/a <strong>${datosSolicitud.nombreCliente}</strong>,</p>
    
    <p>Lamentamos informarle que su solicitud de cita para el <strong>${fechaHoraFormateada}</strong> (${nombreServicio}) no ha podido ser confirmada en este momento.</p>
    
    ${datosSolicitud.motivo ? `<p><strong>Motivo:</strong> ${datosSolicitud.motivo}</p>` : ''}
    
    <p>Le invitamos a contactar con nosotros para encontrar una alternativa que se ajuste a sus necesidades.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p><strong>${datosFarmacia.nombre}</strong></p>
      ${datosFarmacia.direccion ? `<p>${datosFarmacia.direccion}</p>` : ''}
      ${datosFarmacia.ciudad ? `<p>${datosFarmacia.ciudad}</p>` : ''}
      ${datosFarmacia.telefono ? `<p>Teléfono: ${datosFarmacia.telefono}</p>` : ''}
      ${datosFarmacia.email ? `<p>Email: ${datosFarmacia.email}</p>` : ''}
    </div>
  </div>
</body>
</html>
    `;

    const texto = `
Solicitud de Cita

Estimado/a ${datosSolicitud.nombreCliente},

Lamentamos informarle que su solicitud de cita para el ${fechaHoraFormateada} (${nombreServicio}) no ha podido ser confirmada en este momento.

${datosSolicitud.motivo ? `Motivo: ${datosSolicitud.motivo}\n` : ''}

Le invitamos a contactar con nosotros para encontrar una alternativa que se ajuste a sus necesidades.

${datosFarmacia.nombre}
${datosFarmacia.direccion ? datosFarmacia.direccion + '\n' : ''}${datosFarmacia.ciudad ? datosFarmacia.ciudad + '\n' : ''}${datosFarmacia.telefono ? 'Teléfono: ' + datosFarmacia.telefono + '\n' : ''}${datosFarmacia.email ? 'Email: ' + datosFarmacia.email + '\n' : ''}
    `;

    const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || datosFarmacia.email || 'noreply@farmaciapontevea.com';

    const info = await transportador.sendMail({
      from: `"${datosFarmacia.nombre}" <${SMTP_FROM}>`,
      to: emailDestinatario,
      subject: `Solicitud de cita - ${nombreServicio}`,
      text: texto,
      html: html,
    });

    console.log(`✅ Email de rechazo enviado a ${emailDestinatario} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email de rechazo:', error);
    return false;
  }
}
