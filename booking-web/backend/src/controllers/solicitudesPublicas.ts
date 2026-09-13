import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { obtenerDisponibilidad, verificarDisponibilidad } from '../services/disponibilidadService.js';
import { encryptContactoData, hashEmail } from '../services/encryptionService.js';
import { enviarConfirmacionCita } from '../services/emailService.js';

/**
 * GET /api/public/farmacia
 * Datos públicos de branding/contacto de la única farmacia de este despliegue.
 */
export async function obtenerFarmaciaPublica(_req: Request, res: Response) {
  try {
    const config = await prisma.configuracion.findUnique({ where: { id: 'singleton' } });

    res.json({
      nombre: config?.farmaciaNombre || null,
      logo: config?.farmaciaLogo || null,
      direccion: config?.farmaciaDireccion || null,
      ciudad: config?.farmaciaCiudad || null,
      telefono: config?.farmaciaTelefono || null,
      email: config?.farmaciaEmail || null,
      whatsapp: config?.farmaciaWhatsapp || null,
      web: config?.farmaciaWeb || null,
      colorPrimario: (() => {
        if (config?.temaActivo === 'custom' && config.coloresMarca) {
          try {
            return JSON.parse(config.coloresMarca).primario || '#79438f';
          } catch {
            return '#79438f';
          }
        }
        return '#79438f';
      })(),
      recaptchaSiteKey: config?.recaptchaSiteKey || process.env.RECAPTCHA_SITE_KEY || null,
    });
  } catch (error) {
    console.error('Error al obtener farmacia pública:', error);
    res.status(500).json({ error: 'Error al obtener datos de la farmacia' });
  }
}

/**
 * GET /api/public/eventos
 * Eventos activos con al menos una fecha futura.
 */
export async function obtenerEventosPublicos(_req: Request, res: Response) {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    const eventos = await prisma.evento.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, descripcion: true, fechas: true, horas: true },
      orderBy: { createdAt: 'desc' },
    });

    const eventosActivos = eventos
      .filter((evento) => (JSON.parse(evento.fechas) as string[]).some((f) => f >= hoy))
      .map((evento) => ({
        id: evento.id,
        nombre: evento.nombre,
        descripcion: evento.descripcion,
        fechas: JSON.parse(evento.fechas),
        horas: JSON.parse(evento.horas),
      }));

    res.json(eventosActivos);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
}

const CAMPOS_LEGALES: Record<string, 'textoAvisoLegal' | 'textoPoliticaPrivacidad' | 'textoPoliticaCookies'> = {
  'aviso-legal': 'textoAvisoLegal',
  privacidad: 'textoPoliticaPrivacidad',
  cookies: 'textoPoliticaCookies',
};

async function buscarLegal() {
  return prisma.configuracion.findUnique({
    where: { id: 'singleton' },
    select: {
      farmaciaNombre: true,
      textoAvisoLegal: true,
      textoPoliticaPrivacidad: true,
      textoPoliticaCookies: true,
    },
  });
}

/**
 * GET /api/public/legal/:tipo
 * tipo: 'aviso-legal' | 'privacidad' | 'cookies'
 */
export async function obtenerTextoLegalPublico(req: Request, res: Response) {
  try {
    const tipo = req.params.tipo as string;
    const campo = CAMPOS_LEGALES[tipo];
    if (!campo) {
      return res.status(404).json({ error: 'Tipo de documento no válido' });
    }

    const config = await buscarLegal();

    res.json({
      farmacia: { nombre: config?.farmaciaNombre || null },
      tipo,
      titulo: tipo === 'aviso-legal' ? 'Aviso Legal' : tipo === 'privacidad' ? 'Política de Privacidad' : 'Política de Cookies',
      contenido: config ? config[campo] : null,
    });
  } catch (error) {
    console.error('Error al obtener texto legal:', error);
    res.status(500).json({ error: 'Error al obtener texto legal' });
  }
}

/**
 * GET /api/public/disponibilidad?tipo=dermo&fecha=2026-01-20[&eventoId=...]
 */
export async function obtenerDisponibilidadPublica(req: Request, res: Response) {
  try {
    const { tipo, fecha, eventoId } = req.query;

    if (!tipo || !fecha) {
      return res.status(400).json({ error: 'Parámetros requeridos: tipo y fecha' });
    }

    if (tipo === 'evento' && !eventoId) {
      return res.status(400).json({ error: 'eventoId es requerido para tipo evento' });
    }

    const horasDisponibles = await obtenerDisponibilidad(tipo as string, fecha as string, eventoId as string | undefined);

    res.json({ disponible: horasDisponibles.length > 0, horasDisponibles });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message || 'Error al obtener disponibilidad' });
    }
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
}

// ==========================================
// reCAPTCHA Enterprise (opcional; solo se aplica si está configurado)
// ==========================================

const RECAPTCHA_ACTION = 'solicitar_cita';

async function verificarCaptchaEnterprise(token: string): Promise<boolean> {
  const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY;
  const projectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID;
  const siteKey = process.env.RECAPTCHA_SITE_KEY;
  if (!apiKey || !projectId || !siteKey) return true; // No configurado: no bloquear

  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: { token, expectedAction: RECAPTCHA_ACTION, siteKey } }),
    });
    if (!response.ok) {
      console.error('reCAPTCHA Enterprise API error:', response.status, await response.text());
      return false;
    }
    const data = (await response.json()) as { tokenProperties?: { valid: boolean } };
    return data.tokenProperties?.valid === true;
  } catch (error) {
    console.error('Error al verificar reCAPTCHA Enterprise:', error);
    return false;
  }
}

const solicitarCitaSchema = z.object({
  nombreCliente: z.string().min(1, 'El nombre es requerido'),
  emailCliente: z.string().email('Email inválido'),
  telefonoCliente: z.string().min(1, 'El teléfono es requerido'),
  tipo: z.enum(['dermo', 'bio', 'consulta', 'seguimiento', 'evento']),
  eventoId: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'),
  notas: z.string().optional(),
  captchaToken: z.string().optional(),
});

/**
 * POST /api/public/solicitar-cita
 * Crea una SolicitudCita. Si ConfiguracionCalendario.autoAceptar está activo,
 * la aprueba automáticamente y crea la Cita (y bloquea el hueco en este mismo
 * servicio, no en la app de escritorio — ver README).
 */
export async function solicitarCita(req: Request, res: Response) {
  try {
    const datos = solicitarCitaSchema.parse(req.body);

    if (process.env.RECAPTCHA_ENTERPRISE_API_KEY) {
      if (!datos.captchaToken) {
        return res.status(400).json({ error: 'Verificación de seguridad requerida', codigo: 'CAPTCHA_REQUERIDO' });
      }
      const captchaValido = await verificarCaptchaEnterprise(datos.captchaToken);
      if (!captchaValido) {
        return res.status(400).json({ error: 'La verificación de seguridad ha fallado. Inténtalo de nuevo.', codigo: 'CAPTCHA_INVALIDO' });
      }
    }

    if (datos.tipo === 'evento' && !datos.eventoId) {
      return res.status(400).json({ error: 'eventoId es requerido para tipo evento' });
    }

    const tipoFinal = datos.tipo === 'evento' && datos.eventoId ? `evento:${datos.eventoId}` : datos.tipo;

    const disponible = await verificarDisponibilidad(datos.tipo, datos.fecha, datos.hora, datos.eventoId);
    if (!disponible) {
      return res.status(400).json({ error: 'La fecha y hora seleccionadas no están disponibles' });
    }

    let configCalendario = await prisma.configuracionCalendario.findUnique({ where: { id: 'singleton' } });
    if (!configCalendario) {
      configCalendario = await prisma.configuracionCalendario.create({
        data: {
          id: 'singleton',
          horariosPorTipo: '{}',
          fechasBloqueadas: '[]',
          horasBloqueadas: '{}',
          autoAceptar: false,
          duracionPorTipo: JSON.stringify({ dermo: 30, bio: 45, consulta: 30, seguimiento: 20 }),
        },
      });
    }
    const autoAceptar = configCalendario.autoAceptar;
    const duracionPorTipo = JSON.parse(configCalendario.duracionPorTipo || '{}') as Record<string, number>;
    const duracion = duracionPorTipo[datos.tipo] || 30;

    const contactoEncriptado = encryptContactoData({
      nombreCliente: datos.nombreCliente,
      emailCliente: datos.emailCliente,
      telefonoCliente: datos.telefonoCliente,
    });

    let solicitud;
    let cita = null;

    if (autoAceptar) {
      cita = await prisma.cita.create({
        data: {
          nombreCliente: contactoEncriptado.nombreCliente!,
          emailCliente: contactoEncriptado.emailCliente!,
          emailClienteHash: contactoEncriptado.emailClienteHash!,
          telefonoCliente: contactoEncriptado.telefonoCliente!,
          fecha: datos.fecha,
          hora: datos.hora,
          tipo: tipoFinal,
          duracion,
          estado: 'pendiente',
          notas: datos.notas || 'Solicitud auto-aprobada desde página pública',
        },
      });

      solicitud = await prisma.solicitudCita.create({
        data: {
          nombreCliente: contactoEncriptado.nombreCliente!,
          emailCliente: contactoEncriptado.emailCliente!,
          emailClienteHash: contactoEncriptado.emailClienteHash!,
          telefonoCliente: contactoEncriptado.telefonoCliente!,
          tipo: tipoFinal,
          fecha: datos.fecha,
          hora: datos.hora,
          estado: 'aprobada',
          notas: datos.notas,
          citaId: cita.id,
        },
      });

      await enviarConfirmacionCita(datos.emailCliente, {
        citaId: cita.id,
        tipo: tipoFinal,
        fecha: datos.fecha,
        hora: datos.hora,
        nombreCliente: datos.nombreCliente,
      });
    } else {
      solicitud = await prisma.solicitudCita.create({
        data: {
          nombreCliente: contactoEncriptado.nombreCliente!,
          emailCliente: contactoEncriptado.emailCliente!,
          emailClienteHash: contactoEncriptado.emailClienteHash!,
          telefonoCliente: contactoEncriptado.telefonoCliente!,
          tipo: tipoFinal,
          fecha: datos.fecha,
          hora: datos.hora,
          estado: 'pendiente',
          notas: datos.notas,
        },
      });
    }

    res.status(201).json({
      id: solicitud.id,
      estado: solicitud.estado,
      mensaje: autoAceptar
        ? 'Tu solicitud ha sido aprobada automáticamente. Recibirás un email de confirmación.'
        : 'Tu solicitud ha sido recibida. Te contactaremos pronto para confirmar la cita.',
      cita: cita ? { id: cita.id, fecha: cita.fecha, hora: cita.hora } : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message || 'Error al crear la solicitud de cita' });
    }
    console.error('Error al crear solicitud de cita:', error);
    res.status(500).json({ error: 'Error al crear solicitud de cita' });
  }
}
