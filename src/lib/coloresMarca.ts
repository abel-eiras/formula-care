/**
 * Temas y colores de marca para la aplicación e informes.
 * Centraliza la paleta para que la app y las páginas de impresión usen los mismos valores.
 */
import type { ColoresMarca, Configuracion } from "@/types";
import { contraste, CONTRASTE_MINIMO } from "@/lib/contraste";

/** Valores por defecto cuando falta algún color (hex) */
const DEFAULTS: Required<ColoresMarca> = {
  primario: "#79438f",
  secundario: "#4a7484",
  fondo: "#f8fafc",
  texto: "#1e293b",
  textoSecundario: "#475569",
  acento: "#79438f",
  linea: "#6495a8",
};

export interface TemaPreconfigurado {
  nombre: string;
  descripcion: string;
  colores: Required<ColoresMarca>;
}

/**
 * Temas preconfigurados con paleta completa (app + informes).
 * Los ids se guardan en la configuración: no deben renombrarse.
 *
 * Reglas que cumplen todos (las comprueba coloresMarca.test.ts):
 * - Texto blanco legible sobre "primario" y "secundario" (barra lateral,
 *   botones y cabeceras de informes) y ambos legibles como texto sobre "fondo".
 * - "texto" sobre "fondo" con contraste alto; "textoSecundario" legible.
 * - "acento" puede ser claro: el texto encima se elige automáticamente.
 */
export const TEMAS_PRECONFIGURADOS: Record<string, TemaPreconfigurado> = {
  default: {
    nombre: "Morado y azul",
    descripcion: "El tema predeterminado de Formula Care",
    colores: {
      primario: "#79438f",
      secundario: "#4a7484",
      fondo: "#f8fafc",
      texto: "#1e293b",
      textoSecundario: "#475569",
      acento: "#79438f",
      linea: "#6495a8",
    },
  },
  porDefecto: {
    nombre: "Morado cálido",
    descripcion: "Morado con fondo lavanda y textos grafito",
    colores: {
      primario: "#79438f",
      secundario: "#4a7484",
      fondo: "#f8f4fa",
      texto: "#333333",
      textoSecundario: "#555555",
      acento: "#79438f",
      linea: "#6495a8",
    },
  },
  verdeFarmacia: {
    nombre: "Verde farmacia",
    descripcion: "Verde oscuro con acentos verde lima y textos azul pizarra",
    colores: {
      primario: "#3e551b",
      secundario: "#56732b",
      fondo: "#f6f8f1",
      texto: "#2c3e50",
      textoSecundario: "#526170",
      acento: "#a4c639",
      linea: "#a4c639",
    },
  },
  verde: {
    nombre: "Verde azulado",
    descripcion: "Turquesa sanitario, limpio y luminoso",
    colores: {
      primario: "#0c7f75",
      secundario: "#0f766e",
      fondo: "#f0fdfa",
      texto: "#134e4a",
      textoSecundario: "#0f766e",
      acento: "#0c7f75",
      linea: "#14b8a6",
    },
  },
  azul: {
    nombre: "Azul corporativo",
    descripcion: "Azul intenso, sobrio y clásico",
    colores: {
      primario: "#2563eb",
      secundario: "#1d4ed8",
      fondo: "#eff6ff",
      texto: "#1e3a8a",
      textoSecundario: "#1e40af",
      acento: "#2563eb",
      linea: "#3b82f6",
    },
  },
  oceano: {
    nombre: "Océano",
    descripcion: "Azul petróleo con acentos aguamarina",
    colores: {
      primario: "#0b4f6c",
      secundario: "#1a6f8a",
      fondo: "#f2f8fa",
      texto: "#0c2a36",
      textoSecundario: "#3d5c68",
      acento: "#2bb3a8",
      linea: "#7cc9c4",
    },
  },
  pizarraAmbar: {
    nombre: "Pizarra y ámbar",
    descripcion: "Gris pizarra neutro con acentos ámbar",
    colores: {
      primario: "#334155",
      secundario: "#475569",
      fondo: "#f8fafc",
      texto: "#0f172a",
      textoSecundario: "#475569",
      acento: "#f59e0b",
      linea: "#f59e0b",
    },
  },
  burdeos: {
    nombre: "Burdeos y arena",
    descripcion: "Burdeos elegante con detalles dorado arena",
    colores: {
      primario: "#7a1f3d",
      secundario: "#8f4a5e",
      fondo: "#fbf7f5",
      texto: "#3b1d27",
      textoSecundario: "#6b4a55",
      acento: "#d4a373",
      linea: "#d4a373",
    },
  },
  terracota: {
    nombre: "Terracota y salvia",
    descripcion: "Tonos tierra cálidos con verde salvia",
    colores: {
      primario: "#8c3f26",
      secundario: "#56695a",
      fondo: "#fcf8f3",
      texto: "#3d2c24",
      textoSecundario: "#6d5a50",
      acento: "#e07a5f",
      linea: "#e9b872",
    },
  },
};

/** Id del tema personalizado (colores elegidos por el usuario en coloresMarca) */
export const TEMA_PERSONALIZADO = "custom";

export interface AvisoContraste {
  campo: keyof ColoresMarca;
  mensaje: string;
}

/**
 * Revisa que una paleta se lea bien. Devuelve avisos para el editor de tema
 * personalizado (los temas preconfigurados no deben tener ninguno).
 */
export function revisarContraste(colores: ColoresMarca): AvisoContraste[] {
  const c = { ...DEFAULTS, ...colores };
  const avisos: AvisoContraste[] = [];
  const minimo = (campo: keyof ColoresMarca, valor: number, requerido: number, mensaje: string) => {
    if (valor < requerido) avisos.push({ campo, mensaje: `${mensaje} (contraste ${valor.toFixed(1)}:1, mínimo ${requerido}:1)` });
  };
  // Primario y secundario también se usan como color de texto (títulos, etiquetas)
  // sobre el fondo; el texto encima de ellos ya se elige solo (blanco u oscuro)
  minimo("primario", contraste(c.primario, c.fondo), CONTRASTE_MINIMO, "Los títulos y textos destacados en color primario apenas se distinguen del fondo");
  minimo("secundario", contraste(c.secundario, c.fondo), CONTRASTE_MINIMO, "Las etiquetas en color secundario apenas se distinguen del fondo");
  minimo("texto", contraste(c.texto, c.fondo), 7, "El texto principal tiene poco contraste con el fondo");
  minimo("textoSecundario", contraste(c.textoSecundario, c.fondo), CONTRASTE_MINIMO, "El texto secundario tiene poco contraste con el fondo");
  return avisos;
}

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
  const colores = config.temaActivo === TEMA_PERSONALIZADO && config.coloresMarca
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
