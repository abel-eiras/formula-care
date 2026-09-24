import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { parsearFecha } from "@/lib/fechas";

interface RespuestaRetencion {
  meses: number;
  limite: string;
  pacientes: { id: string; name: string; ultimaActividad: string }[];
}

/**
 * Pacientes sin actividad desde hace más del periodo de retención. No se
 * borran solos: la farmacia revisa la lista (puede haber obligaciones de
 * conservar historias clínicas) y decide.
 */
export function RetencionPacientes() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pacientes", "retencion"],
    queryFn: () => api.get<RespuestaRetencion>("/pacientes/retencion"),
  });
  const [borrando, setBorrando] = useState<{ id: string; name: string } | null>(null);
  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/pacientes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pacientes"] }),
  });

  const confirmar = async () => {
    if (!borrando) return;
    try {
      await eliminar.mutateAsync(borrando.id);
      toast.success(`Datos de ${borrando.name} eliminados`);
      setBorrando(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido eliminar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pacientes fuera del periodo de retención</CardTitle>
        <CardDescription>
          Sin servicios, citas ni altas desde hace más de {data ? `${data.meses} meses` : "el periodo configurado"}
          {data && ` (antes del ${parsearFecha(data.limite).toLocaleDateString("es-ES")})`}. Revisa si debes conservar sus
          datos por otro motivo antes de eliminarlos: el borrado es definitivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : !data || data.pacientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún paciente ha superado el periodo de retención.</p>
        ) : (
          <ul className="divide-y">
            {data.pacientes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <Link to={`/pacientes/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Última actividad: {parsearFecha(p.ultimaActividad).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => setBorrando(p)}>
                  <Trash2 className="h-4 w-4" /> Eliminar datos
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!borrando} onOpenChange={(abierto) => !abierto && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los datos de {borrando?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran su ficha, análisis, programas de nutrición, medidas y citas. No se puede deshacer (salvo
              restaurando una copia de seguridad anterior).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmar} disabled={eliminar.isPending}>
              Eliminar definitivamente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
