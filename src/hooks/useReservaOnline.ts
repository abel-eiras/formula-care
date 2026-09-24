import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ConfigReservaOnline {
  activa: boolean;
  urlPublica: string | null;
  urlApi: string | null;
  tokenSincronizacion: string | null;
  diasVista: number;
  antelacionMinimaHoras: number;
  ultimaSincronizacion: string | null;
  ultimoError: string | null;
  /** Huella de la clave pública (para comprobar que la web usa la de esta farmacia) */
  huellaClave: string | null;
}

export interface ResultadoSincronizacion {
  ok: boolean;
  omitida?: string;
  error?: string;
  solicitudesNuevas?: number;
  cancelaciones?: number;
  aceptadasAutomaticamente?: number;
  config: ConfigReservaOnline;
}

export interface PacienteCoincidente {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string;
}

export interface SolicitudOnline {
  id: string;
  tipo: string;
  fecha: string;
  hora: string;
  nombre: string;
  email: string;
  telefono: string;
  fechaNacimiento: string | null;
  sexo: "M" | "F" | "O" | null;
  notas: string | null;
  estado: "pendiente" | "aceptada" | "rechazada";
  recibidaEn: string;
  nombreEvento: string | null;
  coincidencias: PacienteCoincidente[];
}

const CLAVE_CONFIG = ["reserva-online", "config"];
const CLAVE_SOLICITUDES = ["reserva-online", "solicitudes"];

export function useConfigReservaOnline(habilitado = true) {
  return useQuery({
    queryKey: CLAVE_CONFIG,
    queryFn: () => api.get<ConfigReservaOnline>("/reserva-online/config"),
    enabled: habilitado,
  });
}

export function useActualizarConfigReservaOnline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: Partial<Omit<ConfigReservaOnline, "ultimaSincronizacion" | "ultimoError" | "huellaClave">>) =>
      api.put<ConfigReservaOnline>("/reserva-online/config", datos),
    onSuccess: (config) => queryClient.setQueryData(CLAVE_CONFIG, config),
  });
}

export function useRegenerarTokenReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ConfigReservaOnline>("/reserva-online/config/token", {}),
    onSuccess: (config) => queryClient.setQueryData(CLAVE_CONFIG, config),
  });
}

export function useSincronizarReservaOnline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ResultadoSincronizacion>("/reserva-online/sincronizar", {}),
    onSuccess: (resultado) => {
      queryClient.setQueryData(CLAVE_CONFIG, resultado.config);
      queryClient.invalidateQueries({ queryKey: CLAVE_SOLICITUDES });
      queryClient.invalidateQueries({ queryKey: ["citas"] });
    },
  });
}

/** Solicitudes pendientes; se refrescan solas porque la app las recoge cada pocos minutos */
export function useSolicitudesOnline() {
  return useQuery({
    queryKey: CLAVE_SOLICITUDES,
    queryFn: () => api.get<SolicitudOnline[]>("/reserva-online/solicitudes?estado=pendiente"),
    refetchInterval: 60 * 1000,
  });
}

function useInvalidarTrasResolver() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CLAVE_SOLICITUDES });
    queryClient.invalidateQueries({ queryKey: ["citas"] });
    queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
  };
}

export interface DatosAceptar {
  id: string;
  pacienteId?: string;
  nuevoPaciente?: { name?: string; sex?: "M" | "F" | "O"; birthDate?: string; phone?: string; email?: string };
}

export function useAceptarSolicitud() {
  const invalidar = useInvalidarTrasResolver();
  return useMutation({
    mutationFn: ({ id, ...datos }: DatosAceptar) => api.post(`/reserva-online/solicitudes/${id}/aceptar`, datos),
    onSuccess: invalidar,
  });
}

export function useRechazarSolicitud() {
  const invalidar = useInvalidarTrasResolver();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      api.post(`/reserva-online/solicitudes/${id}/rechazar`, { motivo }),
    onSuccess: invalidar,
  });
}
