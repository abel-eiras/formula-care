import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface GoogleCalendarEstado {
  enabled: boolean;
  calendarId: string | null;
  connected: boolean;
}

interface Calendario {
  id: string;
  summary: string;
  primary?: boolean;
}

/**
 * Hook para obtener estado de Google Calendar
 */
export function useGoogleCalendarEstado() {
  return useQuery({
    queryKey: ['googleCalendar', 'estado'],
    queryFn: async () => {
      return api.get<GoogleCalendarEstado>('/google-calendar/estado');
    },
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para obtener lista de calendarios
 */
export function useCalendarios() {
  return useQuery({
    queryKey: ['googleCalendar', 'calendarios'],
    queryFn: async () => {
      return api.get<Calendario[]>('/google-calendar/calendarios');
    },
    enabled: false, // Solo se ejecuta cuando se llama manualmente
  });
}

/**
 * Función para iniciar OAuth (no es un hook, se llama directamente)
 */
export async function iniciarOAuth(): Promise<string> {
  const response = await api.get<{ authUrl: string }>('/google-calendar/auth');
  return response.authUrl;
}

/**
 * Hook para configurar calendario
 */
export function useConfigurarCalendario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarId: string) => {
      return api.post('/google-calendar/calendario', { calendarId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleCalendar'] });
    },
  });
}

/**
 * Hook para desconectar Google Calendar
 */
export function useDesconectarGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api.post('/google-calendar/desconectar', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleCalendar'] });
    },
  });
}
