/** "#79438f" → "280 36% 41%" (formato de las variables CSS de Tailwind/shadcn) */
export function hexAHsl(hex: string): string | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((c) => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Aplica el color de la farmacia a los componentes (botones, anillos de foco...) */
export function aplicarColorPrimario(hex: string): void {
  const hsl = hexAHsl(hex);
  if (!hsl) return;
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
}
