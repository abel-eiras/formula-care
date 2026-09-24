import type { RolUsuario } from "@/hooks/useUsuarios";

/** Roles disponibles y qué permite cada uno (texto para la interfaz) */
export const ROLES: { id: RolUsuario; label: string; descripcion: string }[] = [
  { id: "admin", label: "Administrador", descripcion: "Todo, incluida la gestión de usuarios" },
  { id: "farmaceutico", label: "Farmacéutico/a", descripcion: "Pacientes, servicios y calendario" },
  { id: "usuario", label: "Personal", descripcion: "Pacientes, servicios y calendario" },
];

export const LONGITUD_MINIMA = 6;

export function mensajeError(error: unknown, porDefecto: string): string {
  return error instanceof Error ? error.message : porDefecto;
}
