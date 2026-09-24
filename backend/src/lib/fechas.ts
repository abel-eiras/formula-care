/**
 * Utilidades de fechas "YYYY-MM-DD" (formato en el que se guardan como texto).
 */

/** Fecha de hoy en hora local como "YYYY-MM-DD" */
export function hoyISO(hoy = new Date()): string {
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/**
 * Fecha de nacimiento más reciente para tener al menos `anios` años hoy.
 * Sirve para traducir filtros de edad a rangos de fecha de nacimiento:
 * edad >= N  ⇔  birthDate <= fechaHaceAnios(N).
 */
export function fechaHaceAnios(anios: number, hoy = new Date()): string {
  return `${String(hoy.getFullYear() - anios).padStart(4, '0')}${hoyISO(hoy).slice(4)}`;
}
