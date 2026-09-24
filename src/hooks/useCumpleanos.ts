import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CanalFelicitacion, Cumpleanos } from "@/types";

/**
 * Cumpleaños de pacientes entre dos fechas (YYYY-MM-DD, incluidas)
 */
export function useCumpleanos(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["cumpleanos", desde, hasta],
    queryFn: () => api.get<Cumpleanos[]>(`/cumpleanos?desde=${desde}&hasta=${hasta}`),
    staleTime: 60 * 1000,
  });
}

/** Invalida cumpleaños y notificaciones (felicitar marca como leído el aviso) */
function useInvalidarCumpleanos() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cumpleanos"] }),
      queryClient.invalidateQueries({ queryKey: ["notificaciones"] }),
    ]);
}

/**
 * Registra la felicitación de un año. Con canal "email" el servidor envía
 * además el correo (y falla si no puede enviarlo).
 */
export function useFelicitar() {
  const invalidar = useInvalidarCumpleanos();
  return useMutation({
    mutationFn: ({ pacienteId, anio, canal }: { pacienteId: string; anio: number; canal: CanalFelicitacion }) =>
      api.post(`/cumpleanos/${pacienteId}/felicitacion`, { anio, canal }),
    onSuccess: invalidar,
  });
}

export function useDeshacerFelicitacion() {
  const invalidar = useInvalidarCumpleanos();
  return useMutation({
    mutationFn: ({ pacienteId, anio }: { pacienteId: string; anio: number }) =>
      api.delete(`/cumpleanos/${pacienteId}/felicitacion/${anio}`),
    onSuccess: invalidar,
  });
}
