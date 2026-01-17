import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Clock, User, Link2, ExternalLink } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Cita {
  id: string;
  titulo: string;
  paciente: string;
  fecha: Date;
  hora: string;
  tipo: "dermo" | "bio" | "consulta" | "seguimiento";
  notas?: string;
}

// Datos de ejemplo
const citasEjemplo: Cita[] = [
  {
    id: "1",
    titulo: "Análisis Dermocosmético",
    paciente: "María García López",
    fecha: new Date(),
    hora: "10:00",
    tipo: "dermo",
    notas: "Primera consulta"
  },
  {
    id: "2",
    titulo: "Control Bioquímico",
    paciente: "Juan Pérez Martín",
    fecha: new Date(),
    hora: "11:30",
    tipo: "bio"
  },
  {
    id: "3",
    titulo: "Seguimiento",
    paciente: "Ana Rodríguez",
    fecha: new Date(Date.now() + 86400000),
    hora: "09:00",
    tipo: "seguimiento"
  }
];

const tiposCita = {
  dermo: { label: "Dermocosmética", color: "bg-secondary text-secondary-foreground" },
  bio: { label: "Bioquímica", color: "bg-primary text-primary-foreground" },
  consulta: { label: "Consulta General", color: "bg-accent text-accent-foreground" },
  seguimiento: { label: "Seguimiento", color: "bg-muted text-muted-foreground" }
};

export default function Calendario() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [citas, setCitas] = useState<Cita[]>(citasEjemplo);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({
    titulo: "",
    paciente: "",
    hora: "",
    tipo: "consulta" as Cita["tipo"],
    notas: ""
  });
  const { toast } = useToast();

  const citasDelDia = citas.filter(cita => 
    date && isSameDay(cita.fecha, date)
  ).sort((a, b) => a.hora.localeCompare(b.hora));

  const diasConCitas = citas.map(cita => cita.fecha);

  const handleCrearCita = () => {
    if (!date || !nuevaCita.titulo || !nuevaCita.paciente || !nuevaCita.hora) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    const cita: Cita = {
      id: Date.now().toString(),
      ...nuevaCita,
      fecha: date
    };

    setCitas([...citas, cita]);
    setNuevaCita({ titulo: "", paciente: "", hora: "", tipo: "consulta", notas: "" });
    setDialogOpen(false);
    
    toast({
      title: "Cita creada",
      description: `Cita programada para el ${format(date, "d 'de' MMMM", { locale: es })} a las ${nuevaCita.hora}`
    });
  };

  const handleSyncGoogle = () => {
    toast({
      title: "Sincronización con Google Calendar",
      description: "Para sincronizar con Google Calendar, es necesario conectar Lovable Cloud y configurar la integración.",
    });
  };

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
          <Button 
            variant="outline" 
            onClick={handleSyncGoogle}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Sincronizar con Google
          </Button>
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
                  Programa una nueva cita para {date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: es }) : "selecciona una fecha"}
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
                  <Input
                    id="paciente"
                    placeholder="Nombre del paciente"
                    value={nuevaCita.paciente}
                    onChange={(e) => setNuevaCita({ ...nuevaCita, paciente: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hora">Hora *</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={nuevaCita.hora}
                      onChange={(e) => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo</Label>
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
                        <SelectItem value="consulta">Consulta General</SelectItem>
                        <SelectItem value="seguimiento">Seguimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <Button onClick={handleCrearCita} className="bg-primary hover:bg-primary/90">
                  Crear Cita
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Google Calendar Banner */}
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Link2 className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Sincroniza tu calendario</p>
                <p className="text-sm text-muted-foreground">
                  Conecta con Google Calendar para sincronizar tus citas automáticamente
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncGoogle}
              className="border-secondary text-secondary hover:bg-secondary/10"
            >
              Conectar Google Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Selecciona una fecha</CardTitle>
            <CardDescription>
              Los días con citas están marcados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={es}
              className="rounded-md border w-full pointer-events-auto"
              modifiers={{
                hasEvent: diasConCitas
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/20 font-bold"
              }}
            />
          </CardContent>
        </Card>

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
                    "p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
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
                        <span className="truncate">{cita.paciente}</span>
                      </div>
                    </div>
                    <Badge className={cn("flex-shrink-0 text-xs", tiposCita[cita.tipo].color)}>
                      {tiposCita[cita.tipo].label}
                    </Badge>
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
  );
}
