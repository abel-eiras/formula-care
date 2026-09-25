import { useEffect } from "react";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { applyThemeToDocument } from "@/lib/theme";

/**
 * Aplica el tema (colores de marca) desde la configuración al documento
 * y lo persiste en localStorage. Montado en MainLayout para que el tema
 * se aplique en todas las páginas autenticadas y no solo en Configuración.
 * Evita el parpadeo al recargar: index.html aplica antes el tema guardado.
 */
export function ThemeFromConfig() {
  const { data: config } = useConfiguracion();
  const temaActivo = config?.temaActivo;
  // Como texto: el objeto de colores es nuevo en cada recarga aunque no cambie
  const coloresMarca = config?.coloresMarca ? JSON.stringify(config.coloresMarca) : undefined;
  const hayConfig = !!config;

  useEffect(() => {
    if (hayConfig) {
      applyThemeToDocument({
        temaActivo,
        coloresMarca: coloresMarca ? JSON.parse(coloresMarca) : undefined,
      });
    }
  }, [hayConfig, temaActivo, coloresMarca]);

  return null;
}
