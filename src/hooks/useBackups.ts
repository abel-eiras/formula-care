import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ConfigBackup {
  backupPeriodicidad: 'diaria' | 'semanal' | 'mensual' | 'desactivada';
  backupCifrado: boolean;
  backupUltimaEjecucion: string | null;
}

export interface BackupInfo {
  nombre: string;
  fecha: string;
  tamanoBytes: number;
}

/**
 * Hook para obtener la configuración de copias de seguridad
 */
export function useConfigBackup() {
  return useQuery({
    queryKey: ['configuracion', 'backup'],
    queryFn: async () => {
      return api.get<ConfigBackup>('/configuracion/backup');
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para actualizar periodicidad y/o cifrado de las copias de seguridad
 */
export function useActualizarConfigBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datos: {
      backupPeriodicidad?: ConfigBackup['backupPeriodicidad'];
      backupCifrado?: boolean;
      password?: string;
    }) => {
      return api.put<ConfigBackup>('/configuracion/backup', datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion', 'backup'] });
    },
  });
}

/**
 * Hook para listar las copias de seguridad existentes
 */
export function useListaBackups() {
  return useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      return api.get<BackupInfo[]>('/backups');
    },
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para generar una copia de seguridad ahora mismo
 */
export function useCrearBackupAhora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api.post<BackupInfo>('/backups', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['configuracion', 'backup'] });
    },
  });
}

/**
 * Hook para borrar una copia de seguridad
 */
export function useBorrarBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nombre: string) => {
      return api.delete(`/backups/${encodeURIComponent(nombre)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

/**
 * Hook para importar (restaurar) una copia de seguridad.
 * Sustituye TODOS los datos actuales — tras el éxito hay que reiniciar la app.
 */
export function useImportarBackup() {
  return useMutation({
    mutationFn: async ({ path, password }: { path: string; password?: string }) => {
      return api.post<{ mensaje: string }>('/backups/import', { path, password });
    },
  });
}
