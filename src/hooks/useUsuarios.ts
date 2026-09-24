import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type RolUsuario = "admin" | "farmaceutico" | "usuario";

export interface UsuarioGestion {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
}

const CLAVE = ["usuarios"];

/** Usuarios de la instalación (solo administradores) */
export function useUsuarios(habilitado: boolean) {
  return useQuery({
    queryKey: CLAVE,
    queryFn: () => api.get<UsuarioGestion[]>("/auth/usuarios"),
    enabled: habilitado,
  });
}

export function useCrearUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { nombre: string; email: string; password: string; rol: RolUsuario }) =>
      api.post("/auth/registro", datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

/** Cambiar nombre, rol, estado o restablecer la contraseña de otro usuario */
export function useActualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...datos }: { id: string; nombre?: string; rol?: RolUsuario; activo?: boolean; password?: string }) =>
      api.put<UsuarioGestion>(`/auth/usuarios/${id}`, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

export function useEliminarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/auth/usuarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

/** Cambiar la contraseña propia */
export function useCambiarMiPassword() {
  return useMutation({
    mutationFn: (datos: { passwordActual: string; passwordNueva: string }) => api.put("/auth/password", datos),
  });
}
