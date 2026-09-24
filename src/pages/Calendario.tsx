import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Plus, Clock, User, Trash2, Gift, Users, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay, parseISO, isAfter, startOfToday, isSameMonth, addDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCitas, useCrearCita, useEliminarCita } from "@/hooks/useCitas";
import { usePacientes } from "@/hooks/usePacientes";
import { useCumpleanos } from "@/hooks/useCumpleanos";
import { ListaCumpleanos } from "@/components/cumpleanos/ListaCumpleanos";
import { hoyISO, parsearFecha } from "@/lib/fechas";
import { useEventos } from "@/hooks/useEventos";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Cita } from "@/types";

// Tipos para el formulario de nueva cita
interface NuevaCitaForm {
  titulo: string;
  pacienteId: string;
  fecha: string; // Formato YYYY-MM-DD
  hora: string;
  tipo: Cita["tipo"];
  notas: string;
}

// Configuración de tipos de cita
const tiposCita: Record<Cita["tipo"], { label: string; color: string }> = {
  dermo: { label: "Dermocosmética", color: "bg-secondary text-secondary-foreground" },
  bio: { label: "Bioquímica", color: "bg-primary text-primary-foreground" },
  nutricion: { label: "Nutrición", color: "bg-success text-white" },
  consulta: { label: "Consulta General", color: "bg-accent text-accent-foreground" },
  seguimiento: { label: "Seguimiento", color: "bg-muted text-muted-foreground" }
};

// Estado inicial del formulario
const formInicial: NuevaCitaForm = {
  titulo: "",
  pacienteId: "",
  fecha: format(new Date(), "yyyy-MM-dd"),
  hora: "",
  tipo: "consulta",
  notas: ""
};

export default function Calendario() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mesVisible, setMesVisible] = useState<Date>(() => startOfMonth(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevaCita, setNuevaCita] = useState<NuevaCitaForm>(formInicial);
  const { toast } = useToast();

  // Hooks de datos
  const { data: todasLasCitas = [], isLoading: isLoadingCitas } = useCitas();
  const { data: pacientes = [], isLoading: isLoadingPacientes } = usePacientes();
  const { data: eventos = [] } = useEventos();
  const crearCitaMutation = useCrearCita();
  const eliminarCitaMutation = useEliminarCita();

  const hoy = startOfToday();

  // Obtener citas futuras ordenadas por fecha y hora
  const citasFuturas = useMemo(() => {
    return todasLasCitas
      .filter((cita) => {
        const fechaCita = parseISO(cita.fecha);
        return isAfter(fechaCita, hoy) || isSameDay(fechaCita, hoy);
      })
      .sort((a, b) => {
        const fechaA = parseISO(a.fecha);
        const fechaB = parseISO(b.fecha);
        if (fechaA.getTime() !== fechaB.getTime()) {
          return fechaA.getTime() - fechaB.getTime();
        }
        return a.hora.localeCompare(b.hora);
      });
  }, [todasLasCitas, hoy]);

  // Filtrar citas del día seleccionado
  const citasDelDia = useMemo(() => {
    if (!date || !todasLasCitas.length) return [];
    
    return todasLasCitas
      .filter((cita) => {
        const fechaCita = parseISO(cita.fecha);
        return isSameDay(fechaCita, date);
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [todasLasCitas, date]);

  // Obtener fechas con citas para marcar en el calendario
  const diasConCitas = useMemo(() => {
    return todasLasCitas.map((cita) => parseISO(cita.fecha));
  }, [todasLasCitas]);

  // Cumpleaños del mes visible (más una semana a cada lado para los días de
  // meses contiguos que muestra el calendario). Se calculan en el servidor
  // desde la fecha de nacimiento de cada paciente.
  const desdeCumpleanos = hoyISO(addDays(startOfMonth(mesVisible), -7));
  const hastaCumpleanos = hoyISO(addDays(endOfMonth(mesVisible), 7));
  const { data: cumpleanos = [] } = useCumpleanos(desdeCumpleanos, hastaCumpleanos);

  // Días con cumpleaños para marcar en el calendario
  const diasConCumpleanos = useMemo(() => cumpleanos.map((c) => parsearFecha(c.fecha)), [cumpleanos]);

  // Cumpleaños del día seleccionado
  const cumpleanosDelDia = useMemo(() => {
    if (!date) return [];
    const dia = hoyISO(date);
    return cumpleanos.filter((c) => c.fecha === dia);
  }, [cumpleanos, date]);

  const seleccionarDia = (dia: Date | undefined) => {
    setDate(dia);
    // Si se pulsa un día de otro mes, el calendario pasa a ese mes
    if (dia) setMesVisible(startOfMonth(dia));
  };

  // Crear nueva cita
  const handleCrearCita = async () => {
    if (!nuevaCita.fecha || !nuevaCita.titulo || !nuevaCita.pacienteId || !nuevaCita.hora) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      await crearCitaMutation.mutateAsync({
        titulo: nuevaCita.titulo,
        pacienteId: nuevaCita.pacienteId,
        fecha: nuevaCita.fecha,
        hora: nuevaCita.hora,
        tipo: nuevaCita.tipo,
        notas: nuevaCita.notas || undefined,
      });

      const fechaCita = parseISO(nuevaCita.fecha);
      setNuevaCita({ ...formInicial, fecha: format(new Date(), "yyyy-MM-dd") });
      setDialogOpen(false);
      
      toast({
        title: "Cita creada",
        description: `Cita programada para el ${format(fechaCita, "d 'de' MMMM", { locale: es })} a las ${nuevaCita.hora}`
      });
    } catch (error) {
      toast({
        title: "Error al crear cita",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };

  // Eliminar cita
  const handleEliminarCita = async (citaId: string) => {
    try {
      await eliminarCitaMutation.mutateAsync(citaId);
      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error al eliminar cita",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };

  // Obtener nombre del paciente
  const getNombrePaciente = (cita: Cita): string => {
    if (cita.paciente?.name) return cita.paciente.name;
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    return paciente?.name || "Paciente desconocido";
  };

  if (isLoadingCitas) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            Calendario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las citas y eventos de la farmacia
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nueva Cita</DialogTitle>
                <DialogDescription>
                  Programa una nueva cita para un paciente
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    placeholder="Ej: Análisis Dermocosmético"
                    value={nuevaCita.titulo}
                    onChange={(e) => setNuevaCita({ ...nuevaCita, titulo: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paciente">Paciente *</Label>
                  <Select 
                    value={nuevaCita.pacienteId} 
                    onValueChange={(value) => setNuevaCita({ ...nuevaCita, pacienteId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingPacientes ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                      ) : (
                        pacientes.map((paciente) => (
                          <SelectItem key={paciente.id} value={paciente.id}>
                            {paciente.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fecha">Fecha *</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={nuevaCita.fecha}
                      onChange={(e) => setNuevaCita({ ...nuevaCita, fecha: e.target.value })}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hora">Hora *</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={nuevaCita.hora}
                      onChange={(e) => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo de servicio</Label>
                  <Select 
                    value={nuevaCita.tipo} 
                    onValueChange={(value: Cita["tipo"]) => setNuevaCita({ ...nuevaCita, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dermo">Dermocosmética</SelectItem>
                      <SelectItem value="bio">Bioquímica</SelectItem>
                      <SelectItem value="nutricion">Nutrición</SelectItem>
                      <SelectItem value="consulta">Consulta General</SelectItem>
                      <SelectItem value="seguimiento">Seguimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    placeholder="Notas adicionales..."
                    value={nuevaCita.notas}
                    onChange={(e) => setNuevaCita({ ...nuevaCita, notas: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCrearCita} 
                  className="bg-primary hover:bg-primary/90"
                  disabled={crearCitaMutation.isPending}
                >
                  {crearCitaMutation.isPending ? "Creando..." : "Crear Cita"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs: Vista Calendario y Vista Lista */}
      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista" className="gap-2">
            <Users className="h-4 w-4" />
            Todas las citas
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Vista Calendario
          </TabsTrigger>
        </TabsList>

        {/* Vista Lista - Todas las citas futuras */}
        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Próximas Citas
              </CardTitle>
              <CardDescription>
                {citasFuturas.length} citas programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {citasFuturas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay citas programadas</p>
                    <Button 
                      variant="link" 
                      className="text-primary mt-2"
                      onClick={() => setDialogOpen(true)}
                    >
                      Crear primera cita
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {citasFuturas.map((cita) => (
                        <TableRow key={cita.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {format(parseISO(cita.fecha), "d MMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {cita.hora}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {getNombrePaciente(cita)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", tiposCita[cita.tipo]?.color || "")}>
                              {tiposCita[cita.tipo]?.label || cita.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {cita.titulo}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleEliminarCita(cita.id)}
                              disabled={eliminarCitaMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Eventos activos */}
          {eventos.filter(e => e.activo).length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary" />
                  Eventos Activos
                </CardTitle>
                <CardDescription>
                  Talleres y eventos con inscripción abierta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Max. Asistentes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.filter(e => e.activo).map((evento) => {
                      // fechas y horas ya vienen como arrays desde la API
                      const fechas = evento.fechas || [];
                      const horas = evento.horas || [];
                      
                      return (
                        <TableRow key={evento.id}>
                          <TableCell className="font-medium">
                            {evento.nombre}
                            {evento.descripcion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {evento.descripcion}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {fechas.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {fechas.slice(0, 3).map((f, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {format(parseISO(f), "d MMM", { locale: es })}
                                  </Badge>
                                ))}
                                {fechas.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{fechas.length - 3} más
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin fechas</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {horas.length > 0 ? horas.join(", ") : "Sin horario"}
                          </TableCell>
                          <TableCell>{evento.duracion} min</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {evento.maxAsistentes} personas
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vista Calendario */}
        <TabsContent value="calendario">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Selecciona una fecha</CardTitle>
                <CardDescription>
                  Los días con citas están marcados en azul, cumpleaños en rosa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={seleccionarDia}
                  month={mesVisible}
                  onMonthChange={setMesVisible}
                  locale={es}
                  weekStartsOn={1}
                  className="rounded-md border w-full pointer-events-auto"
                  modifiers={{
                    hasEvent: diasConCitas,
                    hasBirthday: diasConCumpleanos,
                  }}
                  modifiersClassNames={{
                    hasEvent: "bg-primary/20 font-bold",
                    hasBirthday: "bg-pink-200 font-bold ring-2 ring-pink-400",
                  }}
                />
              </CardContent>
            </Card>

            {/* Citas del día + Cumpleaños */}
            <div className="space-y-6">
              {/* Cumpleaños del día */}
              {cumpleanosDelDia.length > 0 && (
                <Card className="border-pink-200 bg-pink-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-pink-700">
                      <Gift className="h-5 w-5" />
                      Cumpleaños
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ListaCumpleanos cumpleanos={cumpleanosDelDia} />
                  </CardContent>
                </Card>
              )}

              {/* Citas del día */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-secondary" />
                    {date ? format(date, "d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}
                  </CardTitle>
                  <CardDescription>
                    {citasDelDia.length} {citasDelDia.length === 1 ? "cita programada" : "citas programadas"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {citasDelDia.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay citas para este día</p>
                      <Button 
                        variant="link" 
                        className="text-primary mt-2"
                        onClick={() => setDialogOpen(true)}
                      >
                        Añadir una cita
                      </Button>
                    </div>
                  ) : (
                    citasDelDia.map((cita) => (
                      <div
                        key={cita.id}
                        className={cn(
                          "p-4 rounded-lg border transition-all hover:shadow-md",
                          "bg-card hover:bg-accent/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground truncate">
                                {cita.titulo}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{cita.hora}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span className="truncate">{getNombrePaciente(cita)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("flex-shrink-0 text-xs", tiposCita[cita.tipo]?.color || "")}>
                              {tiposCita[cita.tipo]?.label || cita.tipo}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleEliminarCita(cita.id)}
                              disabled={eliminarCitaMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {cita.notas && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                            {cita.notas}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
