/**
 * Contraste de color según WCAG 2.x. Sirve para elegir automáticamente el
 * color del texto sobre los colores de marca (blanco u oscuro) y para avisar
 * cuando un tema personalizado no se lee bien.
 */

/** Texto oscuro que se usa sobre colores claros */
export const TEXTO_OSCURO = "#1f2937";
export const TEXTO_CLARO = "#ffffff";

/** Contraste mínimo WCAG AA para texto normal */
export const CONTRASTE_MINIMO = 4.5;

function canales(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Luminancia relativa (0 = negro, 1 = blanco) */
export function luminancia(hex: string): number {
  const c = canales(hex);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste entre dos colores (1 a 21) */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Color de texto legible sobre un fondo: blanco si alcanza el mínimo WCAG
 * (se prefiere, es el estilo de la app); si no, el que más contraste dé.
 */
export function textoSobre(fondo: string): string {
  if (contraste(fondo, TEXTO_CLARO) >= CONTRASTE_MINIMO) return TEXTO_CLARO;
  return contraste(fondo, TEXTO_OSCURO) >= contraste(fondo, TEXTO_CLARO) ? TEXTO_OSCURO : TEXTO_CLARO;
}

export function esHexValido(hex: string | undefined | null): hex is string {
  return !!hex && canales(hex) !== null;
}
