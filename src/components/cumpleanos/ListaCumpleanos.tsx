import { memo } from "react";
import { Link } from "react-router-dom";
import { Check, Gift, Mail, MessageCircle, MoreHorizontal, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { useDeshacerFelicitacion, useFelicitar } from "@/hooks/useCumpleanos";
import { hoyISO, parsearFecha } from "@/lib/fechas";
import { enlaceWhatsapp, mensajeFelicitacion } from "@/lib/whatsapp";
import { abrirEnlaceExterno } from "@/lib/enlaceExterno";
import type { CanalFelicitacion, Cumpleanos } from "@/types";

const NOMBRE_CANAL: Record<CanalFelicitacion, string> = {
  whatsapp: "WhatsApp",
  email: "email",
  llamada: "llamada",
  en_persona: "en persona",
};

const MS_DIA = 24 * 60 * 60 * 1000;

/** "Hoy", "Mañana", "En 3 días", "Ayer"... respecto a hoy */
function textoCuando(fecha: string): string {
  const dias = Math.round((parsearFecha(fecha).getTime() - parsearFecha(hoyISO()).getTime()) / MS_DIA);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  if (dias > 1) return `En ${dias} días`;
  return `Hace ${-dias} días`;
}

interface FilaProps {
  cumpleanos: Cumpleanos;
  nombreFarmacia?: string;
  mostrarCuando: boolean;
}

const FilaCumpleanos = memo(function FilaCumpleanos({ cumpleanos: c, nombreFarmacia, mostrarCuando }: FilaProps) {
  const felicitar = useFelicitar();
  const deshacer = useDeshacerFelicitacion();
  const anio = Number(c.fecha.slice(0, 4));
  // No se felicita antes de tiempo: las acciones aparecen desde el propio día
  const esFuturo = c.fecha > hoyISO();
  const enlace = enlaceWhatsapp(c.telefono, mensajeFelicitacion(c.nombre, nombreFarmacia));
  const ocupado = felicitar.isPending || deshacer.isPending;

  const registrar = async (canal: CanalFelicitacion) => {
    try {
      await felicitar.mutateAsync({ pacienteId: c.pacienteId, anio, canal });
      toast.success(canal === "email" ? `Felicitación enviada a ${c.email}` : `${c.nombre} marcado como felicitado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido registrar la felicitación");
    }
  };

  const porWhatsapp = async () => {
    if (!enlace) return;
    // Se abre WhatsApp con el mensaje escrito; el envío lo confirma el farmacéutico allí
    try {
      await abrirEnlaceExterno(enlace);
    } catch {
      toast.error("No se ha podido abrir WhatsApp");
      return;
    }
    void registrar("whatsapp");
  };

  return (
    // flex-wrap: en columnas estrechas (calendario) las acciones bajan a otra línea
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-background p-3">
      <div className="flex min-w-[12rem] flex-1 items-center gap-2">
        <Gift className="h-4 w-4 shrink-0 text-pink-500" />
        <div className="min-w-0">
          <Link to={`/pacientes/${c.pacienteId}`} className="font-medium hover:underline truncate block">
            {c.nombre}
          </Link>
          <p className="text-xs text-muted-foreground">
            {mostrarCuando && `${textoCuando(c.fecha)} · `}cumple {c.edad} años
          </p>
        </div>
      </div>

      {c.felicitacion ? (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="gap-1 border-success/30 bg-success-soft text-success">
            <Check className="h-3 w-3" />
            Felicitado por {NOMBRE_CANAL[c.felicitacion.canal]}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Deshacer felicitación"
            title="Deshacer"
            disabled={ocupado}
            onClick={() => deshacer.mutate({ pacienteId: c.pacienteId, anio })}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : esFuturo ? null : (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            disabled={!enlace || ocupado}
            title={enlace ? "Abrir WhatsApp con la felicitación escrita" : "Teléfono no válido para WhatsApp"}
            onClick={porWhatsapp}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Button>
          {c.email && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={ocupado}
              title="Enviar la plantilla de email de felicitación"
              onClick={() => registrar("email")}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Otras formas de felicitar" disabled={ocupado}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => registrar("llamada")}>Felicitado por llamada</DropdownMenuItem>
              <DropdownMenuItem onClick={() => registrar("en_persona")}>Felicitado en persona</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});

interface ListaCumpleanosProps {
  cumpleanos: Cumpleanos[];
  /** Muestra "Hoy", "Mañana", "En 3 días"... (útil en listas de varios días) */
  mostrarCuando?: boolean;
}

/**
 * Lista de cumpleaños con acciones para felicitar (WhatsApp con el mensaje
 * escrito, email con la plantilla de la farmacia, o marcar como felicitado por
 * llamada o en persona). Cada felicitación queda registrada para ese año.
 */
export function ListaCumpleanos({ cumpleanos, mostrarCuando = false }: ListaCumpleanosProps) {
  const { data: configuracion } = useConfiguracion();
  return (
    <div className="space-y-2">
      {cumpleanos.map((c) => (
        <FilaCumpleanos
          key={`${c.pacienteId}-${c.fecha}`}
          cumpleanos={c}
          nombreFarmacia={configuracion?.farmaciaNombre}
          mostrarCuando={mostrarCuando}
        />
      ))}
    </div>
  );
}
