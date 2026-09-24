import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar, 
  Sparkles, 
  FlaskConical,
  Edit,
  Clock,
  TrendingUp,
  FileText,
  Salad
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePaciente } from "@/hooks/usePacientes";
import { ProteccionDatosPaciente } from "@/components/patient/ProteccionDatosPaciente";
import { parsearFecha } from "@/lib/fechas";
import { useAnalisisDermoPorPaciente } from "@/hooks/useAnalisisDermo";
import { useAnalisisBioPorPaciente } from "@/hooks/useAnalisisBio";
import { useProgramasNutricion } from "@/hooks/useNutricion";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EvolutionChartBio } from "@/components/patient/EvolutionChartBio";
import { EvolucionMediciones } from "@/components/patient/EvolucionMediciones";
import { textoEdad } from "@/lib/edad";

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
};

export default function PacienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Solo este paciente (antes se descargaba la lista completa para buscarlo)
  const { data: paciente } = usePaciente(id ?? "");
  const { data: analisisDermo = [], isLoading: loadingDermo } = useAnalisisDermoPorPaciente(id);
  const { data: analisisBio = [], isLoading: loadingBio } = useAnalisisBioPorPaciente(id);
  const { data: programasNutricion = [], isLoading: loadingNutricion } = useProgramasNutricion(id);

  if (!paciente) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Combinar y ordenar historial
  const historial = [
    ...analisisDermo.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      tipo: "dermo" as const,
      titulo: "Análisis Dermocosmético",
      resumen: a.motivoConsulta || "Consulta dermocosmética",
    })),
    ...analisisBio.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      tipo: "bio" as const,
      titulo: "Análisis Bioquímico",
      resumen: `IMC: ${a.imc ?? "N/A"} | Glucemia: ${a.glucemia ?? "N/A"}`,
    })),
    ...programasNutricion.flatMap((programa) =>
      programa.visitas.map((v) => ({
        id: v.id,
        fecha: v.fecha,
        tipo: "nutricion" as const,
        titulo: v.tipo === "inicial" ? "Nutrición · visita inicial" : "Nutrición · seguimiento",
        resumen: [v.peso != null && `Peso: ${v.peso} kg`, v.imc != null && `IMC: ${v.imc}`, v.glp1Activo && "GLP-1 activo"]
          .filter(Boolean)
          .join(" | ") || "Visita de nutrición",
        programaId: programa.id,
      }))
    ),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" asChild className="gap-2 -ml-2">
        <Link to="/pacientes">
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </Link>
      </Button>

      {/* Patient Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 shadow-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="h-24 w-24 border-4 border-muted">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {getInitials(paciente.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{paciente.name}</h1>
                    <p className="text-muted-foreground">{textoEdad(paciente.birthDate)} • {paciente.sex === "M" ? "Hombre" : paciente.sex === "F" ? "Mujer" : "Otro"}</p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => navigate(`/pacientes/${id}/editar`)}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{paciente.phone}</span>
                  </div>
                  {paciente.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{paciente.email}</span>
                    </div>
                  )}
                  {paciente.birthDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Nacimiento: {parsearFecha(paciente.birthDate).toLocaleDateString("es-ES")}</span>
                    </div>
                  )}
                  {paciente.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{paciente.address}</span>
                    </div>
                  )}
                </div>
                {paciente.notes && (
                  <div className="p-3 bg-warning-soft rounded-lg border border-warning/20">
                    <p className="text-sm text-foreground">
                      <strong>Notas:</strong> {paciente.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="lg:w-80 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Nuevo Análisis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full h-14 text-left justify-start gap-3" asChild>
                <Link to={`/servicios/dermo?pacienteId=${id}`}>
                  <Sparkles className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Análisis Dermo</p>
                    <p className="text-xs opacity-80">Evaluación de piel</p>
                  </div>
                </Link>
              </Button>
              <Button variant="secondary" className="w-full h-14 text-left justify-start gap-3" asChild>
                <Link to={`/servicios/bio?pacienteId=${id}`}>
                  <FlaskConical className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Análisis Bio</p>
                    <p className="text-xs opacity-80">Parámetros de salud</p>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="w-full h-14 text-left justify-start gap-3" asChild>
                <Link to={`/servicios/nutricion?pacienteId=${id}`}>
                  <Salad className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Nutrición</p>
                    <p className="text-xs opacity-80">Seguimiento nutricional y GLP-1</p>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>
          <ProteccionDatosPaciente paciente={paciente} />
        </div>
      </div>

      {/* Tabs: Historial y Evolución */}
      <Tabs defaultValue="historial" className="space-y-6">
        <TabsList>
          <TabsTrigger value="historial" className="gap-2">
            <FileText className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="evolucion" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolución
          </TabsTrigger>
        </TabsList>

        {/* Tab: Historial */}
        <TabsContent value="historial">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Historial de Visitas</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDermo || loadingBio || loadingNutricion ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : historial.length > 0 ? (
                <div className="space-y-4">
                  {historial.map((visit, index) => (
                    <div 
                      key={visit.id}
                      className="relative flex gap-4 pb-4 last:pb-0"
                    >
                      {/* Timeline line */}
                      {index < historial.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                      )}
                      
                      {/* Icon */}
                      <div className={`
                        relative z-10 flex h-10 w-10 items-center justify-center rounded-full
                        ${visit.tipo === "dermo" ? "bg-primary text-primary-foreground" : visit.tipo === "bio" ? "bg-secondary text-secondary-foreground" : "bg-success text-white"}
                      `}>
                        {visit.tipo === "dermo" ? (
                          <Sparkles className="h-5 w-5" />
                        ) : visit.tipo === "bio" ? (
                          <FlaskConical className="h-5 w-5" />
                        ) : (
                          <Salad className="h-5 w-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={visit.tipo === "dermo" ? "default" : "secondary"}>
                            {visit.titulo}
                          </Badge>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(visit.fecha).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{visit.resumen}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary -ml-2"
                          onClick={() => {
                            if (visit.tipo === "dermo") {
                              navigate(`/servicios/dermo?id=${visit.id}`);
                            } else if (visit.tipo === "nutricion") {
                              navigate(`/servicios/nutricion/visita?programaId=${visit.programaId}&id=${visit.id}`);
                            } else {
                              navigate(`/servicios/bio?id=${visit.id}`);
                            }
                          }}
                        >
                          Ver detalles completos
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay historial disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Evolución */}
        <TabsContent value="evolucion">
          <div className="space-y-8">
            {/* Medidas de todos los servicios (tabla única de mediciones) */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Medidas y constantes</h2>
              <EvolucionMediciones pacienteId={id!} />
            </section>
            {analisisBio.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Parámetros bioquímicos</h2>
                <EvolutionChartBio pacienteId={id!} />
              </section>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
