import { useEffect, useState } from "react";
import { buscarActualizacion, type Update } from "@/lib/actualizaciones";
import { DialogoActualizacion } from "./DialogoActualizacion";

// Espera antes de comprobar: que la app termine de arrancar sin competir con
// la descarga del aviso
const RETRASO_MS = 5000;

/**
 * Al abrir la app, comprueba una vez si hay versión nueva y, si la hay, lo
 * ofrece. Sin internet o sin versión nueva no muestra nada.
 */
export function AvisoActualizacion() {
  const [actualizacion, setActualizacion] = useState<Update | null>(null);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      buscarActualizacion()
        .then(setActualizacion)
        .catch((error) => console.warn("No se ha podido comprobar si hay actualizaciones:", error));
    }, RETRASO_MS);
    return () => clearTimeout(temporizador);
  }, []);

  return <DialogoActualizacion actualizacion={actualizacion} onCerrar={() => setActualizacion(null)} />;
}
