import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FarmaciaPublica {
  nombre: string | null;
  logo: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  whatsapp: string | null;
  web: string | null;
  colorPrimario: string;
  recaptchaSiteKey: string | null;
}

export interface EventoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  fechas: string[];
  horas: string[];
}

/** Datos públicos de branding/contacto de la (única) farmacia de este despliegue. */
export function useFarmaciaPublica() {
  return useQuery({
    queryKey: ['farmacia-publica'],
    queryFn: () => api.get<FarmaciaPublica>('/public/farmacia'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Eventos activos (talleres, jornadas, etc.). */
export function useEventosPublicos() {
  return useQuery({
    queryKey: ['eventos-publicos'],
    queryFn: () => api.get<EventoPublico[]>('/public/eventos'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Disponibilidad para un tipo de servicio (o evento) en una fecha. */
export function useDisponibilidad(tipo: string | null, fecha: string | null, eventoId?: string | null) {
  return useQuery({
    queryKey: ['disponibilidad', tipo, fecha, eventoId],
    queryFn: async () => {
      if (!tipo || !fecha) return { disponible: false, horasDisponibles: [] as string[] };
      let url = `/public/disponibilidad?tipo=${tipo}&fecha=${fecha}`;
      if (eventoId) url += `&eventoId=${eventoId}`;
      return api.get<{ disponible: boolean; horasDisponibles: string[] }>(url);
    },
    enabled: !!tipo && !!fecha,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export interface SolicitarCitaInput {
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  tipo: 'dermo' | 'bio' | 'consulta' | 'seguimiento' | 'evento';
  eventoId?: string;
  fecha: string;
  hora: string;
  notas?: string;
  captchaToken?: string;
}

export interface SolicitarCitaResultado {
  id: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  mensaje: string;
  cita: { id: string; fecha: string; hora: string } | null;
}

export function useSolicitarCita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: SolicitarCitaInput) => api.post<SolicitarCitaResultado>('/public/solicitar-cita', datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad'] });
    },
  });
}

export interface TextoLegalResponse {
  farmacia: { nombre: string | null };
  tipo: string;
  titulo: string;
  contenido: string | null;
}

export function useTextoLegal(tipo: string | null) {
  return useQuery({
    queryKey: ['legal-publico', tipo],
    queryFn: () => api.get<TextoLegalResponse>(`/public/legal/${tipo}`),
    enabled: !!tipo,
    staleTime: 5 * 60 * 1000,
  });
}

export interface DatosCitaToken {
  valido: boolean;
  error?: string;
  tipo?: 'confirmar' | 'modificar' | 'cancelar';
  cita?: {
    id: string;
    fecha: string;
    hora: string;
    tipo: string;
    estado: string;
    notas: string | null;
  };
  paciente?: { nombre: string; email?: string; telefono?: string };
}

export function verificarTokenCita(token: string) {
  return api.get<DatosCitaToken>(`/public/cita/verificar/${token}`);
}

export function confirmarCitaToken(token: string) {
  return api.post<{ success: boolean; message: string }>(`/public/cita/confirmar/${token}`, {});
}

export function cancelarCitaToken(token: string, motivo?: string) {
  return api.post<{ success: boolean; message: string }>(`/public/cita/cancelar/${token}`, { motivo });
}

export interface DatosModificacion {
  valido: boolean;
  error?: string;
  cita?: { id: string; fecha: string; hora: string; tipo: string };
  paciente?: { nombre: string };
}

export function obtenerDatosModificacion(token: string) {
  return api.get<DatosModificacion>(`/public/cita/modificar/${token}`);
}

export function modificarCitaToken(token: string, fecha: string, hora: string) {
  return api.post<{ success: boolean; message: string; error?: string }>(`/public/cita/modificar/${token}`, { fecha, hora });
}
