import { Fragment, useMemo, useState } from "react";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useActualizarRegistroAlimentacion,
  useCrearRegistroAlimentacion,
  useEliminarRegistroAlimentacion,
} from "@/hooks/useNutricion";
import { analizarRegistro, FRANJAS_HORARIAS } from "@/lib/nutricion/analisisRegistro";
import { parsearFecha } from "@/lib/nutricion/metricas";
import {
  CANTIDADES,
  CAUSAS_PICOTEO,
  COMPANIAS,
  etiqueta,
  etiquetas,
  LUGARES,
  MOMENTOS_COMIDA,
  SENSACIONES,
} from "@/lib/nutricion/catalogos";
import type {
  CantidadComida,
  Compania,
  DatosRegistro,
  LugarComida,
  MomentoComida,
  RegistroAlimentacion as Registro,
} from "@/types";
import { CampoTexto, Escala0a10, OpcionesMultiples, OpcionesUnicas } from "./campos";
import { aTexto, formatearFecha, hoyISO } from "@/lib/nutricion/formulario";
import { imprimirRuta } from "@/lib/imprimir";

// ==========================================
// FORMULARIO DE UNA INGESTA
// ==========================================

function estadoInicial(registro?: Registro, fechaPorDefecto?: string) {
  return {
    fecha: registro?.fecha.slice(0, 10) ?? fechaPorDefecto ?? hoyISO(),
    hora: registro?.hora ?? "",
    momento: (registro?.momento ?? null) as MomentoComida | null,
    descripcion: registro?.descripcion ?? "",
    cantidad: (registro?.cantidad ?? null) as CantidadComida | null,
    hambreAntes: registro?.hambreAntes ?? null,
    saciedadDespues: registro?.saciedadDespues ?? null,
    sensaciones: registro?.sensaciones ?? [],
    compania: (registro?.compania ?? null) as Compania | null,
    lugar: (registro?.lugar ?? null) as LugarComida | null,
    causaPicoteo: registro?.causaPicoteo ?? null,
    notas: registro?.notas ?? "",
  };
}

type EstadoIngesta = ReturnType<typeof estadoInicial>;

function DialogoIngesta({
  programaId,
  registro,
  fechaPorDefecto,
  onCerrar,
}: {
  programaId: string;
  registro?: Registro;
  fechaPorDefecto?: string;
  onCerrar: (ultimaFecha?: string) => void;
}) {
  const [form, setForm] = useState<EstadoIngesta>(() => estadoInicial(registro, fechaPorDefecto));
  const crear = useCrearRegistroAlimentacion();
  const actualizar = useActualizarRegistroAlimentacion();
  const guardando = crear.isPending || actualizar.isPending;

  const cambiar = <K extends keyof EstadoIngesta>(campo: K, valor: EstadoIngesta[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (seguirAnadiendo: boolean) => {
    if (!form.momento || !form.descripcion.trim()) {
      toast.error("Indica el momento y qué se ha comido");
      return;
    }
    const datos: DatosRegistro = {
      programaId,
      fecha: form.fecha,
      hora: aTexto(form.hora),
      momento: form.momento,
      descripcion: form.descripcion.trim(),
      cantidad: form.cantidad,
      hambreAntes: form.hambreAntes,
      saciedadDespues: form.saciedadDespues,
      sensaciones: form.sensaciones,
      compania: form.compania,
      lugar: form.lugar,
      causaPicoteo: form.momento === "picoteo" ? form.causaPicoteo : null,
      notas: aTexto(form.notas),
    };
    try {
      if (registro) {
        await actualizar.mutateAsync({ id: registro.id, ...datos });
      } else {
        await crear.mutateAsync(datos);
      }
      toast.success("Ingesta guardada");
      if (seguirAnadiendo) {
        // Se mantiene el día para transcribir seguidas las ingestas de una hoja
        setForm(estadoInicial(undefined, form.fecha));
      } else {
        onCerrar(form.fecha);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar la ingesta");
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{registro ? "Editar ingesta" : "Añadir ingesta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registro-fecha">Día</Label>
              <Input id="registro-fecha" type="date" value={form.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro-hora">Hora</Label>
              <Input id="registro-hora" type="time" value={form.hora} onChange={(e) => cambiar("hora", e.target.value)} />
            </div>
          </div>
          <OpcionesUnicas label="Momento *" opciones={MOMENTOS_COMIDA} value={form.momento} onChange={(v) => cambiar("momento", v)} />
          <CampoTexto id="registro-descripcion" label="¿Qué ha comido? *" multilinea filas={2} value={form.descripcion} onChange={(v) => cambiar("descripcion", v)} />
          <OpcionesUnicas label="Cantidad" opciones={CANTIDADES} value={form.cantidad} onChange={(v) => cambiar("cantidad", v)} />
          {form.momento === "picoteo" && (
            <OpcionesUnicas label="Causa del picoteo" opciones={CAUSAS_PICOTEO} value={form.causaPicoteo} onChange={(v) => cambiar("causaPicoteo", v)} />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Escala0a10 label="Hambre antes" value={form.hambreAntes} onChange={(v) => cambiar("hambreAntes", v)} extremos={["Nada", "Muchísima"]} />
            <Escala0a10 label="Saciedad después" value={form.saciedadDespues} onChange={(v) => cambiar("saciedadDespues", v)} extremos={["Nada", "Muy lleno"]} />
          </div>
          <OpcionesMultiples label="Sensación después de comer" opciones={SENSACIONES} value={form.sensaciones} onChange={(v) => cambiar("sensaciones", v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OpcionesUnicas label="¿Con quién?" opciones={COMPANIAS} value={form.compania} onChange={(v) => cambiar("compania", v)} />
            <OpcionesUnicas label="¿Dónde?" opciones={LUGARES} value={form.lugar} onChange={(v) => cambiar("lugar", v)} />
          </div>
          <CampoTexto id="registro-notas" label="Notas" value={form.notas} onChange={(v) => cambiar("notas", v)} />
        </div>
        <DialogFooter className="gap-2">
          {!registro && (
            <Button variant="outline" onClick={() => guardar(true)} disabled={guardando}>
              Guardar y añadir otra
            </Button>
          )}
          <Button onClick={() => guardar(false)} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// RESUMEN DE PATRONES
// ==========================================

function ResumenRegistro({ registros }: { registros: Registro[] }) {
  const a = useMemo(() => analizarRegistro(registros), [registros]);
  const causasOrdenadas = Object.entries(a.causasPicoteo).sort((x, y) => y[1] - x[1]);
  const franja = FRANJAS_HORARIAS.find((f) => f.id === a.franjaPicoteo);

  const datos: { titulo: string; valor: string; detalle?: string }[] = [
    { titulo: "Días registrados", valor: String(a.diasRegistrados), detalle: `${a.totalIngestas} ingestas` },
    { titulo: "Picoteos", valor: `${a.picoteosPorDia.toLocaleString("es-ES")}/día`, detalle: franja ? `Sobre todo: ${franja.label}` : `${a.totalPicoteos} en total` },
    { titulo: "Hambre media antes", valor: a.hambreMedia != null ? `${a.hambreMedia.toLocaleString("es-ES")}/10` : "—", detalle: `${a.ingestasSinHambre} ingestas sin hambre` },
    { titulo: "Saciedad media después", valor: a.saciedadMedia != null ? `${a.saciedadMedia.toLocaleString("es-ES")}/10` : "—", detalle: `${a.ingestasConMalestar} con malestar` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {datos.map((d) => (
          <Card key={d.titulo} className="shadow-sm border-border/50">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{d.titulo}</p>
              <p className="text-2xl font-bold">{d.valor}</p>
              {d.detalle && <p className="text-xs text-muted-foreground mt-1">{d.detalle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(causasOrdenadas.length > 0 || a.porcentajeSolo != null) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {causasOrdenadas.length > 0 && <span className="text-muted-foreground">Causas de picoteo:</span>}
          {causasOrdenadas.map(([id, n]) => (
            <Badge key={id} variant="outline">
              {etiqueta(CAUSAS_PICOTEO, id)} · {n}
            </Badge>
          ))}
          {a.porcentajeSolo != null && (
            <span className="text-muted-foreground ml-auto">Come solo en el {a.porcentajeSolo} % de las ingestas</span>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// TABLA
// ==========================================

interface RegistroAlimentacionProps {
  programaId: string;
  registros: Registro[];
}

/**
 * Registro de alimentación del programa. El paciente lo rellena en papel
 * (hoja imprimible) y el farmacéutico lo transcribe aquí.
 */
export function RegistroAlimentacion({ programaId, registros }: RegistroAlimentacionProps) {
  const [dialogo, setDialogo] = useState<{ registro?: Registro } | null>(null);
  const [ultimaFecha, setUltimaFecha] = useState<string>();
  const eliminar = useEliminarRegistroAlimentacion();

  // Agrupar por día, más reciente primero
  const porDia = useMemo(() => {
    const grupos = new Map<string, Registro[]>();
    for (const r of registros) {
      const dia = r.fecha.slice(0, 10);
      grupos.set(dia, [...(grupos.get(dia) ?? []), r]);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dia, lista]) => [dia, lista.sort((x, y) => (x.hora ?? "").localeCompare(y.hora ?? ""))] as const);
  }, [registros]);

  const borrar = async (id: string) => {
    try {
      await eliminar.mutateAsync(id);
      toast.success("Ingesta eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar la ingesta");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => imprimirRuta(`/servicios/nutricion/print?tipo=registro&programaId=${programaId}`)}
        >
          <Printer className="h-4 w-4" />
          Hoja en blanco para el paciente
        </Button>
        <Button className="gap-2" onClick={() => setDialogo({})}>
          <Plus className="h-4 w-4" />
          Añadir ingesta
        </Button>
      </div>

      {registros.length > 0 && <ResumenRegistro registros={registros} />}

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Ingestas registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {registros.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aún no hay ingestas. Entrega al paciente la hoja en blanco y transcríbela aquí en la próxima visita.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Momento</TableHead>
                    <TableHead className="min-w-[200px]">¿Qué come?</TableHead>
                    <TableHead>Hambre / saciedad</TableHead>
                    <TableHead>Sensación</TableHead>
                    <TableHead>Compañía</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porDia.map(([dia, lista]) => (
                    <Fragment key={dia}>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={7} className="font-medium first-letter:uppercase">
                          {parsearFecha(dia).toLocaleDateString("es-ES", { weekday: "long" })} · {formatearFecha(dia)}
                        </TableCell>
                      </TableRow>
                      {lista.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.hora ?? "—"}</TableCell>
                          <TableCell>
                            {r.momento === "picoteo" ? (
                              <Badge variant="secondary">
                                Picoteo{r.causaPicoteo ? ` · ${etiqueta(CAUSAS_PICOTEO, r.causaPicoteo).toLowerCase()}` : ""}
                              </Badge>
                            ) : (
                              etiqueta(MOMENTOS_COMIDA, r.momento)
                            )}
                          </TableCell>
                          <TableCell>
                            {r.descripcion}
                            {r.cantidad && <span className="text-muted-foreground"> ({etiqueta(CANTIDADES, r.cantidad).toLowerCase()})</span>}
                          </TableCell>
                          <TableCell>
                            {r.hambreAntes ?? "—"} / {r.saciedadDespues ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">{etiquetas(SENSACIONES, r.sensaciones) || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {[etiqueta(COMPANIAS, r.compania), etiqueta(LUGARES, r.lugar)].filter(Boolean).join(" · ") || "—"}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setDialogo({ registro: r })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => borrar(r.id)} disabled={eliminar.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {dialogo && (
        <DialogoIngesta
          programaId={programaId}
          registro={dialogo.registro}
          fechaPorDefecto={ultimaFecha}
          onCerrar={(fecha) => {
            if (fecha) setUltimaFecha(fecha);
            setDialogo(null);
          }}
        />
      )}
    </div>
  );
}
