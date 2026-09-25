import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buscarActualizacion, type Update } from "@/lib/actualizaciones";
import { DialogoActualizacion } from "./DialogoActualizacion";

/** Versión instalada y botón para buscar actualizaciones a mano */
export function TarjetaVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [actualizacion, setActualizacion] = useState<Update | null>(null);

  useEffect(() => {
    if (isTauri()) getVersion().then(setVersion).catch(() => setVersion(null));
  }, []);

  if (!isTauri()) return null;

  const buscar = async () => {
    setBuscando(true);
    try {
      const nueva = await buscarActualizacion();
      if (nueva) setActualizacion(nueva);
      else toast.success("Ya tienes la última versión");
    } catch (error) {
      console.warn("No se ha podido comprobar si hay actualizaciones:", error);
      toast.error("No se ha podido comprobar. ¿Hay conexión a internet?");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Versión de Formula Care
        </CardTitle>
        <CardDescription>
          {version ? `Tienes instalada la versión ${version}.` : "Versión instalada desconocida."} La app avisa sola al
          abrirse cuando hay una nueva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={buscar} disabled={buscando} className="gap-2">
          <RefreshCw className={buscando ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {buscando ? "Buscando…" : "Buscar actualizaciones"}
        </Button>
      </CardContent>
      <DialogoActualizacion actualizacion={actualizacion} onCerrar={() => setActualizacion(null)} />
    </Card>
  );
}
