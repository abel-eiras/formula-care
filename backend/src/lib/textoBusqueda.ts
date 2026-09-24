/**
 * Normalización para búsquedas de pacientes: minúsculas y sin tildes, para
 * que "maria" encuentre "María". SQLite solo ignora mayúsculas en ASCII, así
 * que se guarda una columna ya normalizada (Paciente.textoBusqueda) y se
 * compara contra la búsqueda normalizada igual.
 */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto de búsqueda de un paciente: nombre, teléfono (también sin espacios) y email */
export function textoBusquedaPaciente(datos: { name: string; phone: string; email?: string | null }): string {
  const telefonoCompacto = datos.phone.replace(/\s+/g, '');
  return normalizarBusqueda([datos.name, datos.phone, telefonoCompacto, datos.email ?? ''].join(' '));
}
