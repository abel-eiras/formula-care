import { useState } from "react";
import { Download, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enviarInformePorEmail, guardarInforme } from "@/lib/informePdf";

interface Props {
  /** Vista de impresión del informe (p. ej. /servicios/dermo/print?id=…) */
  ruta: string;
  pacienteId?: string;
  emailPaciente?: string | null;
  /** Título del email ("Informe de dermocosmética") */
  titulo: string;
  nombreFichero: string;
  deshabilitado?: boolean;
}

/** Guardar el informe en PDF y enviarlo por email al paciente */
export function BotonesInforme({ ruta, pacienteId, emailPaciente, titulo, nombreFichero, deshabilitado }: Props) {
  const [ocupado, setOcupado] = useState<"guardar" | "enviar" | null>(null);

  const guardar = async () => {
    setOcupado("guardar");
    try {
      const destino = await guardarInforme(ruta, nombreFichero);
      if (destino) toast.success("PDF guardado", { description: destino });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido generar el PDF");
    } finally {
      setOcupado(null);
    }
  };

  const enviar = async () => {
    if (!pacienteId) return;
    setOcupado("enviar");
    try {
      toast.success(await enviarInformePorEmail({ ruta, pacienteId, titulo, nombreFichero }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido enviar el informe");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={guardar} className="gap-2" disabled={deshabilitado || ocupado !== null}>
        {ocupado === "guardar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Guardar PDF
      </Button>
      <Button
        variant="outline"
        onClick={enviar}
        className="gap-2"
        disabled={deshabilitado || ocupado !== null || !pacienteId || !emailPaciente}
        title={emailPaciente ? `Enviar a ${emailPaciente}` : "El paciente no tiene email"}
      >
        {ocupado === "enviar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        Enviar por email
      </Button>
    </>
  );
}
