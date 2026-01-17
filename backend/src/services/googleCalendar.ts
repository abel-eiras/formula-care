import { google } from 'googleapis';
import { prisma } from '../lib/prisma.js';

/**
 * Obtener cliente OAuth2 configurado
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google-calendar/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar configurados en .env');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Obtener URL de autorización OAuth
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Necesario para obtener refresh token
    scope: scopes,
    prompt: 'consent', // Forzar consentimiento para obtener refresh token
  });
}

/**
 * Intercambiar código de autorización por tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}

/**
 * Obtener cliente de Calendar autenticado
 */
export async function getCalendarClient() {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!config?.googleAccessToken || !config?.googleRefreshToken) {
    throw new Error('Google Calendar no está configurado. Por favor, vincula tu cuenta primero.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: config.googleAccessToken,
    refresh_token: config.googleRefreshToken,
    expiry_date: config.googleTokenExpiry?.getTime(),
  });

  // Refrescar token si está expirado
  if (config.googleTokenExpiry && config.googleTokenExpiry <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Actualizar tokens en la base de datos
    await prisma.configuracion.update({
      where: { id: 'config' },
      data: {
        googleAccessToken: credentials.access_token,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });

    oauth2Client.setCredentials(credentials);
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Crear evento en Google Calendar
 */
export async function crearEventoEnCalendar(
  titulo: string,
  fecha: string, // ISO string
  hora: string, // "HH:mm"
  tipo: 'dermo' | 'bio' | 'consulta' | 'seguimiento',
  pacienteNombre: string,
  notas?: string
) {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' },
    select: { googleCalendarId: true },
  });

  if (!config?.googleCalendarEnabled || !config.googleCalendarId) {
    throw new Error('Google Calendar no está habilitado o no hay calendario configurado');
  }

  const calendar = await getCalendarClient();
  
  // Combinar fecha y hora
  const fechaHora = new Date(`${fecha}T${hora}:00`);
  const fechaHoraFin = new Date(fechaHora);
  fechaHoraFin.setHours(fechaHoraFin.getHours() + 1); // Duración de 1 hora por defecto

  // Colores según tipo de servicio
  const colorMap: Record<string, number> = {
    dermo: 9, // Azul
    bio: 10, // Verde
    consulta: 1, // Lavanda
    seguimiento: 5, // Amarillo
  };

  const evento = {
    summary: `${titulo} - ${pacienteNombre}`,
    description: notas || `Cita con ${pacienteNombre}`,
    start: {
      dateTime: fechaHora.toISOString(),
      timeZone: 'Europe/Madrid',
    },
    end: {
      dateTime: fechaHoraFin.toISOString(),
      timeZone: 'Europe/Madrid',
    },
    colorId: colorMap[tipo] || 1,
    extendedProperties: {
      private: {
        tipo: tipo,
        pacienteNombre: pacienteNombre,
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: config.googleCalendarId,
    requestBody: evento,
  });

  return response.data;
}

/**
 * Actualizar evento en Google Calendar
 */
export async function actualizarEventoEnCalendar(
  eventId: string,
  titulo: string,
  fecha: string,
  hora: string,
  tipo: 'dermo' | 'bio' | 'consulta' | 'seguimiento',
  pacienteNombre: string,
  notas?: string
) {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' },
    select: { googleCalendarId: true },
  });

  if (!config?.googleCalendarEnabled || !config.googleCalendarId) {
    throw new Error('Google Calendar no está habilitado');
  }

  const calendar = await getCalendarClient();
  
  const fechaHora = new Date(`${fecha}T${hora}:00`);
  const fechaHoraFin = new Date(fechaHora);
  fechaHoraFin.setHours(fechaHoraFin.getHours() + 1);

  const colorMap: Record<string, number> = {
    dermo: 9,
    bio: 10,
    consulta: 1,
    seguimiento: 5,
  };

  const evento = {
    summary: `${titulo} - ${pacienteNombre}`,
    description: notas || `Cita con ${pacienteNombre}`,
    start: {
      dateTime: fechaHora.toISOString(),
      timeZone: 'Europe/Madrid',
    },
    end: {
      dateTime: fechaHoraFin.toISOString(),
      timeZone: 'Europe/Madrid',
    },
    colorId: colorMap[tipo] || 1,
    extendedProperties: {
      private: {
        tipo: tipo,
        pacienteNombre: pacienteNombre,
      },
    },
  };

  const response = await calendar.events.update({
    calendarId: config.googleCalendarId,
    eventId: eventId,
    requestBody: evento,
  });

  return response.data;
}

/**
 * Eliminar evento de Google Calendar
 */
export async function eliminarEventoEnCalendar(eventId: string) {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' },
    select: { googleCalendarId: true },
  });

  if (!config?.googleCalendarEnabled || !config.googleCalendarId) {
    throw new Error('Google Calendar no está habilitado');
  }

  const calendar = await getCalendarClient();
  
  await calendar.events.delete({
    calendarId: config.googleCalendarId,
    eventId: eventId,
  });
}

/**
 * Obtener lista de calendarios disponibles
 */
export async function obtenerCalendarios() {
  const calendar = await getCalendarClient();
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}
