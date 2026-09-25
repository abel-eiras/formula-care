import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RespuestasFindrisc } from '@/lib/riesgo/findrisc';
import type { AnalisisBio } from '@/types';


/** Lo que se envía al guardar: el FINDRISC va como objeto (se lee como JSON) */
export type DatosAnalisisBio = Omit<AnalisisBio, 'id' | 'createdAt' | 'updatedAt' | 'paciente' | 'imc' | 'icc' | 'findrisc'> & {
  findrisc?: RespuestasFindrisc | null;
};

/**
 * Hook para obtener todos los análisis bioquímicos de un paciente
 */
export function useAnalisisBioPorPaciente(pacienteId: string | undefined) {
  return useQuery({
    queryKey: ['analisisBio', 'paciente', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return [];
      return api.get<AnalisisBio[]>(`/servicios/bio/paciente/${pacienteId}`);
    },
    enabled: !!pacienteId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un análisis bioquímico por ID
 */
export function useAnalisisBio(id: string | undefined) {
  return useQuery({
    queryKey: ['analisisBio', id],
    queryFn: async () => {
      if (!id) throw new Error('ID requerido');
      return api.get<AnalisisBio>(`/servicios/bio/${id}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para crear un análisis bioquímico
 */
export function useCrearAnalisisBio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nuevoAnalisis: DatosAnalisisBio) => {
      return api.post<AnalisisBio>('/servicios/bio', nuevoAnalisis);
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['analisisBio'] });
      queryClient.invalidateQueries({ queryKey: ['analisisBio', 'paciente', variables.pacienteId] });
      queryClient.invalidateQueries({ queryKey: ['paciente', variables.pacienteId] });
      // Las medidas del análisis viven en el historial único de mediciones
      queryClient.invalidateQueries({ queryKey: ['mediciones'] });
    },
  });
}

/**
 * Hook para actualizar un análisis bioquímico
 */
export function useActualizarAnalisisBio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...datos }: Partial<DatosAnalisisBio> & { id: string }) => {
      return api.put<AnalisisBio>(`/servicios/bio/${id}`, datos);
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['analisisBio'] });
      queryClient.invalidateQueries({ queryKey: ['analisisBio', variables.id] });
      if (variables.pacienteId) {
        queryClient.invalidateQueries({ queryKey: ['analisisBio', 'paciente', variables.pacienteId] });
      }
      queryClient.invalidateQueries({ queryKey: ['mediciones'] });
    },
  });
}
