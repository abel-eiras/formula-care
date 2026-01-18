/**
 * Hook para gestionar plantillas de email
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlantillaEmail, VariablePlantilla } from '@/types';

const QUERY_KEY = 'plantillas-email';

/**
 * Obtiene todas las plantillas de email
 */
export function usePlantillasEmail() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api.get<PlantillaEmail[]>('/plantillas-email'),
  });
}

/**
 * Obtiene una plantilla específica por tipo
 */
export function usePlantillaEmail(tipo: string) {
  return useQuery({
    queryKey: [QUERY_KEY, tipo],
    queryFn: () => api.get<PlantillaEmail>(`/plantillas-email/${tipo}`),
    enabled: !!tipo,
  });
}

/**
 * Obtiene las variables disponibles para las plantillas
 */
export function useVariablesPlantilla() {
  return useQuery({
    queryKey: [QUERY_KEY, 'variables'],
    queryFn: () => api.get<VariablePlantilla[]>('/plantillas-email/variables'),
  });
}

/**
 * Actualiza una plantilla
 */
export function useActualizarPlantilla() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tipo, datos }: { tipo: string; datos: Partial<PlantillaEmail> }) =>
      api.put<PlantillaEmail>(`/plantillas-email/${tipo}`, datos),
    onSuccess: (_, { tipo }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tipo] });
    },
  });
}

/**
 * Restaura una plantilla a su valor por defecto
 */
export function useRestaurarPlantilla() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tipo: string) =>
      api.post<PlantillaEmail>(`/plantillas-email/${tipo}/restaurar`, {}),
    onSuccess: (_, tipo) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tipo] });
    },
  });
}
