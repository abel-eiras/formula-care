/**
 * Helpers para manejar tipos de Express Request
 * Resuelve problemas de tipos con req.query y req.params
 */

/**
 * Extrae un string de query params (maneja string[], ParsedQs, undefined)
 */
export function getQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * Extrae un string de params de ruta (garantiza string)
 */
export function getParamString(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

/**
 * Extrae un número de query params
 */
export function getQueryNumber(value: unknown): number | undefined {
  const str = getQueryString(value);
  if (str === undefined) return undefined;
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Extrae un boolean de query params
 */
export function getQueryBoolean(value: unknown): boolean | undefined {
  const str = getQueryString(value);
  if (str === undefined) return undefined;
  if (str === 'true' || str === '1') return true;
  if (str === 'false' || str === '0') return false;
  return undefined;
}
