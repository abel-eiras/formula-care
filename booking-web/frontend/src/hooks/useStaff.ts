import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SolicitudCita {
  id: string;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  tipo: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  notas: string | null;
  motivoRechazo: string | null;
  citaId: string | null;
  createdAt: string;
}

export function useStaffSession() {
  return useQuery({
    queryKey: ['staff-session'],
    queryFn: () => api.get<{ autenticado: boolean }>('/staff/session'),
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useStaffLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post<{ success: boolean }>('/staff/login', { password }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-session'] }),
  });
}

export function useStaffLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/staff/logout'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-session'] }),
  });
}

export function useSolicitudes(estado?: string) {
  return useQuery({
    queryKey: ['staff-solicitudes', estado],
    queryFn: () => api.get<SolicitudCita[]>(`/staff/solicitudes${estado ? `?estado=${estado}` : ''}`),
    staleTime: 15 * 1000,
  });
}

export function useAprobarSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/staff/solicitudes/${id}/aprobar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-solicitudes'] }),
  });
}

export function useRechazarSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => api.post(`/staff/solicitudes/${id}/rechazar`, { motivo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-solicitudes'] }),
  });
}

export interface ConfiguracionStaff {
  id: string;
  farmaciaNombre: string | null;
  farmaciaDireccion: string | null;
  farmaciaCiudad: string | null;
  farmaciaTelefono: string | null;
  farmaciaEmail: string | null;
  farmaciaWeb: string | null;
  farmaciaWhatsapp: string | null;
  farmaciaLogo: string | null;
  temaActivo: string | null;
  coloresMarca: string | null;
  textoAvisoLegal: string | null;
  textoPoliticaPrivacidad: string | null;
  textoPoliticaCookies: string | null;
  emailProvider: 'smtp' | 'resend';
  emailRemitente: string | null;
  emailNombreRemitente: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpAcceptSelfSigned: boolean;
  smtpUser: string | null;
  smtpPassConfigurada: boolean;
  resendApiKeyConfigurada: boolean;
  recaptchaSiteKey: string | null;
}

export function useConfiguracionStaff() {
  return useQuery({
    queryKey: ['staff-configuracion'],
    queryFn: () => api.get<ConfiguracionStaff>('/staff/configuracion'),
  });
}

export function useActualizarConfiguracionStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ConfiguracionStaff> & { smtpPass?: string; resendApiKey?: string }) =>
      api.put<ConfiguracionStaff>('/staff/configuracion', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-configuracion'] }),
  });
}

export interface ConfiguracionCalendarioStaff {
  id: string;
  horariosPorTipo: Record<string, Record<string, string[]>>;
  fechasBloqueadas: string[];
  horasBloqueadas: Record<string, string[]>;
  autoAceptar: boolean;
  duracionPorTipo: Record<string, number>;
}

export function useConfiguracionCalendarioStaff() {
  return useQuery({
    queryKey: ['staff-configuracion-calendario'],
    queryFn: () => api.get<ConfiguracionCalendarioStaff>('/staff/configuracion-calendario'),
  });
}

export function useActualizarConfiguracionCalendarioStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ConfiguracionCalendarioStaff>) => api.put<ConfiguracionCalendarioStaff>('/staff/configuracion-calendario', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-configuracion-calendario'] }),
  });
}
