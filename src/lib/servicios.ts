import type { ServicioPaciente } from "@/types";

/** Nombre corto de cada servicio para etiquetas y listados */
export const NOMBRE_SERVICIO: Record<ServicioPaciente, string> = {
  dermo: "Dermo",
  bio: "Bio",
  nutricion: "Nutrición",
};

/** Variante de Badge con la que se distingue cada servicio */
export const VARIANTE_SERVICIO: Record<ServicioPaciente, "default" | "secondary" | "outline"> = {
  dermo: "default",
  bio: "secondary",
  nutricion: "outline",
};
