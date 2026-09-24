/**
 * Utilidades para las fechas "YYYY-MM-DD" que usa la app (se guardan como
 * texto). Todo en hora local: new Date("YYYY-MM-DD") y toISOString() trabajan
 * en UTC y pueden desplazar la fecha un día según la zona horaria y la hora.
 */

/** Fecha de hoy (hora local) como "YYYY-MM-DD" */
export function hoyISO(hoy = new Date()): string {
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** Fecha "YYYY-MM-DD" (o ISO completa) a Date, fijando el mediodía local para no cambiar de día */
export function parsearFecha(fecha: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00` : fecha);
}

/** Texto relativo para una fecha pasada: "Hoy", "Ayer", "Hace 3 días" o "12 mar 2026" */
export function textoFechaRelativa(fecha: string, hoy = hoyISO()): string {
  const dias = Math.round((parsearFecha(hoy).getTime() - parsearFecha(fecha.slice(0, 10)).getTime()) / 86_400_000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias > 1 && dias < 7) return `Hace ${dias} días`;
  return parsearFecha(fecha.slice(0, 10)).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/** Suma días a una fecha "YYYY-MM-DD" */
export function sumarDias(fecha: string, dias: number): string {
  const d = parsearFecha(fecha);
  d.setDate(d.getDate() + dias);
  return hoyISO(d);
}
