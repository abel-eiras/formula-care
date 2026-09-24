import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Medicion, Paciente } from '@/types';
import type { FiltrosPacientes } from '@/components/pacientes/FiltrosAvanzados';

/**
 * Hook para gestionar la lista de pacientes con filtros opcionales
 * Usa React Query para caching y sincronización automática
 */
export function usePacientes(filtros?: FiltrosPacientes) {
  return useQuery({
    queryKey: ['pacientes', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.email) params.append('email', filtros.email);
      if (filtros?.sexo) params.append('sexo', filtros.sexo);
      if (filtros?.origen) params.append('origen', filtros.origen);
      if (filtros?.edadMin !== undefined) params.append('edadMin', filtros.edadMin.toString());
      if (filtros?.edadMax !== undefined) params.append('edadMax', filtros.edadMax.toString());
      if (filtros?.tieneDermo) params.append('tieneDermo', 'true');
      if (filtros?.tieneBio) params.append('tieneBio', 'true');
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde.toISOString());
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta.toISOString());
      if (filtros?.ordenarPor) params.append('ordenarPor', filtros.ordenarPor);
      if (filtros?.orden) params.append('orden', filtros.orden);
      
      const queryString = params.toString();
      return api.get<Paciente[]>(`/pacientes${queryString ? `?${queryString}` : ''}`);
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

/**
 * Historial único de mediciones del paciente (peso, perímetros, bioimpedancia,
 * tensión...), venga del servicio que venga
 */
export function useMedicionesPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: ['mediciones', pacienteId],
    queryFn: () => api.get<Medicion[]>(`/pacientes/${pacienteId}/mediciones`),
    enabled: !!pacienteId,
  });
}
