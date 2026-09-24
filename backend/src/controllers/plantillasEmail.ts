/**
 * Controlador de Plantillas de Email
 * CRUD para gestionar las plantillas personalizables
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getParamString } from '../lib/queryHelpers.js';

// ==========================================
// PLANTILLAS POR DEFECTO
// ==========================================

const PLANTILLAS_DEFAULT = {
  confirmacion: {
    nombre: 'Confirmación de Cita',
    asunto: 'Confirmación de cita - {{tipoServicio}}',
    contenidoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  {{bloqueLogo}}
  <div style="background-color: {{colorPrimario}}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">✅ Cita Confirmada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>{{nombrePaciente}}</strong>,</p>
    
    <p>Tu cita ha sido confirmada correctamente. Aquí tienes los detalles:</p>
    
    <div style="background-color: #f8f4fa; padding: 20px; margin: 20px 0; border-left: 4px solid {{colorPrimario}}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> {{fechaCita}}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> {{horaCita}}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> {{tipoServicio}}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación.</p>
    
    {{bloqueCancelar}}
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>{{nombreFarmacia}}</strong></p>
      <p style="margin: 3px 0;">{{direccionFarmacia}}</p>
      <p style="margin: 3px 0;">📞 {{telefonoFarmacia}}{{bloqueWhatsapp}}{{bloqueTelefono}}</p>
      <p style="margin: 3px 0;">✉️ {{emailFarmacia}}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © {{anioActual}} {{nombreFarmacia}}. Todos los derechos reservados.
  </p>
</body>
</html>`,
  },
  recordatorio: {
    nombre: 'Recordatorio de Cita',
    asunto: 'Recordatorio: Tu cita es mañana - {{tipoServicio}}',
    contenidoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  {{bloqueLogo}}
  <div style="background-color: #f59e0b; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⏰ Recordatorio de Cita</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>{{nombrePaciente}}</strong>,</p>
    
    <p>Te recordamos que tienes una cita programada para <strong>mañana</strong>:</p>
    
    <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> {{fechaCita}}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> {{horaCita}}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> {{tipoServicio}}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación. Si no puedes asistir, te agradecemos que nos lo comuniques.</p>
    
    {{bloqueCancelar}}
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>{{nombreFarmacia}}</strong></p>
      <p style="margin: 3px 0;">{{direccionFarmacia}}</p>
      <p style="margin: 3px 0;">📞 {{telefonoFarmacia}}{{bloqueWhatsapp}}{{bloqueTelefono}}</p>
      <p style="margin: 3px 0;">✉️ {{emailFarmacia}}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © {{anioActual}} {{nombreFarmacia}}
  </p>
</body>
</html>`,
  },
  cancelacion: {
    nombre: 'Cancelación de Cita',
    asunto: 'Cita cancelada - {{tipoServicio}}',
    contenidoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Cancelada</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  {{bloqueLogo}}
  <div style="background-color: #ef4444; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">❌ Cita Cancelada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>{{nombrePaciente}}</strong>,</p>
    
    <p>Lamentamos informarte que tu cita ha sido cancelada:</p>
    
    <div style="background-color: #fef2f2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> {{fechaCita}}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> {{horaCita}}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> {{tipoServicio}}</p>
    </div>
    
    <p>Si deseas reagendar tu cita, puedes contactarnos o visitar nuestra página de solicitud de citas.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      {{bloqueSolicitarCita}}
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>{{nombreFarmacia}}</strong></p>
      <p style="margin: 3px 0;">{{direccionFarmacia}}</p>
      <p style="margin: 3px 0;">📞 {{telefonoFarmacia}}{{bloqueWhatsapp}}{{bloqueTelefono}}</p>
      <p style="margin: 3px 0;">✉️ {{emailFarmacia}}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © {{anioActual}} {{nombreFarmacia}}
  </p>
</body>
</html>`,
  },
  modificacion: {
    nombre: 'Modificación de Cita',
    asunto: 'Tu cita ha sido modificada - {{tipoServicio}}',
    contenidoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Modificada</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  {{bloqueLogo}}
  <div style="background-color: {{colorSecundario}}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">📝 Cita Modificada</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>{{nombrePaciente}}</strong>,</p>
    
    <p>Tu cita ha sido modificada. Aquí tienes los nuevos detalles:</p>
    
    <div style="background-color: #eff6ff; padding: 20px; margin: 20px 0; border-left: 4px solid {{colorSecundario}}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Nueva fecha:</strong> {{fechaCita}}</p>
      <p style="margin: 5px 0;"><strong>🕐 Nueva hora:</strong> {{horaCita}}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> {{tipoServicio}}</p>
    </div>
    
    <p>Por favor, llegue con unos minutos de antelación.</p>
    
    {{bloqueCancelar}}
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>{{nombreFarmacia}}</strong></p>
      <p style="margin: 3px 0;">{{direccionFarmacia}}</p>
      <p style="margin: 3px 0;">📞 {{telefonoFarmacia}}{{bloqueWhatsapp}}{{bloqueTelefono}}</p>
      <p style="margin: 3px 0;">✉️ {{emailFarmacia}}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © {{anioActual}} {{nombreFarmacia}}
  </p>
</body>
</html>`,
  },
  rechazo: {
    nombre: 'Solicitud online no disponible',
    asunto: 'No hemos podido confirmar tu cita - {{tipoServicio}}',
    contenidoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de cita</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  {{bloqueLogo}}
  <div style="background-color: {{colorPrimario}}; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Solicitud de cita</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 16px;">Hola <strong>{{nombrePaciente}}</strong>,</p>
    
    <p>Sentimos no poder confirmar la cita que solicitaste:</p>
    
    <div style="background-color: #f8f4fa; padding: 20px; margin: 20px 0; border-left: 4px solid {{colorPrimario}}; border-radius: 0 8px 8px 0;">
      <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> {{fechaCita}}</p>
      <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> {{horaCita}}</p>
      <p style="margin: 5px 0;"><strong>💊 Servicio:</strong> {{tipoServicio}}</p>
      {{bloqueMotivo}}
    </div>
    
    <p>Puedes pedir otro horario o ponerte en contacto con nosotros.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      {{bloqueSolicitarCita}}
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <div style="color: #666; font-size: 14px;">
      <p><strong>{{nombreFarmacia}}</strong></p>
      <p style="margin: 3px 0;">{{direccionFarmacia}}</p>
      <p style="margin: 3px 0;">📞 {{telefonoFarmacia}}{{bloqueWhatsapp}}{{bloqueTelefono}}</p>
      <p style="margin: 3px 0;">✉️ {{emailFarmacia}}</p>
    </div>
  </div>
  
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © {{anioActual}} {{nombreFarmacia}}
  </p>
</body>
</html>`,
  },
  cumpleanos: {
    nombre: 'Felicitación de Cumpleaños',
    asunto: '¡Feliz cumpleaños, {{nombrePaciente}}! 🎉',
    contenidoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feliz cumpleaños</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; padding: 16px 0;">{{bloqueLogo}}</div>
    <div style="background: {{colorPrimario}}; color: white; padding: 30px; text-align: center;">
      <p style="font-size: 44px; margin: 0;">🎉</p>
      <h1 style="margin: 8px 0 0; font-size: 26px;">¡Feliz cumpleaños, {{nombrePaciente}}!</h1>
    </div>
    <div style="padding: 30px; text-align: center;">
      <p style="font-size: 16px;">Todo el equipo de <strong>{{nombreFarmacia}}</strong> te desea un día estupendo.</p>
      <p>Gracias por confiar en nosotros para cuidar de tu salud. ¡Te esperamos pronto!</p>
    </div>
    <div style="padding: 16px 30px; border-top: 1px solid #eee; font-size: 13px; color: #666; text-align: center;">
      {{nombreFarmacia}} · {{direccionFarmacia}}{{bloqueTelefono}}{{bloqueWhatsapp}}
    </div>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    © {{anioActual}} {{nombreFarmacia}}
  </p>
</body>
</html>`,
  },
};

// Lista de variables disponibles para las plantillas
export const VARIABLES_DISPONIBLES = [
  { nombre: 'nombrePaciente', descripcion: 'Nombre del paciente' },
  { nombre: 'fechaCita', descripcion: 'Fecha de la cita (formateada)' },
  { nombre: 'horaCita', descripcion: 'Hora de la cita' },
  { nombre: 'tipoServicio', descripcion: 'Tipo de servicio (Dermocosmética, etc.)' },
  { nombre: 'nombreFarmacia', descripcion: 'Nombre de la farmacia' },
  { nombre: 'direccionFarmacia', descripcion: 'Dirección completa' },
  { nombre: 'telefonoFarmacia', descripcion: 'Teléfono de contacto' },
  { nombre: 'emailFarmacia', descripcion: 'Email de contacto' },
  { nombre: 'webFarmacia', descripcion: 'URL de la web' },
  { nombre: 'urlSolicitarCita', descripcion: 'URL para solicitar nueva cita en la farmacia' },
  { nombre: 'urlWhatsapp', descripcion: 'Enlace WhatsApp (si configurado)' },
  { nombre: 'urlTelefono', descripcion: 'Enlace tel: para llamar (si configurado)' },
  { nombre: 'logoFarmacia', descripcion: 'URL del logo (para img src)' },
  { nombre: 'bloqueLogo', descripcion: 'Bloque HTML con logo (vacío si no hay logo)' },
  { nombre: 'bloqueWhatsapp', descripcion: 'Enlace WhatsApp o vacío (para pie de contacto)' },
  { nombre: 'bloqueTelefono', descripcion: 'Enlace llamar o vacío (para pie de contacto)' },
  { nombre: 'bloqueCancelar', descripcion: 'Enlace "cancelar mi cita" (solo citas de la reserva online; vacío si no aplica)' },
  { nombre: 'bloqueSolicitarCita', descripcion: 'Botón "Solicitar nueva cita" (vacío si no hay página de reserva ni web)' },
  { nombre: 'bloqueMotivo', descripcion: 'Motivo del rechazo o cancelación, si se indicó' },
  { nombre: 'motivoRechazo', descripcion: 'Motivo del rechazo (texto)' },
  { nombre: 'urlCancelar', descripcion: 'URL para cancelar la cita (solo reserva online)' },
  { nombre: 'colorPrimario', descripcion: 'Color primario del tema de la farmacia' },
  { nombre: 'colorSecundario', descripcion: 'Color secundario del tema' },
  { nombre: 'colorAcento', descripcion: 'Color de acento' },
  { nombre: 'anioActual', descripcion: 'Año actual (para copyright)' },
];

// ==========================================
// ESQUEMAS DE VALIDACIÓN
// ==========================================

const actualizarPlantillaSchema = z.object({
  nombre: z.string().min(1).optional(),
  asunto: z.string().min(1).optional(),
  contenidoHtml: z.string().min(1).optional(),
  contenidoTexto: z.string().optional(),
  activa: z.boolean().optional(),
});

// ==========================================
// CONTROLADORES
// ==========================================

/**
 * Obtiene todas las plantillas
 */
export async function obtenerPlantillas(req: Request, res: Response) {
  try {
    // Asegurar que existan las plantillas por defecto
    await asegurarPlantillasDefault();

    const plantillas = await prisma.plantillaEmail.findMany({
      orderBy: { tipo: 'asc' },
    });

    res.json(plantillas);
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
}

/**
 * Obtiene una plantilla por tipo
 */
export async function obtenerPlantilla(req: Request, res: Response) {
  try {
    const tipo = getParamString(req.params.tipo);
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo de plantilla requerido' });
    }

    const plantilla = await prisma.plantillaEmail.findUnique({
      where: { tipo },
    });

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json(plantilla);
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
}

/**
 * Actualiza una plantilla
 */
export async function actualizarPlantilla(req: Request, res: Response) {
  try {
    const tipo = getParamString(req.params.tipo);
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo de plantilla requerido' });
    }

    const validacion = actualizarPlantillaSchema.safeParse(req.body);
    if (!validacion.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        ...(process.env.NODE_ENV === 'development' && { detalles: validacion.error.errors }),
      });
    }

    const plantilla = await prisma.plantillaEmail.update({
      where: { tipo },
      data: validacion.data,
    });

    res.json(plantilla);
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
}

/**
 * Restaura una plantilla a su valor por defecto
 */
export async function restaurarPlantillaPorDefecto(req: Request, res: Response) {
  try {
    const tipo = getParamString(req.params.tipo) as keyof typeof PLANTILLAS_DEFAULT;
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo de plantilla requerido' });
    }

    const plantillaDefault = PLANTILLAS_DEFAULT[tipo];
    if (!plantillaDefault) {
      return res.status(404).json({ error: 'Plantilla por defecto no encontrada' });
    }

    const plantilla = await prisma.plantillaEmail.update({
      where: { tipo },
      data: {
        nombre: plantillaDefault.nombre,
        asunto: plantillaDefault.asunto,
        contenidoHtml: plantillaDefault.contenidoHtml,
      },
    });

    res.json(plantilla);
  } catch (error) {
    console.error('Error al restaurar plantilla:', error);
    res.status(500).json({ error: 'Error al restaurar plantilla' });
  }
}

/**
 * Obtiene las variables disponibles para las plantillas
 */
export async function obtenerVariablesDisponibles(req: Request, res: Response) {
  res.json(VARIABLES_DISPONIBLES);
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Asegura que existan las plantillas por defecto en la BD
 */
export async function asegurarPlantillasDefault() {
  for (const [tipo, datos] of Object.entries(PLANTILLAS_DEFAULT)) {
    const existe = await prisma.plantillaEmail.findUnique({
      where: { tipo },
    });

    if (!existe) {
      await prisma.plantillaEmail.create({
        data: {
          tipo,
          nombre: datos.nombre,
          asunto: datos.asunto,
          contenidoHtml: datos.contenidoHtml,
          activa: true,
        },
      });
      console.log(`📧 Plantilla '${tipo}' creada por defecto`);
    }
  }
}
