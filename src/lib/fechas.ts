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

/** Suma días a una fecha "YYYY-MM-DD" */
export function sumarDias(fecha: string, dias: number): string {
  const d = parsearFecha(fecha);
  d.setDate(d.getDate() + dias);
  return hoyISO(d);
}
