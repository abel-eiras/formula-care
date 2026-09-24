import { parsearFecha } from "./metricas";

/**
 * Utilidades de los formularios de nutrición: conversión entre el estado del
 * formulario (texto de los inputs) y los datos de la API, y formato de valores.
 */

// ==========================================
// CONVERSIÓN ENTRE ESTADO DEL FORMULARIO Y API
// ==========================================
// El estado guarda texto (lo que hay en el input); la API recibe número/null.

export function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function aEntero(valor: string): number | null {
  const n = aNumero(valor);
  return n == null ? null : Math.round(n);
}

export function aTexto(valor: string): string | null {
  return valor.trim() === "" ? null : valor.trim();
}

export function deNumero(valor?: number | null): string {
  return valor == null ? "" : String(valor);
}

// Reexportada para los formularios de nutrición (implementación común en @/lib/fechas)
export { hoyISO } from "@/lib/fechas";

// ==========================================
// FORMATO
// ==========================================

/** Diferencia respecto a la visita inicial, con signo */
export function formatearDiferencia(valor: number | null | undefined, unidad: string): string {
  if (valor == null) return "";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${formatearNumero(valor)} ${unidad}`;
}

export function formatearFecha(fecha?: string | null): string {
  if (!fecha) return "";
  return parsearFecha(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

/** Número con formato español (coma decimal), hasta 2 decimales */
export function formatearNumero(valor: number): string {
  return valor.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}
