import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { abrirEnlaceExterno } from "@/lib/enlaceExterno";
import { instalarActualizacion, type Update } from "@/lib/actualizaciones";

const URL_RELEASES = "https://github.com/abel-eiras/formula-care/releases";

interface DialogoActualizacionProps {
  actualizacion: Update | null;
  onCerrar: () => void;
}

/** Ofrece instalar una versión nueva y muestra el progreso de la descarga */
export function DialogoActualizacion({ actualizacion, onCerrar }: DialogoActualizacionProps) {
  const [instalando, setInstalando] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);

  const actualizar = async () => {
    if (!actualizacion) return;
    setInstalando(true);
    try {
      await instalarActualizacion(actualizacion, setProgreso);
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("No se ha podido descargar la actualización. Inténtalo más tarde o descárgala desde la web.");
      setInstalando(false);
      setProgreso(null);
    }
  };

  return (
    <Dialog open={!!actualizacion} onOpenChange={(abierto) => !abierto && !instalando && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Hay una versión nueva de Formula Care
          </DialogTitle>
          <DialogDescription>
            Versión {actualizacion?.version} (tienes la {actualizacion?.currentVersion}). Tus datos se conservan y
            antes de actualizar se guarda una copia por si acaso.
          </DialogDescription>
        </DialogHeader>

        {/* Las notas de latest.json se fijan al compilar; las novedades
            actualizadas están en la página del release */}
        <Button
          variant="link"
          className="h-auto justify-start gap-1 p-0"
          onClick={() => void abrirEnlaceExterno(`${URL_RELEASES}/tag/v${actualizacion?.version}`)}
        >
          <ExternalLink className="h-4 w-4" />
          Ver las novedades de esta versión
        </Button>

        {instalando ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Descargando… La app se cerrará y volverá a abrirse sola al terminar.
            </p>
            {progreso !== null && <Progress value={progreso} />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Guarda lo que estés haciendo: la app se reiniciará para instalarla.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={instalando}>
            Más tarde
          </Button>
          <Button onClick={actualizar} disabled={instalando}>
            {instalando ? "Actualizando…" : "Actualizar ahora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
