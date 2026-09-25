/**
 * Importar pacientes desde la plantilla Excel de la app, en tres pasos:
 * descargar la plantilla, elegir el archivo relleno y revisar antes de importar.
 */
import { useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { guardarArchivo } from "@/lib/guardarArchivo";
import { EnlaceAyuda } from "@/components/ayuda/EnlaceAyuda";

interface Revision {
  validas: { fila: number; nombre: string; telefono: string; fechaNacimiento: string }[];
  errores: { fila: number; motivos: string[] }[];
  duplicados: { fila: number; nombre: string; motivo: string }[];
}

/** Cómo llega el archivo al servidor: ruta en la app de escritorio, contenido en el navegador */
type OrigenArchivo = { ruta: string } | { contenido: string };

async function aBase64(archivo: File): Promise<string> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

export function ImportarPacientes() {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [origen, setOrigen] = useState<OrigenArchivo | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [revision, setRevision] = useState<Revision | null>(null);
  const [ocupado, setOcupado] = useState<"plantilla" | "revisando" | "importando" | null>(null);
  const selectorArchivo = useRef<HTMLInputElement>(null);

  const reiniciar = () => {
    setOrigen(null);
    setNombreArchivo("");
    setRevision(null);
  };

  const descargarPlantilla = async () => {
    setOcupado("plantilla");
    try {
      const ruta = await guardarArchivo({
        nombreSugerido: "plantilla-pacientes.xlsx",
        extension: "xlsx",
        descripcion: "Excel",
        escribirEn: (destino) => api.post("/pacientes/plantilla-importacion", { destino }),
        obtenerContenido: () => api.getBlob("/pacientes/plantilla-importacion"),
      });
      if (ruta) toast.success("Plantilla guardada", { description: ruta });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido guardar la plantilla");
    } finally {
      setOcupado(null);
    }
  };

  const revisar = async (nuevoOrigen: OrigenArchivo, nombre: string) => {
    setOrigen(nuevoOrigen);
    setNombreArchivo(nombre);
    setRevision(null);
    setOcupado("revisando");
    try {
      setRevision(await api.post<Revision>("/pacientes/importar/revisar", nuevoOrigen));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido leer el archivo");
      setOrigen(null);
    } finally {
      setOcupado(null);
    }
  };

  const elegirArchivo = async () => {
    if (!isTauri()) {
      selectorArchivo.current?.click();
      return;
    }
    const { open } = await import("@tauri-apps/plugin-dialog");
    const ruta = await open({ multiple: false, filters: [{ name: "Excel", extensions: ["xlsx"] }] });
    if (typeof ruta === "string") await revisar({ ruta }, ruta.split(/[\\/]/).pop() ?? ruta);
  };

  const alElegirEnNavegador = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) await revisar({ contenido: await aBase64(archivo) }, archivo.name);
  };

  const importar = async () => {
    if (!origen) return;
    setOcupado("importando");
    try {
      const { importados } = await api.post<{ importados: number }>("/pacientes/importar", origen);
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success(`${importados} ${importados === 1 ? "paciente importado" : "pacientes importados"}`);
      setAbierto(false);
      reiniciar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido importar");
    } finally {
      setOcupado(null);
    }
  };

  const numValidas = revision?.validas.length ?? 0;

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setAbierto(true)}>
        <Upload className="h-4 w-4" />
        Importar desde Excel
      </Button>
      <input ref={selectorArchivo} type="file" accept=".xlsx" className="hidden" onChange={alElegirEnNavegador} />

      <Dialog
        open={abierto}
        onOpenChange={(valor) => {
          if (ocupado) return;
          setAbierto(valor);
          if (!valor) reiniciar();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar pacientes desde Excel</DialogTitle>
            <DialogDescription>
              Para que la app pueda leer bien los datos, usa siempre su plantilla. Se da por hecho que los pacientes
              importados ya habían dado su consentimiento de protección de datos (se registra con la fecha de hoy).
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-4 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>1.</strong> Descarga la plantilla y rellénala: un paciente por fila.
              </span>
              <Button variant="outline" size="sm" className="gap-2" onClick={descargarPlantilla} disabled={ocupado !== null}>
                {ocupado === "plantilla" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar plantilla
              </Button>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>2.</strong> Elige el archivo relleno{nombreArchivo ? `: ${nombreArchivo}` : "."}
              </span>
              <Button variant="outline" size="sm" className="gap-2" onClick={elegirArchivo} disabled={ocupado !== null}>
                {ocupado === "revisando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {origen ? "Elegir otro" : "Elegir archivo"}
              </Button>
            </li>
          </ol>

          {revision && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                <strong>3.</strong> Revisa antes de importar:
              </p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {numValidas} {numValidas === 1 ? "paciente listo" : "pacientes listos"} para importar
                </li>
                {revision.duplicados.length > 0 && (
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {revision.duplicados.length} ya estaban en la app o se repiten (no se importan)
                  </li>
                )}
                {revision.errores.length > 0 && (
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {revision.errores.length} con datos que corregir (no se importan)
                  </li>
                )}
              </ul>

              {(revision.errores.length > 0 || revision.duplicados.length > 0) && (
                <ScrollArea className="max-h-56 rounded-md border border-border/60">
                  <ul className="divide-y divide-border/60 text-sm">
                    {revision.errores.map((e) => (
                      <li key={`e${e.fila}`} className="px-3 py-2">
                        <span className="font-medium text-destructive">Fila {e.fila}:</span> {e.motivos.join("; ")}
                      </li>
                    ))}
                    {revision.duplicados.map((d) => (
                      <li key={`d${d.fila}`} className="px-3 py-2">
                        <span className="font-medium text-amber-600 dark:text-amber-400">Fila {d.fila}</span> ({d.nombre}):{" "}
                        {d.motivo}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
              {revision.errores.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Puedes corregir esas filas en el Excel y volver a elegirlo, o importar ya las correctas y añadir las
                  demás después (las ya importadas no se duplican).
                </p>
              )}
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <EnlaceAyuda tema="importar" texto="Cómo rellenar la plantilla" />
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={ocupado !== null}>
              Cancelar
            </Button>
            <Button onClick={importar} disabled={!revision || numValidas === 0 || ocupado !== null} className="gap-2">
              {ocupado === "importando" && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {numValidas > 0 ? numValidas : ""} {numValidas === 1 ? "paciente" : "pacientes"}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
