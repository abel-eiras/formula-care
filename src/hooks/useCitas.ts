import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Cita } from '@/types';

/**
 * Hook para obtener las citas de un día específico
 */
export function useCitas(fecha?: Date) {
  return useQuery({
    queryKey: ['citas', fecha?.toISOString()],
    queryFn: async () => {
      const params = fecha ? `?fecha=${fecha.toISOString().split('T')[0]}` : '';
      return api.get<Cita[]>(`/citas${params}`);
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (las citas cambian más frecuentemente)
  });
}

/**
 * Hook para crear una nueva cita
 */
export function useCrearCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nuevaCita: Omit<Cita, 'id' | 'createdAt'>) => {
      return api.post<Cita>('/citas', nuevaCita);
    },
    onSuccess: (data) => {
      // Invalidar las citas del día correspondiente
      const fecha = typeof data.fecha === 'string' ? new Date(data.fecha) : data.fecha;
      queryClient.invalidateQueries({ queryKey: ['citas', fecha.toISOString()] });
      queryClient.invalidateQueries({ queryKey: ['citas'] });
    },
  });
}

/**
 * Hook para eliminar una cita
 */
export function useEliminarCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/citas/${id}`);
      return { id };
    },
    onSuccess: () => {
      // Invalidar todas las queries de citas
      queryClient.invalidateQueries({ queryKey: ['citas'] });
    },
  });
}
