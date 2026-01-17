import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  obtenerCalendarios,
} from '../services/googleCalendar.js';

/**
 * Iniciar flujo OAuth - redirigir a Google
 */
export async function iniciarOAuth(req: Request, res: Response) {
  try {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error al iniciar OAuth:', error);
    res.status(500).json({ error: 'Error al iniciar autenticación con Google' });
  }
}

/**
 * Callback OAuth - recibir código y guardar tokens
 */
export async function callbackOAuth(req: Request, res: Response) {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de autorización no proporcionado' });
    }

    const { accessToken, refreshToken, expiryDate } = await exchangeCodeForTokens(code);

    // Guardar tokens en configuración
    await prisma.configuracion.update({
      where: { id: 'config' },
      data: {
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleTokenExpiry: expiryDate,
        googleCalendarEnabled: true,
      },
    });

    // Redirigir a frontend con éxito
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/configuracion?googleCalendar=success`);
  } catch (error) {
    console.error('Error en callback OAuth:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/configuracion?googleCalendar=error`);
  }
}

/**
 * Obtener estado de la conexión
 */
export async function obtenerEstado(req: Request, res: Response) {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: 'config' },
      select: {
        googleCalendarEnabled: true,
        googleCalendarId: true,
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    });

    res.json({
      enabled: config?.googleCalendarEnabled || false,
      calendarId: config?.googleCalendarId || null,
      connected: !!(config?.googleAccessToken && config?.googleRefreshToken),
    });
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({ error: 'Error al obtener estado de Google Calendar' });
  }
}

/**
 * Obtener lista de calendarios disponibles
 */
export async function listarCalendarios(req: Request, res: Response) {
  try {
    const calendarios = await obtenerCalendarios();
    res.json(calendarios.map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary,
    })));
  } catch (error) {
    console.error('Error al listar calendarios:', error);
    res.status(500).json({ error: 'Error al obtener calendarios' });
  }
}

/**
 * Configurar calendario a usar
 */
export async function configurarCalendario(req: Request, res: Response) {
  try {
    const { calendarId } = req.body;

    if (!calendarId) {
      return res.status(400).json({ error: 'calendarId es requerido' });
    }

    await prisma.configuracion.update({
      where: { id: 'config' },
      data: {
        googleCalendarId: calendarId,
        googleCalendarEnabled: true,
      },
    });

    res.json({ message: 'Calendario configurado correctamente' });
  } catch (error) {
    console.error('Error al configurar calendario:', error);
    res.status(500).json({ error: 'Error al configurar calendario' });
  }
}

/**
 * Desconectar Google Calendar
 */
export async function desconectar(req: Request, res: Response) {
  try {
    await prisma.configuracion.update({
      where: { id: 'config' },
      data: {
        googleCalendarEnabled: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
      },
    });

    res.json({ message: 'Google Calendar desconectado correctamente' });
  } catch (error) {
    console.error('Error al desconectar:', error);
    res.status(500).json({ error: 'Error al desconectar Google Calendar' });
  }
}
