import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalisisDermo } from '@/types';

/**
 * Hook para obtener todos los análisis dermocosméticos de un paciente
 */
export function useAnalisisDermoPorPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: ['analisisDermo', 'paciente', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return [];
      return api.get<AnalisisDermo[]>(`/servicios/dermo/paciente/${pacienteId}`);
    },
    enabled: !!pacienteId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un análisis dermocosmético por ID
 */
export function useAnalisisDermo(id: string | undefined) {
  return useQuery({
    queryKey: ['analisisDermo', id],
    queryFn: async () => {
      if (!id) throw new Error('ID requerido');
      return api.get<AnalisisDermo>(`/servicios/dermo/${id}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para crear un análisis dermocosmético
 */
export function useCrearAnalisisDermo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nuevoAnalisis: Omit<AnalisisDermo, 'id' | 'createdAt' | 'updatedAt' | 'paciente'>) => {
      return api.post<AnalisisDermo>('/servicios/dermo', nuevoAnalisis);
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['analisisDermo'] });
      queryClient.invalidateQueries({ queryKey: ['analisisDermo', 'paciente', variables.pacienteId] });
      queryClient.invalidateQueries({ queryKey: ['paciente', variables.pacienteId] });
    },
  });
}

/**
 * Hook para actualizar un análisis dermocosmético
 */
export function useActualizarAnalisisDermo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...datos }: Partial<AnalisisDermo> & { id: string }) => {
      return api.put<AnalisisDermo>(`/servicios/dermo/${id}`, datos);
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['analisisDermo'] });
      queryClient.invalidateQueries({ queryKey: ['analisisDermo', variables.id] });
      if (variables.pacienteId) {
        queryClient.invalidateQueries({ queryKey: ['analisisDermo', 'paciente', variables.pacienteId] });
      }
    },
  });
}
