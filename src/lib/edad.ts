/**
 * Edad del paciente. No se guarda en ningún sitio: se calcula siempre a
 * partir de la fecha de nacimiento ("YYYY-MM-DD") para que nunca quede
 * desfasada.
 */
export function calcularEdad(fechaNacimiento: string | null | undefined, hoy = new Date()): number | null {
  const partes = fechaNacimiento?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return null;
  // Se comparan año, mes y día por separado: new Date("YYYY-MM-DD") se
  // interpreta en UTC y en algunas zonas horarias daría el día anterior
  const [anio, mes, dia] = partes.slice(1).map(Number);
  let edad = hoy.getFullYear() - anio;
  const mesHoy = hoy.getMonth() + 1;
  if (mesHoy < mes || (mesHoy === mes && hoy.getDate() < dia)) edad--;
  return edad >= 0 ? edad : null;
}

/** Texto "N años" (o "Edad desconocida") listo para mostrar */
export function textoEdad(fechaNacimiento: string | null | undefined): string {
  const edad = calcularEdad(fechaNacimiento);
  return edad == null ? "Edad desconocida" : `${edad} años`;
}
