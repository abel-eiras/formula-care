import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DatosPrograma,
  DatosRegistro,
  DatosVisita,
  ProgramaNutricion,
  ProgramaNutricionDetalle,
  ProgramaNutricionResumen,
  RegistroAlimentacion,
  VisitaNutricion,
} from "@/types";

const CLAVE = "nutricion";

/**
 * Programas de nutrición de un paciente (con visitas), más recientes primero
 */
export function useProgramasNutricion(pacienteId: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "programas", pacienteId],
    queryFn: () => api.get<ProgramaNutricionResumen[]>(`/nutricion/programas?pacienteId=${pacienteId}`),
    enabled: !!pacienteId,
  });
}

/**
 * Programa completo: datos de partida, visitas y registro de alimentación
 */
export function useProgramaNutricion(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "programa", id],
    queryFn: () => api.get<ProgramaNutricionDetalle>(`/nutricion/programas/${id}`),
    enabled: !!id,
  });
}

export function useVisitaNutricion(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "visita", id],
    queryFn: () => api.get<VisitaNutricion>(`/nutricion/visitas/${id}`),
    enabled: !!id,
  });
}

/**
 * Cualquier cambio en el módulo invalida todo lo de nutrición: los datos
 * están muy relacionados (el resumen del programa depende de visitas y registros)
 * y el volumen es pequeño, así que no compensa invalidar con más precisión.
 */
function useInvalidarNutricion() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [CLAVE] }),
      // Las medidas de las visitas viven en el historial único de mediciones
      queryClient.invalidateQueries({ queryKey: ["mediciones"] }),
    ]);
}

export function useCrearProgramaNutricion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: (datos: DatosPrograma) => api.post<ProgramaNutricion>("/nutricion/programas", datos),
    onSuccess: invalidar,
  });
}

export function useActualizarProgramaNutricion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: ({ id, ...datos }: Partial<DatosPrograma> & { id: string }) =>
      api.put<ProgramaNutricion>(`/nutricion/programas/${id}`, datos),
    onSuccess: invalidar,
  });
}

export function useCrearVisitaNutricion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: (datos: DatosVisita) => api.post<VisitaNutricion>("/nutricion/visitas", datos),
    onSuccess: invalidar,
  });
}

export function useActualizarVisitaNutricion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: ({ id, ...datos }: Partial<DatosVisita> & { id: string }) =>
      api.put<VisitaNutricion>(`/nutricion/visitas/${id}`, datos),
    onSuccess: invalidar,
  });
}

export function useEliminarVisitaNutricion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/nutricion/visitas/${id}`),
    onSuccess: invalidar,
  });
}

export function useCrearRegistroAlimentacion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: (datos: DatosRegistro) => api.post<RegistroAlimentacion>("/nutricion/registros", datos),
    onSuccess: invalidar,
  });
}

export function useActualizarRegistroAlimentacion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: ({ id, ...datos }: Partial<DatosRegistro> & { id: string }) =>
      api.put<RegistroAlimentacion>(`/nutricion/registros/${id}`, datos),
    onSuccess: invalidar,
  });
}

export function useEliminarRegistroAlimentacion() {
  const invalidar = useInvalidarNutricion();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/nutricion/registros/${id}`),
    onSuccess: invalidar,
  });
}
