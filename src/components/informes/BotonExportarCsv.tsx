import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { hoyISO } from "@/lib/fechas";
import { guardarArchivo } from "@/lib/guardarArchivo";

interface Props {
  /** "pacientes" o "actividad" (ver backend/src/controllers/exportaciones.ts) */
  tipo: "pacientes" | "actividad";
  etiqueta: string;
}

/** Exporta a CSV (se abre con Excel o LibreOffice) */
export function BotonExportarCsv({ tipo, etiqueta }: Props) {
  const [exportando, setExportando] = useState(false);

  const exportar = async () => {
    setExportando(true);
    try {
      const ruta = await guardarArchivo({
        nombreSugerido: `${tipo}-${hoyISO()}.csv`,
        extension: "csv",
        descripcion: "Hoja de cálculo (CSV)",
        escribirEn: (destino) => api.post(`/exportar/${tipo}`, { destino }),
        obtenerContenido: () => api.getTexto(`/exportar/${tipo}`),
      });
      if (ruta) toast.success("Exportado", { description: ruta });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido exportar");
    } finally {
      setExportando(false);
    }
  };

  return (
    <Button variant="outline" className="gap-2" onClick={exportar} disabled={exportando}>
      {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      {etiqueta}
    </Button>
  );
}
