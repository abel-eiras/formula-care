/**
 * Aplicación del tema de marca al documento y persistencia en localStorage.
 * Se usa para aplicar colores en toda la app y evitar flash al recargar
 * (index.html aplica desde localStorage antes del primer pintado).
 */
import { getColoresParaConfig } from "@/lib/coloresMarca";
import { hexToHsl, hexToHslWithLuminosity } from "@/lib/utils";
import type { ColoresMarca } from "@/types";

const STORAGE_KEY = "appThemeVars";

/**
 * Aplica los colores de la configuración al document y los guarda en localStorage
 * para que la siguiente carga aplique el tema antes del primer pintado.
 */
export function applyThemeToDocument(config: {
  temaActivo?: string | null;
  coloresMarca?: ColoresMarca | null;
} | null | undefined): void {
  const colores = getColoresParaConfig(config);
  const root = document.documentElement;
  const vars: Record<string, string> = {};

  const set = (name: string, value: string) => {
    root.style.setProperty(name, value);
    vars[name] = value;
  };

  if (colores.primario) {
    const primarioHsl = hexToHsl(colores.primario);
    set("--primary", primarioHsl);
    set("--ring", primarioHsl);
    set("--sidebar-background", primarioHsl);
    set("--sidebar-ring", "0 0% 100%");
    set("--sidebar-muted", hexToHslWithLuminosity(colores.primario, 78));
  }
  if (colores.secundario) set("--secondary", hexToHsl(colores.secundario));
  if (colores.fondo) set("--background", hexToHsl(colores.fondo));
  if (colores.texto) set("--foreground", hexToHsl(colores.texto));
  if (colores.textoSecundario) set("--muted-foreground", hexToHsl(colores.textoSecundario));
  if (colores.acento) {
    set("--accent", hexToHsl(colores.acento));
    set("--sidebar-accent", hexToHsl(colores.acento));
    set("--sidebar-accent-foreground", "0 0% 100%");
  }
  if (colores.linea) set("--sidebar-border", hexToHsl(colores.linea));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vars));
  } catch {
    // Ignorar si localStorage no está disponible
  }
}
