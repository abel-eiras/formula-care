import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface EntradaRegistroAcceso {
  id: string;
  fecha: string;
  usuarioNombre: string;
  accion: string;
  recurso: string;
  pacienteId: string | null;
  pacienteNombre: string | null;
  detalle: string | null;
}

export interface FiltrosRegistroAccesos {
  texto?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
}

interface PaginaRegistro {
  entradas: EntradaRegistroAcceso[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Filtros como query string (sin los vacíos) */
export function queryFiltros(filtros: FiltrosRegistroAccesos): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') params.set(clave, String(valor));
  });
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export function useRegistroAccesos(filtros: FiltrosRegistroAccesos) {
  return useQuery({
    queryKey: ['registro-accesos', filtros],
    queryFn: () => api.get<PaginaRegistro>(`/registro-accesos${queryFiltros(filtros)}`),
    placeholderData: keepPreviousData,
  });
}

export function useActualizarSeguridad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { minutosInactividad: number }) => api.put('/configuracion/seguridad', datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracion'] }),
  });
}
