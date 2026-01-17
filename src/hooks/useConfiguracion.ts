import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Configuracion, ParametroReferencia } from '@/types';

/**
 * Hook para obtener la configuración
 */
export function useConfiguracion() {
  return useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      return api.get<Configuracion>('/configuracion');
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para actualizar datos de la farmacia
 */
export function useActualizarFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datos: Partial<Configuracion>) => {
      return api.put<Configuracion>('/configuracion/farmacia', datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
    },
  });
}

/**
 * Hook para actualizar parámetros de referencia
 */
export function useActualizarParametrosReferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parametros: Record<string, ParametroReferencia>) => {
      return api.put<Configuracion>('/configuracion/parametros', parametros);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
    },
  });
}

/**
 * Hook para actualizar estado de valoración bioquímica
 */
export function useActualizarValoracionBio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (valoracionBioActiva: boolean) => {
      return api.put<Configuracion>('/configuracion/valoracion-bio', { valoracionBioActiva });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
    },
  });
}

/**
 * Hook para actualizar credenciales OAuth de Google Calendar
 */
export function useActualizarCredencialesGoogle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credenciales: {
      googleClientId: string;
      googleClientSecret: string;
      googleRedirectUri?: string;
    }) => {
      return api.put<{ message: string; redirectUri: string }>(
        '/configuracion/google-credentials',
        credenciales
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
      queryClient.invalidateQueries({ queryKey: ['googleCalendar'] });
    },
  });
}

/**
 * Hook para obtener redirect URI sugerido
 */
export function useRedirectUri() {
  return useQuery({
    queryKey: ['configuracion', 'redirect-uri'],
    queryFn: async () => {
      const response = await api.get<{ redirectUri: string }>('/configuracion/google-redirect-uri');
      return response.redirectUri;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1, // Solo reintentar una vez si falla
    refetchOnWindowFocus: false, // No refetch al enfocar la ventana
  });
}

/**
 * Hook para actualizar configuración de Cal.com
 */
export function useActualizarCalCom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      calComEnabled?: boolean;
      calComLink?: string;
      calComApiKey?: string;
      calComWebhookSecret?: string;
    }) => {
      return api.put<{ message: string; config: Configuracion }>(
        '/configuracion/calcom',
        config
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
    },
  });
}
