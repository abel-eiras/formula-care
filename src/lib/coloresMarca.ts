/**
 * Temas y colores de marca para la aplicación e informes.
 * Centraliza la paleta para que la app y las páginas de impresión usen los mismos valores.
 */
import type { ColoresMarca, Configuracion } from "@/types";

/** Valores por defecto cuando falta algún color (hex) */
const DEFAULTS: Required<ColoresMarca> = {
  primario: "#79438f",
  secundario: "#6495a8",
  fondo: "#f8fafc",
  texto: "#1e293b",
  textoSecundario: "#475569",
  acento: "#79438f",
  linea: "#6495a8",
};

/** Temas preconfigurados con paleta completa (app + informes) */
export const TEMAS_PRECONFIGURADOS: Record<string, { nombre: string; colores: ColoresMarca }> = {
  default: {
    nombre: "Claro",
    colores: {
      primario: "#79438f",
      secundario: "#6495a8",
      fondo: "#f8fafc",
      texto: "#1e293b",
      textoSecundario: "#475569",
      acento: "#79438f",
      linea: "#6495a8",
    },
  },
  porDefecto: {
    nombre: "Por defecto",
    colores: {
      primario: "#79438f",
      secundario: "#6495a8",
      fondo: "#f8f4fa",
      texto: "#333333",
      textoSecundario: "#555555",
      acento: "#79438f",
      linea: "#6495a8",
    },
  },
  verde: {
    nombre: "Verde profesional",
    colores: {
      primario: "#0d9488",
      secundario: "#14b8a6",
      fondo: "#f0fdfa",
      texto: "#134e4a",
      textoSecundario: "#0f766e",
      acento: "#0d9488",
      linea: "#14b8a6",
    },
  },
  azul: {
    nombre: "Azul corporativo",
    colores: {
      primario: "#2563eb",
      secundario: "#3b82f6",
      fondo: "#eff6ff",
      texto: "#1e3a8a",
      textoSecundario: "#1e40af",
      acento: "#2563eb",
      linea: "#3b82f6",
    },
  },
};

/**
 * Devuelve la paleta de colores a usar según la configuración (tema activo o personalizado).
 * Se usa en la app (Configuracion) y en las páginas de informes (ServicioDermoPrint, ServicioBioPrint).
 */
export function getColoresParaConfig(config: {
  temaActivo?: string | null;
  coloresMarca?: ColoresMarca | null;
} | null | undefined): ColoresMarca {
  if (!config) return { ...DEFAULTS };
  const tema = config.temaActivo || "default";
  const colores = config.temaActivo === "custom" && config.coloresMarca
    ? config.coloresMarca
    : TEMAS_PRECONFIGURADOS[tema]?.colores ?? TEMAS_PRECONFIGURADOS.default.colores;
  return {
    primario: colores.primario ?? DEFAULTS.primario,
    secundario: colores.secundario ?? DEFAULTS.secundario,
    fondo: colores.fondo ?? DEFAULTS.fondo,
    texto: colores.texto ?? DEFAULTS.texto,
    textoSecundario: colores.textoSecundario ?? colores.secundario ?? DEFAULTS.textoSecundario,
    acento: colores.acento ?? colores.primario ?? DEFAULTS.acento,
    linea: colores.linea ?? colores.secundario ?? DEFAULTS.linea,
  };
}
