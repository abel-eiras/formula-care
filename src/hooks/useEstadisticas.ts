import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalisisDermo, Paciente } from '@/types';

/** Revisión programada en Dermo o en Nutrición */
export interface RevisionProxima extends Pick<AnalisisDermo, 'id' | 'pacienteId' | 'proximaRevision'> {
  servicio: 'dermo' | 'nutricion';
  paciente?: Pick<Paciente, 'id' | 'name' | 'phone' | 'email'>;
}

export interface Estadisticas {
  pacientes: {
    total: number;
    esteMes: number;
    tendencia: number;
  };
  analisisDermo: {
    esteMes: number;
    tendencia: number;
  };
  analisisBio: {
    esteMes: number;
    tendencia: number;
  };
  tasaRetorno: {
    valor: number;
    pacientesRecurrentes: number;
    totalPacientes: number;
  };
}

export interface EvolucionMes {
  mes: string;
  dermo: number;
  bio: number;
}

/**
 * Hook para obtener estadísticas generales
 */
export function useEstadisticas() {
  return useQuery({
    queryKey: ['estadisticas'],
    queryFn: async () => {
      return api.get<Estadisticas>('/estadisticas');
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener evolución de análisis
 */
export function useEvolucionAnalisis() {
  return useQuery({
    queryKey: ['estadisticas', 'evolucion'],
    queryFn: async () => {
      return api.get<EvolucionMes[]>('/estadisticas/evolucion');
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener pacientes recientes
 */
export function usePacientesRecientes(limit = 5) {
  return useQuery({
    queryKey: ['estadisticas', 'pacientes-recientes', limit],
    queryFn: async () => {
      return api.get<Paciente[]>(`/estadisticas/pacientes-recientes?limit=${limit}`);
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener próximas revisiones
 */
export function useProximasRevisiones(limit = 10) {
  return useQuery({
    queryKey: ['estadisticas', 'proximas-revisiones', limit],
    queryFn: async () => {
      return api.get<RevisionProxima[]>(`/estadisticas/proximas-revisiones?limit=${limit}`);
    },
    staleTime: 2 * 60 * 1000,
  });
}
