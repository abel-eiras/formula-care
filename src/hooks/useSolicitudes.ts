import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SolicitudCita } from '@/types';

/**
 * Hook para obtener disponibilidad pública (sin autenticación)
 */
export function useDisponibilidad(tipo: string | null, fecha: string | null) {
  return useQuery({
    queryKey: ['disponibilidad', tipo, fecha],
    queryFn: async () => {
      if (!tipo || !fecha) {
        return { disponible: false, horasDisponibles: [] };
      }
      const response = await api.get<{ disponible: boolean; horasDisponibles: string[] }>(
        `/public/disponibilidad?tipo=${tipo}&fecha=${fecha}`
      );
      return response;
    },
    enabled: !!tipo && !!fecha,
    staleTime: 1 * 60 * 1000, // 1 minuto (disponibilidad cambia frecuentemente)
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook para crear solicitud de cita (público)
 */
export function useSolicitarCita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datos: {
      nombreCliente: string;
      emailCliente: string;
      telefonoCliente: string;
      tipo: 'dermo' | 'bio' | 'evento';
      eventoId?: string;
      fecha: string;
      hora: string;
      notas?: string;
    }) => {
      return api.post<{
        id: string;
        estado: 'pendiente' | 'aprobada' | 'rechazada';
        mensaje: string;
        cita: { id: string; fecha: string; hora: string } | null;
      }>('/public/solicitar-cita', datos);
    },
    onSuccess: () => {
      // Invalidar queries de disponibilidad para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['disponibilidad'] });
    },
  });
}

/**
 * Hook para obtener solicitudes (requiere autenticación)
 */
export function useSolicitudes(estado?: string) {
  return useQuery({
    queryKey: ['solicitudes', estado],
    queryFn: async () => {
      const url = estado ? `/solicitudes?estado=${estado}` : '/solicitudes';
      return api.get<SolicitudCita[]>(url);
    },
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para obtener una solicitud específica
 */
export function useSolicitud(id: string | null) {
  return useQuery({
    queryKey: ['solicitud', id],
    queryFn: async () => {
      if (!id) return null;
      return api.get<SolicitudCita>(`/solicitudes/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Hook para aprobar una solicitud
 */
export function useAprobarSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<{
        solicitud: SolicitudCita;
        cita: any;
        mensaje: string;
      }>(`/solicitudes/${id}/aprobar`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
      queryClient.invalidateQueries({ queryKey: ['citas'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

/**
 * Hook para rechazar una solicitud
 */
export function useRechazarSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      return api.post<{
        solicitud: SolicitudCita;
        mensaje: string;
      }>(`/solicitudes/${id}/rechazar`, { motivo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}
