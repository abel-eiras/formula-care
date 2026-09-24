import { useState } from "react";
import { FileDown, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { guardarArchivo, nombreFichero } from "@/lib/guardarArchivo";
import { hoyISO } from "@/lib/fechas";
import type { Paciente } from "@/types";

/**
 * Protección de datos del paciente: constancia de su consentimiento y
 * exportación de todos sus datos (derecho de acceso y portabilidad).
 */
export function ProteccionDatosPaciente({ paciente }: { paciente: Paciente }) {
  const queryClient = useQueryClient();
  const [registrando, setRegistrando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const registrar = async () => {
    setRegistrando(true);
    try {
      await api.post(`/pacientes/${paciente.id}/consentimiento`, {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["paciente", paciente.id] }),
        queryClient.invalidateQueries({ queryKey: ["pacientes"] }),
      ]);
      toast.success("Consentimiento registrado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido registrar");
    } finally {
      setRegistrando(false);
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const ruta = await guardarArchivo({
        nombreSugerido: `datos-${nombreFichero(paciente.name)}-${hoyISO()}.json`,
        extension: "json",
        descripcion: "Datos del paciente (JSON)",
        escribirEn: (destino) => api.post(`/pacientes/${paciente.id}/exportar`, { destino }),
        obtenerContenido: async () => JSON.stringify(await api.get(`/pacientes/${paciente.id}/exportar`), null, 2),
      });
      if (ruta) toast.success("Datos exportados", { description: ruta });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se han podido exportar los datos");
    } finally {
      setExportando(false);
    }
  };

  const fecha = paciente.consentimientoFecha ? new Date(paciente.consentimientoFecha).toLocaleDateString("es-ES") : null;

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Protección de datos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {fecha ? (
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-success shrink-0" />
            <span>
              Consentimiento dado el {fecha}
              {paciente.consentimientoVersion && ` (texto ${paciente.consentimientoVersion})`}
            </span>
          </p>
        ) : (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-muted-foreground">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              No consta el consentimiento de este paciente.
            </p>
            <Button variant="outline" size="sm" onClick={registrar} disabled={registrando}>
              Registrar consentimiento ahora
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={exportar} disabled={exportando}>
          <FileDown className="h-4 w-4" />
          Exportar todos sus datos
        </Button>
      </CardContent>
    </Card>
  );
}
