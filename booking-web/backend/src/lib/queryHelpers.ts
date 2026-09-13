/**
 * Normaliza un parámetro de ruta/query (Express puede entregar string | string[] | undefined)
 * a un único string, o undefined si no está presente.
 */
export function getParamString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}
