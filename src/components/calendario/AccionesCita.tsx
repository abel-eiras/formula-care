import { useState } from "react";
import { Ban, Check, CheckCheck, MessageCircle, MoreVertical, Pencil, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActualizarCita, useEliminarCita } from "@/hooks/useCitas";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { abrirEnlaceExterno } from "@/lib/enlaceExterno";
import { parsearFecha } from "@/lib/fechas";
import { enlaceWhatsapp, mensajeRecordatorioCita } from "@/lib/whatsapp";
import type { Cita, EstadoCita } from "@/types";
import { ESTADOS_CITA } from "@/lib/estadosCita";

interface Props {
  cita: Cita;
  nombrePaciente: string;
  telefonoPaciente?: string;
}

/** Menú de acciones de una cita: editar, cambiar estado, recordar por WhatsApp y borrar */
export function AccionesCita({ cita, nombrePaciente, telefonoPaciente }: Props) {
  const actualizar = useActualizarCita();
  const eliminar = useEliminarCita();
  const { data: config } = useConfiguracion();
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [form, setForm] = useState({ titulo: cita.titulo, fecha: cita.fecha.slice(0, 10), hora: cita.hora, notas: cita.notas ?? "" });

  const cambiarEstado = async (estado: EstadoCita, mensaje: string) => {
    try {
      await actualizar.mutateAsync({ id: cita.id, estado });
      toast.success(mensaje);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido actualizar la cita");
    }
  };

  const guardarEdicion = async () => {
    if (!form.titulo.trim() || !form.fecha || !/^\d{2}:\d{2}$/.test(form.hora)) {
      toast.error("Indica título, día y hora");
      return;
    }
    try {
      const cambiaHorario = form.fecha !== cita.fecha.slice(0, 10) || form.hora !== cita.hora;
      await actualizar.mutateAsync({ id: cita.id, titulo: form.titulo.trim(), fecha: form.fecha, hora: form.hora, notas: form.notas });
      toast.success("Cita actualizada", {
        description: cambiaHorario ? "Si el paciente tiene email, se le avisa del cambio." : undefined,
      });
      setEditando(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido guardar");
    }
  };

  const recordarPorWhatsapp = async () => {
    const enlace = telefonoPaciente
      ? enlaceWhatsapp(telefonoPaciente, mensajeRecordatorioCita(nombrePaciente, cita.fecha, cita.hora, config?.farmaciaNombre))
      : null;
    if (!enlace) {
      toast.error("El paciente no tiene un teléfono válido");
      return;
    }
    await abrirEnlaceExterno(enlace);
  };

  const borrar = async () => {
    try {
      await eliminar.mutateAsync(cita.id);
      toast.success("Cita eliminada");
      setBorrando(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido eliminar");
    }
  };

  const cancelada = cita.estado === "cancelada";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones de la cita de ${nombrePaciente}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditando(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar o cambiar hora
          </DropdownMenuItem>
          {!cancelada && (
            <>
              <DropdownMenuItem onSelect={recordarPorWhatsapp}>
                <MessageCircle className="h-4 w-4 mr-2" /> Recordar por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => cambiarEstado("confirmada", "Cita confirmada")}>
                <Check className="h-4 w-4 mr-2" /> Confirmada
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => cambiarEstado("completada", "Cita marcada como realizada")}>
                <CheckCheck className="h-4 w-4 mr-2" /> Realizada
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => cambiarEstado("no_presentado", "Anotado: no se presentó")}>
                <UserX className="h-4 w-4 mr-2" /> No se presentó
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => cambiarEstado("cancelada", "Cita cancelada. Si el paciente tiene email, se le avisa.")}
              >
                <Ban className="h-4 w-4 mr-2" /> Cancelar cita
              </DropdownMenuItem>
            </>
          )}
          {cancelada && (
            <DropdownMenuItem onSelect={() => cambiarEstado("pendiente", "Cita reactivada")}>
              <Check className="h-4 w-4 mr-2" /> Reactivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={() => setBorrando(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar cita</DialogTitle>
            <DialogDescription>{nombrePaciente}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`titulo-${cita.id}`}>Título</Label>
              <Input id={`titulo-${cita.id}`} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`fecha-${cita.id}`}>Día</Label>
                <Input id={`fecha-${cita.id}`} type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`hora-${cita.id}`}>Hora</Label>
                <Input id={`hora-${cita.id}`} type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`notas-${cita.id}`}>Notas</Label>
              <Textarea id={`notas-${cita.id}`} rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={actualizar.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={borrando} onOpenChange={setBorrando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la cita?</AlertDialogTitle>
            <AlertDialogDescription>
              {nombrePaciente}, {parsearFecha(cita.fecha.slice(0, 10)).toLocaleDateString("es-ES")} a las {cita.hora}. Desaparece
              del calendario; si era futura y el paciente tiene email, se le avisa de la cancelación. Para conservarla en el
              historial, usa mejor "Cancelar cita".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <Button variant="destructive" onClick={borrar} disabled={eliminar.isPending}>
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
