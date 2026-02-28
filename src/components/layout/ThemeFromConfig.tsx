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

  useEffect(() => {
    if (config) {
      applyThemeToDocument({
        temaActivo: config.temaActivo,
        coloresMarca: config.coloresMarca,
      });
    }
  }, [config?.temaActivo, config?.coloresMarca]);

  return null;
}
