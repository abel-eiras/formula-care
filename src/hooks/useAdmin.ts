/**
 * Hooks para el panel de administración de plataforma (Superadmin)
 * Gestión de farmacias, usuarios y estadísticas globales
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Farmacia,
  FarmaciaDetalle,
  CrearFarmaciaData,
  ActualizarFarmaciaData,
  EstadisticasPlataforma,
  ConfiguracionPlataforma,
  ActualizarConfiguracionPlataformaData,
  ConfiguracionFarmaciaAdmin,
  ActualizarConfiguracionFarmaciaData,
  Usuario,
} from '@/types';

// ==========================================
// QUERIES - FARMACIAS
// ==========================================

/**
 * Obtener lista de farmacias
 */
export function useFarmacias(filtros?: {
  activa?: boolean;
  plan?: string;
  busqueda?: string;
}) {
  const params = new URLSearchParams();
  if (filtros?.activa !== undefined) params.append('activa', String(filtros.activa));
  if (filtros?.plan) params.append('plan', filtros.plan);
  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);

  const queryString = params.toString();
  const url = `/admin/farmacias${queryString ? `?${queryString}` : ''}`;

  return useQuery<Farmacia[]>({
    queryKey: ['admin', 'farmacias', filtros],
    queryFn: () => api.get(url),
  });
}

/**
 * Obtener detalle de una farmacia
 */
export function useFarmacia(id: string) {
  return useQuery<FarmaciaDetalle>({
    queryKey: ['admin', 'farmacia', id],
    queryFn: () => api.get(`/admin/farmacias/${id}`),
    enabled: !!id,
  });
}

/**
 * Obtener usuarios de una farmacia
 */
export function useUsuariosFarmacia(farmaciaId: string) {
  return useQuery<Usuario[]>({
    queryKey: ['admin', 'farmacia', farmaciaId, 'usuarios'],
    queryFn: () => api.get(`/admin/farmacias/${farmaciaId}/usuarios`),
    enabled: !!farmaciaId,
  });
}

// ==========================================
// QUERIES - ESTADÍSTICAS
// ==========================================

/**
 * Obtener estadísticas globales de la plataforma
 */
export function useEstadisticasPlataforma() {
  return useQuery<EstadisticasPlataforma>({
    queryKey: ['admin', 'estadisticas'],
    queryFn: () => api.get('/admin/estadisticas'),
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
  });
}

/**
 * Obtener configuración SMTP/email de la plataforma
 */
export function useConfiguracionPlataforma() {
  return useQuery<ConfiguracionPlataforma>({
    queryKey: ['admin', 'configuracion-plataforma'],
    queryFn: () => api.get('/admin/configuracion-plataforma'),
  });
}

/**
 * Actualizar configuración SMTP/email de la plataforma
 */
export function useActualizarConfiguracionPlataforma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: ActualizarConfiguracionPlataformaData) =>
      api.put<ConfiguracionPlataforma>('/admin/configuracion-plataforma', datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'configuracion-plataforma'] });
    },
  });
}

/** Timeout en ms para la petición de envío de correo de prueba (evita botón cargando indefinido) */
const TIMEOUT_ENVIAR_PRUEBA_MS = 25_000;

/**
 * Enviar correo de prueba con la configuración SMTP de la plataforma
 * Usa AbortController para timeout; si el servidor tarda demasiado el botón deja de cargar
 */
export function useEnviarPruebaEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT_ENVIAR_PRUEBA_MS);
      try {
        return await api.post<import('@/types').ResultadoEnvioPruebaEmail>(
          '/admin/configuracion-plataforma/enviar-prueba',
          { email },
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(id);
      }
    },
  });
}

/**
 * Obtener configuración de una farmacia (superadmin)
 */
export function useConfiguracionFarmacia(farmaciaId: string | undefined) {
  return useQuery<ConfiguracionFarmaciaAdmin>({
    queryKey: ['admin', 'farmacia', farmaciaId, 'configuracion'],
    queryFn: () => api.get(`/admin/farmacias/${farmaciaId}/configuracion`),
    enabled: !!farmaciaId,
  });
}

/**
 * Actualizar configuración de una farmacia (superadmin)
 */
export function useActualizarConfiguracionFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      farmaciaId,
      datos,
    }: {
      farmaciaId: string;
      datos: ActualizarConfiguracionFarmaciaData;
    }) =>
      api.put<ConfiguracionFarmaciaAdmin>(
        `/admin/farmacias/${farmaciaId}/configuracion`,
        datos
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId, 'configuracion'],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId],
      });
    },
  });
}

// ==========================================
// MUTATIONS - FARMACIAS
// ==========================================

/**
 * Crear nueva farmacia
 */
export function useCrearFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: CrearFarmaciaData) =>
      api.post<{ mensaje: string; farmacia: Farmacia; admin: Usuario }>(
        '/admin/farmacias',
        datos
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacias'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'estadisticas'] });
    },
  });
}

/**
 * Actualizar farmacia existente
 */
export function useActualizarFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarFarmaciaData }) =>
      api.put<{ mensaje: string; farmacia: Farmacia }>(
        `/admin/farmacias/${id}`,
        datos
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacias'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacia', variables.id] });
    },
  });
}

/**
 * Desactivar farmacia
 */
export function useDesactivarFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ mensaje: string }>(`/admin/farmacias/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacias'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacia', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'estadisticas'] });
    },
  });
}

/**
 * Reactivar farmacia
 */
export function useActivarFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ mensaje: string }>(`/admin/farmacias/${id}/activar`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacias'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'farmacia', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'estadisticas'] });
    },
  });
}

// ==========================================
// MUTATIONS - USUARIOS DE FARMACIA
// ==========================================

/**
 * Crear usuario para una farmacia
 */
export function useCrearUsuarioFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      farmaciaId,
      datos,
    }: {
      farmaciaId: string;
      datos: {
        email: string;
        password?: string;
        nombre: string;
        rol?: 'admin' | 'farmaceutico' | 'usuario';
      };
    }) =>
      api.post<{ mensaje: string; usuario: Usuario }>(
        `/admin/farmacias/${farmaciaId}/usuarios`,
        datos
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId, 'usuarios'],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId],
      });
    },
  });
}

/**
 * Actualizar usuario de una farmacia
 */
export function useActualizarUsuarioFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      farmaciaId,
      usuarioId,
      datos,
    }: {
      farmaciaId: string;
      usuarioId: string;
      datos: {
        nombre?: string;
        rol?: 'admin' | 'farmaceutico' | 'usuario';
        activo?: boolean;
      };
    }) =>
      api.put<{ mensaje: string; usuario: Usuario }>(
        `/admin/farmacias/${farmaciaId}/usuarios/${usuarioId}`,
        datos
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId, 'usuarios'],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId],
      });
    },
  });
}

/**
 * Cambiar contraseña de un usuario
 */
export function useCambiarPasswordUsuario() {
  return useMutation({
    mutationFn: ({
      farmaciaId,
      usuarioId,
      password,
    }: {
      farmaciaId: string;
      usuarioId: string;
      password: string;
    }) =>
      api.put<{ mensaje: string }>(
        `/admin/farmacias/${farmaciaId}/usuarios/${usuarioId}/password`,
        { password }
      ),
  });
}

/**
 * Eliminar usuario de una farmacia
 */
export function useEliminarUsuarioFarmacia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      farmaciaId,
      usuarioId,
    }: {
      farmaciaId: string;
      usuarioId: string;
    }) => api.delete<void>(`/admin/farmacias/${farmaciaId}/usuarios/${usuarioId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId, 'usuarios'],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'farmacia', variables.farmaciaId],
      });
    },
  });
}
