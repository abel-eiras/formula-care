import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Evento } from '@/types';

/**
 * Hook para obtener todos los eventos (requiere autenticación)
 */
export function useEventos() {
  return useQuery({
    queryKey: ['eventos'],
    queryFn: async () => {
      return api.get<Evento[]>('/eventos');
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener eventos activos (público)
 */
export function useEventosActivos() {
  return useQuery({
    queryKey: ['eventos', 'activos'],
    queryFn: async () => {
      return api.get<Evento[]>('/eventos/activos');
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un evento por ID
 */
export function useEvento(id: string | null) {
  return useQuery({
    queryKey: ['evento', id],
    queryFn: async () => {
      if (!id) return null;
      return api.get<Evento>(`/eventos/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Hook para crear un evento
 */
export function useCrearEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datos: Omit<Evento, 'id' | 'createdAt' | 'updatedAt'>) => {
      return api.post<Evento>('/eventos', datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

/**
 * Hook para actualizar un evento
 */
export function useActualizarEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, datos }: { id: string; datos: Partial<Evento> }) => {
      return api.put<Evento>(`/eventos/${id}`, datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

/**
 * Hook para eliminar un evento
 */
export function useEliminarEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/eventos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}
