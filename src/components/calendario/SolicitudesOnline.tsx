import { useState } from "react";
import { Check, Globe, Mail, Phone, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAceptarSolicitud,
  useRechazarSolicitud,
  useSincronizarReservaOnline,
  useSolicitudesOnline,
  type SolicitudOnline,
} from "@/hooks/useReservaOnline";
import { textoEdad } from "@/lib/edad";
import { parsearFecha } from "@/lib/fechas";

const NOMBRES_SERVICIO: Record<string, string> = {
  dermo: "Dermocosmética",
  bio: "Análisis bioquímico",
  nutricion: "Nutrición",
  consulta: "Consulta farmacéutica",
};
const NUEVO = "nuevo";
const SEXO: Record<string, string> = { M: "Hombre", F: "Mujer", O: "Otro" };

function nombreServicio(s: SolicitudOnline): string {
  return s.nombreEvento ?? NOMBRES_SERVICIO[s.tipo] ?? s.tipo;
}

function mensajeError(error: unknown, porDefecto: string): string {
  return error instanceof Error ? error.message : porDefecto;
}

function TarjetaSolicitud({ solicitud, onRechazar }: { solicitud: SolicitudOnline; onRechazar: () => void }) {
  const aceptar = useAceptarSolicitud();
  // Si hay un único paciente con ese email o teléfono, se propone; si no, alta nueva
  const [paciente, setPaciente] = useState(solicitud.coincidencias.length === 1 ? solicitud.coincidencias[0].id : NUEVO);

  const handleAceptar = async () => {
    try {
      await aceptar.mutateAsync({ id: solicitud.id, pacienteId: paciente === NUEVO ? undefined : paciente });
      toast.success(`Cita confirmada para ${solicitud.nombre}`, { description: "Se le ha enviado un email de confirmación." });
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido aceptar la solicitud"));
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{solicitud.nombre}</p>
          <p className="text-sm text-muted-foreground">
            {nombreServicio(solicitud)} ·{" "}
            {parsearFecha(solicitud.fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las{" "}
            {solicitud.hora}
          </p>
        </div>
        <Badge variant="outline">
          Recibida {new Date(solicitud.recibidaEn).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Mail className="h-3.5 w-3.5" /> {solicitud.email}
        </span>
        <span className="flex items-center gap-1">
          <Phone className="h-3.5 w-3.5" /> {solicitud.telefono}
        </span>
        {solicitud.fechaNacimiento && <span>{textoEdad(solicitud.fechaNacimiento)}</span>}
        {solicitud.sexo && <span>{SEXO[solicitud.sexo]}</span>}
      </div>
      {solicitud.notas && <p className="text-sm bg-muted/50 rounded p-2">“{solicitud.notas}”</p>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 min-w-[16rem] flex-1">
          <Label className="text-xs">Paciente</Label>
          <Select value={paciente} onValueChange={setPaciente}>
            <SelectTrigger aria-label={`Paciente para la solicitud de ${solicitud.nombre}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NUEVO}>Dar de alta como paciente nuevo</SelectItem>
              {solicitud.coincidencias.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {p.phone}
                  {p.email ? ` · ${p.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2" onClick={onRechazar} disabled={aceptar.isPending}>
          <X className="h-4 w-4" /> Rechazar
        </Button>
        <Button className="gap-2" onClick={handleAceptar} disabled={aceptar.isPending}>
          <Check className="h-4 w-4" /> Aceptar
        </Button>
      </div>
      {solicitud.coincidencias.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Hay varios pacientes con ese email o teléfono: elige el correcto antes de aceptar.
        </p>
      )}
    </div>
  );
}

/**
 * Solicitudes de la reserva online recogidas por la app. Al aceptar se crea la
 * cita (y el paciente, si es nuevo); al rechazar se avisa por email.
 */
export function SolicitudesOnline() {
  const { data: solicitudes = [] } = useSolicitudesOnline();
  const sincronizar = useSincronizarReservaOnline();
  const rechazar = useRechazarSolicitud();
  const [rechazando, setRechazando] = useState<SolicitudOnline | null>(null);
  const [motivo, setMotivo] = useState("");

  if (solicitudes.length === 0) return null;

  const confirmarRechazo = async () => {
    if (!rechazando) return;
    try {
      await rechazar.mutateAsync({ id: rechazando.id, motivo: motivo.trim() || undefined });
      toast.success("Solicitud rechazada", { description: `Se ha avisado a ${rechazando.nombre} por email.` });
      setRechazando(null);
      setMotivo("");
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido rechazar la solicitud"));
    }
  };

  return (
    <Card className="border-primary/40 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Solicitudes online
            <Badge>{solicitudes.length}</Badge>
          </CardTitle>
          <CardDescription>Pedidas desde la página de reserva. El hueco queda reservado hasta que decidas.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => sincronizar.mutate()} disabled={sincronizar.isPending}>
          <RefreshCw className={sincronizar.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Comprobar ahora
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {solicitudes.map((s) => (
          <TarjetaSolicitud key={s.id} solicitud={s} onRechazar={() => setRechazando(s)} />
        ))}
      </CardContent>

      <Dialog open={!!rechazando} onOpenChange={(abierto) => !abierto && setRechazando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              {rechazando?.nombre} recibirá un email diciendo que no se ha podido confirmar la cita, con un enlace para pedir otro horario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-rechazo">Motivo (opcional, se incluye en el email)</Label>
            <Textarea id="motivo-rechazo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazando(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarRechazo} disabled={rechazar.isPending}>
              Rechazar y avisar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
