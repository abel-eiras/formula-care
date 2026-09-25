import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Configuración de correo tal como la devuelve el servidor (sin contraseñas) */
export interface ConfigCorreo {
  emailProvider: 'smtp' | 'resend';
  emailRemitente: string;
  emailNombreRemitente: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpAcceptSelfSigned: boolean;
  smtpUser: string;
  /** Hay una contraseña SMTP guardada (el valor nunca sale del servidor) */
  smtpPassGuardada: boolean;
  /** Hay una clave de Resend guardada */
  resendApiKeyGuardada: boolean;
}

/** Lo que se envía al guardar: las credenciales vacías conservan las guardadas */
export type DatosConfigCorreo = Omit<ConfigCorreo, 'smtpPassGuardada' | 'resendApiKeyGuardada'> & {
  smtpPass?: string;
  resendApiKey?: string;
};

export interface PasoDiagnosticoCorreo {
  paso: string;
  ok: boolean;
  mensaje?: string;
  sugerencia?: string;
}

export interface ResultadoPruebaCorreo {
  enviado: boolean;
  pasos: PasoDiagnosticoCorreo[];
  mensajeError?: string;
  sugerencia?: string;
}

const CLAVE = ['configuracion', 'correo'];

export function useConfigCorreo() {
  return useQuery({
    queryKey: CLAVE,
    queryFn: () => api.get<ConfigCorreo>('/configuracion/correo'),
  });
}

export function useActualizarConfigCorreo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosConfigCorreo) => api.put<ConfigCorreo>('/configuracion/correo', datos),
    onSuccess: (config) => queryClient.setQueryData(CLAVE, config),
  });
}

export function useProbarCorreo() {
  return useMutation({
    mutationFn: (destinatario: string) =>
      api.post<ResultadoPruebaCorreo>('/configuracion/correo/prueba', { destinatario }),
  });
}
