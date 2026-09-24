import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cifrarSolicitud, type ClavePublicaFarmacia, type DatosPersonales } from '@/lib/cifrado';

/** Plazas libres por hora: { "09:00": 1 } */
export type HuecosDia = Record<string, number>;

export interface Reserva {
  farmacia: {
    nombre: string | null;
    direccion: string | null;
    ciudad: string | null;
    telefono: string | null;
    email: string | null;
    whatsapp: string | null;
    web: string | null;
    logo: string | null;
    colorPrimario: string;
  };
  servicios: { id: string; nombre: string; duracion: number }[];
  eventos: { id: string; nombre: string; descripcion: string | null; duracion: number }[];
  clavePublica: ClavePublicaFarmacia;
  /** tipo → fecha → hora → plazas */
  huecos: Record<string, Record<string, HuecosDia>>;
  hayTextosLegales: { avisoLegal: boolean; privacidad: boolean; cookies: boolean };
  captcha: string | null;
  actualizadaEn: string;
}

/** Todo lo que necesita la página: marca, servicios y huecos libres publicados por la farmacia */
export function useReserva() {
  return useQuery({
    queryKey: ['reserva'],
    queryFn: () => api.get<Reserva>('/public/reserva'),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export interface NuevaSolicitud {
  cita: { tipo: string; fecha: string; hora: string };
  datos: DatosPersonales;
  clavePublica: ClavePublicaFarmacia;
  captchaToken?: string;
}

/** Cifra los datos personales en el navegador y envía la solicitud */
export function useEnviarSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cita, datos, clavePublica, captchaToken }: NuevaSolicitud) => {
      const sobre = await cifrarSolicitud(datos, clavePublica, cita);
      return api.post<{ id: string }>('/public/solicitudes', { ...cita, sobre, captchaToken });
    },
    // Tanto si sale bien como si el hueco ya estaba cogido, refrescar huecos
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reserva'] }),
  });
}

export function useTextoLegal(tipo: string | null) {
  return useQuery({
    queryKey: ['legal', tipo],
    queryFn: () => api.get<{ titulo: string; farmacia: string | null; contenido: string | null }>(`/public/legal/${tipo}`),
    enabled: !!tipo,
    staleTime: 5 * 60 * 1000,
  });
}

export function solicitarCancelacion(token: string) {
  return api.post<{ recibida: boolean }>('/public/cancelaciones', { token });
}
