import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notificacion } from '@/types';

/**
 * Hook para obtener notificaciones
 */
export function useNotificaciones(leidas?: boolean, limit = 50) {
  return useQuery({
    queryKey: ['notificaciones', leidas, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (leidas !== undefined) params.append('leidas', leidas.toString());
      if (limit) params.append('limit', limit.toString());
      return api.get<Notificacion[]>(`/notificaciones?${params.toString()}`);
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener contador de notificaciones no leídas
 */
export function useContadorNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones', 'contador'],
    queryFn: async () => {
      const response = await api.get<{ count: number }>('/notificaciones/contador');
      return response.count;
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para marcar notificación como leída
 */
export function useMarcarNotificacionLeida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.put<Notificacion>(`/notificaciones/${id}/leida`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

/**
 * Hook para marcar todas las notificaciones como leídas
 */
export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api.put('/notificaciones/marcar-todas-leidas', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}
