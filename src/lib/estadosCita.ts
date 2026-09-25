import type { EstadoCita } from "@/types";

/** Nombre y estilo de cada estado de una cita */
export const ESTADOS_CITA: Record<EstadoCita, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "" },
  confirmada: { label: "Confirmada", clase: "border-primary/40 text-primary" },
  completada: { label: "Realizada", clase: "border-success/40 text-success" },
  no_presentado: { label: "No se presentó", clase: "border-warning/60 text-warning" },
  cancelada: { label: "Cancelada", clase: "border-destructive/40 text-destructive" },
};
