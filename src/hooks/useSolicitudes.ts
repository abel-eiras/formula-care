import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SolicitudCita } from '@/types';

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
 * Hook para obtener contador de solicitudes pendientes
 */
export function useSolicitudesPendientesCount() {
  const { data: solicitudes } = useSolicitudes('pendiente');
  return solicitudes?.length || 0;
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
// Tipo para la respuesta de aprobar solicitud
interface AprobarSolicitudResponse {
  solicitud: SolicitudCita;
  cita: {
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
    tipo: string;
  };
  mensaje: string;
}

export function useAprobarSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<AprobarSolicitudResponse>(`/solicitudes/${id}/aprobar`, {});
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
