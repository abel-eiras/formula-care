import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { obtenerDisponibilidad, verificarDisponibilidad } from '../services/disponibilidadService.js';
import { 
  encryptPacienteData, 
  encryptSolicitudData,
  hashEmail 
} from '../services/encryptionService.js';

/**
 * Obtener textos legales públicos de una farmacia por su slug
 * GET /api/public/farmacia/:slug/legal/:tipo
 * tipo: 'aviso-legal' | 'privacidad' | 'cookies'
 */
export async function obtenerTextoLegalPublico(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;
    const tipo = req.params.tipo as string;

    if (!slug || !tipo) {
      return res.status(400).json({ error: 'Slug y tipo de documento requeridos' });
    }

    // Mapeo de tipo URL a campo de BD
    const camposLegales: Record<string, string> = {
      'aviso-legal': 'textoAvisoLegal',
      'privacidad': 'textoPoliticaPrivacidad',
      'cookies': 'textoPoliticaCookies',
    };

    const campo = camposLegales[tipo];
    if (!campo) {
      return res.status(404).json({ error: 'Tipo de documento no válido' });
    }

    // Obtener farmacia por slug
    const farmacia = await prisma.farmacia.findUnique({
      where: { slug },
      select: { id: true, nombre: true, activa: true },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    if (!farmacia.activa) {
      return res.status(403).json({ error: 'Esta farmacia no está disponible' });
    }

    // Obtener configuración RGPD
    const config = await prisma.configuracion.findUnique({
      where: { farmaciaId: farmacia.id },
      select: {
        farmaciaNombre: true,
        textoAvisoLegal: true,
        textoPoliticaPrivacidad: true,
        textoPoliticaCookies: true,
      },
    });

    const contenido = config ? (config as Record<string, string | null>)[campo] : null;

    res.json({
      farmacia: {
        slug,
        nombre: config?.farmaciaNombre || farmacia.nombre,
      },
      tipo,
      titulo: tipo === 'aviso-legal' ? 'Aviso Legal' 
            : tipo === 'privacidad' ? 'Política de Privacidad' 
            : 'Política de Cookies',
      contenido: contenido || null,
    });
  } catch (error) {
    console.error('Error al obtener texto legal:', error);
    res.status(500).json({ error: 'Error al obtener texto legal' });
  }
}

// Esquema de validación para solicitar cita
const solicitarCitaSchema = z.object({
  farmaciaSlug: z.string().min(1, 'El identificador de farmacia es requerido'),
  nombreCliente: z.string().min(1, 'El nombre es requerido'),
  emailCliente: z.string().email('Email inválido'),
  telefonoCliente: z.string().min(1, 'El teléfono es requerido'),
  tipo: z.enum(['dermo', 'bio', 'evento']),
  eventoId: z.string().optional(), // Requerido si tipo === 'evento'
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'),
  notas: z.string().optional(),
  captchaToken: z.string().optional(), // Token de reCAPTCHA Enterprise para validación server-side
});

// Site key del proyecto (debe coincidir con el frontend)
const RECAPTCHA_ENTERPRISE_SITE_KEY = process.env.RECAPTCHA_ENTERPRISE_SITE_KEY || '6Lc_wHosAAAAAF0_2KG7b0YqJNJVcot-RphIp1K1';
const RECAPTCHA_ENTERPRISE_ACTION = 'solicitar_cita';

/**
 * Verifica el token con reCAPTCHA Enterprise (API de assessments)
 * Documentación: https://cloud.google.com/recaptcha-enterprise/docs/rest
 */
async function verificarCaptchaEnterprise(token: string): Promise<boolean> {
  const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY;
  const projectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID || 'formulafarma';
  if (!apiKey) return true; // Si no está configurado, no bloquear

  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          token,
          expectedAction: RECAPTCHA_ENTERPRISE_ACTION,
          siteKey: RECAPTCHA_ENTERPRISE_SITE_KEY,
        },
      }),
    });
    if (!res.ok) {
      console.error('reCAPTCHA Enterprise API error:', res.status, await res.text());
      return false;
    }
    const data = (await res.json()) as {
      tokenProperties?: { valid: boolean; invalidReason?: string };
      event?: { expectedAction?: string };
    };
    const valid = data.tokenProperties?.valid === true;
    if (!valid && data.tokenProperties?.invalidReason) {
      console.warn('reCAPTCHA token invalid:', data.tokenProperties.invalidReason);
    }
    return valid;
  } catch (error) {
    console.error('Error al verificar reCAPTCHA Enterprise:', error);
    return false;
  }
}

/**
 * Obtener farmacia por slug (helper interno)
 */
async function obtenerFarmaciaPorSlug(slug: string) {
  const farmacia = await prisma.farmacia.findUnique({
    where: { slug },
    select: { id: true, nombre: true, activa: true },
  });
  return farmacia;
}

/**
 * Obtener datos públicos de una farmacia por su slug
 * GET /api/public/farmacia/:slug
 */
export async function obtenerFarmaciaPublica(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;

    if (!slug) {
      return res.status(400).json({ error: 'Slug de farmacia requerido' });
    }

    // Obtener farmacia con su configuración
    const farmacia = await prisma.farmacia.findUnique({
      where: { slug },
      include: {
        configuracion: {
          select: {
            farmaciaNombre: true,
            farmaciaLogo: true,
            farmaciaDireccion: true,
            farmaciaCiudad: true,
            farmaciaTelefono: true,
            farmaciaEmail: true,
            farmaciaWhatsapp: true,
            farmaciaWeb: true,
          },
        },
      },
    });

    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }

    if (!farmacia.activa) {
      return res.status(403).json({ error: 'Esta farmacia no está disponible actualmente' });
    }

    // Combinar datos de Farmacia con Configuracion (priorizar Configuracion si existe)
    const config = farmacia.configuracion;
    const datosPublicos = {
      slug: farmacia.slug,
      nombre: config?.farmaciaNombre || farmacia.nombre,
      logo: config?.farmaciaLogo || farmacia.logo,
      direccion: config?.farmaciaDireccion || farmacia.direccion,
      ciudad: config?.farmaciaCiudad || farmacia.ciudad,
      telefono: config?.farmaciaTelefono || farmacia.telefono,
      email: config?.farmaciaEmail || farmacia.email,
      whatsapp: config?.farmaciaWhatsapp || null,
      web: config?.farmaciaWeb || farmacia.web,
    };

    res.json(datosPublicos);
  } catch (error) {
    console.error('Error al obtener farmacia pública:', error);
    res.status(500).json({ error: 'Error al obtener datos de la farmacia' });
  }
}

/**
 * Obtener eventos activos de una farmacia por su slug
 * GET /api/public/farmacia/:slug/eventos
 */
export async function obtenerEventosFarmacia(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;

    const farmacia = await obtenerFarmaciaPorSlug(slug);
    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }
    if (!farmacia.activa) {
      return res.status(403).json({ error: 'Esta farmacia no está disponible' });
    }

    const hoy = new Date().toISOString().split('T')[0];

    const eventos = await prisma.evento.findMany({
      where: {
        farmaciaId: farmacia.id,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        fechas: true,
        horas: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filtrar eventos que tengan al menos una fecha futura
    const eventosActivos = eventos.filter((evento) => {
      const fechas = JSON.parse(evento.fechas) as string[];
      return fechas.some(f => f >= hoy);
    }).map((evento) => ({
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

/**
 * Obtener disponibilidad para un tipo de servicio en una fecha
 * GET /api/public/disponibilidad?farmaciaSlug=farmacia-pontevea&tipo=dermo&fecha=2026-01-20
 */
export async function obtenerDisponibilidadPublica(req: Request, res: Response) {
  try {
    const { farmaciaSlug, tipo, fecha, eventoId } = req.query;

    if (!farmaciaSlug || !tipo || !fecha) {
      return res.status(400).json({
        error: 'Parámetros requeridos: farmaciaSlug, tipo y fecha',
      });
    }

    // Verificar que la farmacia existe y está activa
    const farmacia = await obtenerFarmaciaPorSlug(farmaciaSlug as string);
    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }
    if (!farmacia.activa) {
      return res.status(403).json({ error: 'Esta farmacia no está disponible' });
    }

    // Si es evento, eventoId es requerido
    if (tipo === 'evento' && !eventoId) {
      return res.status(400).json({
        error: 'eventoId es requerido para tipo evento',
      });
    }

    const horasDisponibles = await obtenerDisponibilidad(
      tipo as string,
      fecha as string,
      eventoId as string | undefined,
      farmacia.id // Pasar farmaciaId al servicio
    );

    res.json({
      disponible: horasDisponibles.length > 0,
      horasDisponibles,
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
}

/**
 * Crear solicitud de cita desde página pública
 * POST /api/public/solicitar-cita
 */
export async function solicitarCita(req: Request, res: Response) {
  try {
    const datos = solicitarCitaSchema.parse(req.body);

    // Validar reCAPTCHA Enterprise si está configurado
    if (process.env.RECAPTCHA_ENTERPRISE_API_KEY) {
      const token = datos.captchaToken;
      if (!token) {
        return res.status(400).json({
          error: 'Verificación de seguridad requerida',
          codigo: 'CAPTCHA_REQUERIDO',
        });
      }
      const captchaValido = await verificarCaptchaEnterprise(token);
      if (!captchaValido) {
        return res.status(400).json({
          error: 'La verificación de seguridad ha fallado. Inténtalo de nuevo.',
          codigo: 'CAPTCHA_INVALIDO',
        });
      }
    }

    // Obtener farmacia por slug
    const farmacia = await obtenerFarmaciaPorSlug(datos.farmaciaSlug);
    if (!farmacia) {
      return res.status(404).json({ error: 'Farmacia no encontrada' });
    }
    if (!farmacia.activa) {
      return res.status(403).json({ error: 'Esta farmacia no está disponible' });
    }
    const farmaciaId = farmacia.id;

    // Verificar disponibilidad
    const disponible = await verificarDisponibilidad(datos.tipo, datos.fecha, datos.hora, farmaciaId);
    if (!disponible) {
      return res.status(400).json({
        error: 'La fecha y hora seleccionadas no están disponibles',
      });
    }

    // Obtener configuración del calendario
    let configCalendario = await prisma.configuracionCalendario.findUnique({
      where: { farmaciaId },
    });

    // Si no existe, crear con valores por defecto
    if (!configCalendario) {
      configCalendario = await prisma.configuracionCalendario.create({
        data: {
          farmaciaId,
          horariosPorTipo: '{}',
          fechasBloqueadas: '[]',
          horasBloqueadas: '{}',
          autoAceptar: false,
          duracionPorTipo: JSON.stringify({
            dermo: 30,
            bio: 45,
            consulta: 30,
            seguimiento: 20,
          }),
        },
      });
    }

    const autoAceptar = configCalendario.autoAceptar;

    // Buscar si el paciente ya existe por email en esta farmacia (usando hash)
    const emailHashCliente = hashEmail(datos.emailCliente);
    let paciente = await prisma.paciente.findFirst({
      where: {
        farmaciaId,
        emailHash: emailHashCliente,
      },
    });

    // Si no existe, crear el paciente (con datos mínimos y encriptados)
    if (!paciente) {
      // Encriptar datos sensibles del paciente
      const datosEncriptados = encryptPacienteData({
        name: datos.nombreCliente,
        email: datos.emailCliente,
        phone: datos.telefonoCliente,
      });
      
      paciente = await prisma.paciente.create({
        data: {
          farmaciaId,
          name: datosEncriptados.name!,
          email: datosEncriptados.email,
          emailHash: datosEncriptados.emailHash,
          phone: datosEncriptados.phone!,
          age: 0, // Se puede actualizar después
          sex: 'O', // Por defecto "Otro"
          origen: 'autoregistro',
        },
      });
    }

    let solicitud;
    let cita = null;

    // Encriptar datos de la solicitud
    const solicitudEncriptada = encryptSolicitudData({
      nombreCliente: datos.nombreCliente,
      emailCliente: datos.emailCliente,
      telefonoCliente: datos.telefonoCliente,
    });

    if (autoAceptar) {
      // Auto-aceptar: crear solicitud como aprobada y crear la cita
      solicitud = await prisma.solicitudCita.create({
        data: {
          farmaciaId,
          nombreCliente: solicitudEncriptada.nombreCliente!,
          emailCliente: solicitudEncriptada.emailCliente!,
          emailClienteHash: solicitudEncriptada.emailClienteHash!,
          telefonoCliente: solicitudEncriptada.telefonoCliente!,
          tipo: datos.tipo === 'evento' && datos.eventoId ? `evento:${datos.eventoId}` : datos.tipo,
          fecha: datos.fecha,
          hora: datos.hora,
          estado: 'aprobada',
          notas: datos.notas,
          pacienteId: paciente.id,
        },
      });

      // Crear la cita
      cita = await prisma.cita.create({
        data: {
          farmaciaId,
          titulo: `Cita ${datos.tipo} - ${datos.nombreCliente}`,
          pacienteId: paciente.id,
          fecha: datos.fecha,
          hora: datos.hora,
          tipo: datos.tipo === 'evento' && datos.eventoId ? `evento:${datos.eventoId}` : datos.tipo,
          notas: datos.notas || `Solicitud auto-aprobada desde página pública`,
        },
      });

      // Actualizar solicitud con el ID de la cita
      solicitud = await prisma.solicitudCita.update({
        where: { id: solicitud.id },
        data: { citaId: cita.id },
      });

      // Crear notificación
      await prisma.notificacion.create({
        data: {
          farmaciaId,
          tipo: 'cita',
          pacienteId: paciente.id,
          citaId: cita.id,
          titulo: `Cita ${datos.tipo} auto-aprobada`,
          mensaje: `Se ha creado una nueva cita ${datos.tipo} para ${datos.nombreCliente} el ${datos.fecha} a las ${datos.hora}`,
          canal: 'interno',
          enviada: false,
          leida: false,
        },
      });

      // Enviar email de confirmación
      const { enviarConfirmacionCita } = await import('../services/emailService.js');
      await enviarConfirmacionCita(datos.emailCliente, {
        citaId: cita.id,
        tipo: datos.tipo,
        fecha: datos.fecha,
        hora: datos.hora,
        nombreCliente: datos.nombreCliente,
      });
    } else {
      // Crear solicitud como pendiente (datos ya encriptados arriba)
      solicitud = await prisma.solicitudCita.create({
        data: {
          farmaciaId,
          nombreCliente: solicitudEncriptada.nombreCliente!,
          emailCliente: solicitudEncriptada.emailCliente!,
          emailClienteHash: solicitudEncriptada.emailClienteHash!,
          telefonoCliente: solicitudEncriptada.telefonoCliente!,
          tipo: datos.tipo === 'evento' && datos.eventoId ? `evento:${datos.eventoId}` : datos.tipo,
          fecha: datos.fecha,
          hora: datos.hora,
          estado: 'pendiente',
          notas: datos.notas,
          pacienteId: paciente.id,
        },
      });

      // Crear notificación para que el equipo la revise
      await prisma.notificacion.create({
        data: {
          farmaciaId,
          tipo: 'cita',
          pacienteId: paciente.id,
          titulo: `Nueva solicitud de cita ${datos.tipo}`,
          mensaje: `${datos.nombreCliente} ha solicitado una cita ${datos.tipo} para el ${datos.fecha} a las ${datos.hora}`,
          canal: 'interno',
          enviada: false,
          leida: false,
        },
      });
    }

    res.status(201).json({
      id: solicitud.id,
      estado: solicitud.estado,
      mensaje: autoAceptar
        ? 'Tu solicitud ha sido aprobada automáticamente. Recibirás un email de confirmación.'
        : 'Tu solicitud ha sido recibida. Te contactaremos pronto para confirmar la cita.',
      cita: cita
        ? {
            id: cita.id,
            fecha: cita.fecha,
            hora: cita.hora,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    console.error('Error al crear solicitud de cita:', error);
    res.status(500).json({ error: 'Error al crear solicitud de cita' });
  }
}
