import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SolicitudCita } from '@/types';

/**
 * Tipo para datos públicos de una farmacia
 */
export interface FarmaciaPublica {
  slug: string;
  nombre: string | null;
  logo: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  whatsapp: string | null;
  web: string | null;
}

/**
 * Hook para obtener datos públicos de una farmacia por su slug
 */
export function useFarmaciaPublica(slug: string | null) {
  return useQuery({
    queryKey: ['farmacia-publica', slug],
    queryFn: async () => {
      if (!slug) return null;
      return api.get<FarmaciaPublica>(`/public/farmacia/${slug}`);
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });
}

/**
 * Hook para obtener eventos activos de una farmacia por su slug
 */
export function useEventosFarmacia(slug: string | null) {
  return useQuery({
    queryKey: ['eventos-farmacia', slug],
    queryFn: async () => {
      if (!slug) return [];
      return api.get<Array<{
        id: string;
        nombre: string;
        descripcion: string | null;
        fechas: string[];
        horas: string[];
      }>>(`/public/farmacia/${slug}/eventos`);
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });
}

/**
 * Hook para obtener disponibilidad pública (sin autenticación)
 */
export function useDisponibilidad(farmaciaSlug: string | null, tipo: string | null, fecha: string | null, eventoId?: string | null) {
  return useQuery({
    queryKey: ['disponibilidad', farmaciaSlug, tipo, fecha, eventoId],
    queryFn: async () => {
      if (!farmaciaSlug || !tipo || !fecha) {
        return { disponible: false, horasDisponibles: [] };
      }
      let url = `/public/disponibilidad?farmaciaSlug=${farmaciaSlug}&tipo=${tipo}&fecha=${fecha}`;
      if (eventoId) {
        url += `&eventoId=${eventoId}`;
      }
      const response = await api.get<{ disponible: boolean; horasDisponibles: string[] }>(url);
      return response;
    },
    enabled: !!farmaciaSlug && !!tipo && !!fecha,
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
      farmaciaSlug: string;
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
      return api.post<AprobarSolicitudResponse>(`/solicitudes/${id}/aprobar`);
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
