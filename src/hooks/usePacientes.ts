import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Paciente } from '@/types';

/**
 * Hook para gestionar la lista de pacientes
 * Usa React Query para caching y sincronización automática
 */
export function usePacientes() {
  return useQuery({
    queryKey: ['pacientes'],
    queryFn: async () => {
      return api.get<Paciente[]>('/pacientes');
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un paciente específico por ID
 */
export function usePaciente(id: string) {
  return useQuery({
    queryKey: ['paciente', id],
    queryFn: async () => {
      return api.get<Paciente>(`/pacientes/${id}`);
    },
    enabled: !!id, // Solo ejecutar si hay un ID
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para crear un nuevo paciente
 */
export function useCrearPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nuevoPaciente: Omit<Paciente, 'id' | 'createdAt' | 'updatedAt'>) => {
      return api.post<Paciente>('/pacientes', nuevoPaciente);
    },
    onSuccess: () => {
      // Invalidar y refrescar la lista de pacientes
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
    },
  });
}

/**
 * Hook para actualizar un paciente
 */
export function useActualizarPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...datos }: Partial<Paciente> & { id: string }) => {
      return api.put<Paciente>(`/pacientes/${id}`, datos);
    },
    onSuccess: (_, variables) => {
      // Invalidar tanto la lista como el paciente específico
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      queryClient.invalidateQueries({ queryKey: ['paciente', variables.id] });
    },
  });
}
