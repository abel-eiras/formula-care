/**
 * Aplicación del tema de marca al documento y persistencia en localStorage.
 * Se usa para aplicar colores en toda la app y evitar flash al recargar
 * (index.html aplica desde localStorage antes del primer pintado).
 */
import { getColoresParaConfig } from "@/lib/coloresMarca";
import { hexToHsl, hexToHslWithLuminosity } from "@/lib/utils";
import { textoSobre } from "@/lib/contraste";
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

  // El texto sobre cada color de marca se elige por contraste (blanco u
  // oscuro): así un acento claro, como un verde lima, sigue siendo legible
  const textoSobreHsl = (fondo: string) => hexToHsl(textoSobre(fondo));

  if (colores.primario) {
    const primarioHsl = hexToHsl(colores.primario);
    set("--primary", primarioHsl);
    set("--primary-foreground", textoSobreHsl(colores.primario));
    set("--sidebar-foreground", textoSobreHsl(colores.primario));
    // Ítem activo del menú: fondo claro (sidebar-primary) con el texto en el color primario
    set("--sidebar-primary-foreground", primarioHsl);
    set("--ring", primarioHsl);
    set("--sidebar-background", primarioHsl);
    set("--sidebar-ring", "0 0% 100%");
    set("--sidebar-muted", hexToHslWithLuminosity(colores.primario, 78));
  }
  if (colores.secundario) {
    set("--secondary", hexToHsl(colores.secundario));
    set("--secondary-foreground", textoSobreHsl(colores.secundario));
  }
  if (colores.fondo) set("--background", hexToHsl(colores.fondo));
  if (colores.texto) set("--foreground", hexToHsl(colores.texto));
  if (colores.textoSecundario) set("--muted-foreground", hexToHsl(colores.textoSecundario));
  if (colores.acento) {
    set("--accent", hexToHsl(colores.acento));
    set("--accent-foreground", textoSobreHsl(colores.acento));
    set("--sidebar-accent", hexToHsl(colores.acento));
    set("--sidebar-accent-foreground", textoSobreHsl(colores.acento));
  }
  if (colores.linea) set("--sidebar-border", hexToHsl(colores.linea));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vars));
  } catch {
    // Ignorar si localStorage no está disponible
  }
}
