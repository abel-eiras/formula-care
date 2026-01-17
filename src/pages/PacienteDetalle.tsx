import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar, 
  Sparkles, 
  FlaskConical,
  Edit,
  Clock
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

// Mock patient data
const patientData = {
  id: "1",
  name: "María García López",
  age: 45,
  sex: "Mujer",
  phone: "612 345 678",
  email: "maria.garcia@email.com",
  birthDate: "1979-03-15",
  address: "Calle Mayor 15, Pontevea",
  notes: "Piel sensible, evitar productos con alcohol",
  history: [
    { id: "1", date: "2024-01-15", type: "dermo", summary: "Análisis dermocosmético completo. Piel mixta con tendencia a deshidratación." },
    { id: "2", date: "2024-01-02", type: "bio", summary: "Control de parámetros. Glucosa y colesterol en rango normal." },
    { id: "3", date: "2023-12-10", type: "dermo", summary: "Seguimiento tratamiento antimanchas. Mejora visible." },
    { id: "4", date: "2023-11-20", type: "bio", summary: "Primera consulta bioquímica. IMC: 24.5" },
  ]
};

export default function PacienteDetalle() {
  const { id } = useParams();
  const patient = patientData; // In real app, fetch by id

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
                  MG
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
                    <p className="text-muted-foreground">{patient.age} años • {patient.sex}</p>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Nacimiento: {new Date(patient.birthDate).toLocaleDateString("es-ES")}</span>
                  </div>
                </div>
                {patient.notes && (
                  <div className="p-3 bg-warning-soft rounded-lg border border-warning/20">
                    <p className="text-sm text-foreground">
                      <strong>Notas:</strong> {patient.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:w-80 shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Nuevo Análisis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full h-14 text-left justify-start gap-3" asChild>
              <Link to={`/servicios/dermo?paciente=${id}`}>
                <Sparkles className="h-5 w-5" />
                <div>
                  <p className="font-medium">Análisis Dermo</p>
                  <p className="text-xs opacity-80">Evaluación de piel</p>
                </div>
              </Link>
            </Button>
            <Button variant="secondary" className="w-full h-14 text-left justify-start gap-3" asChild>
              <Link to={`/servicios/bio?paciente=${id}`}>
                <FlaskConical className="h-5 w-5" />
                <div>
                  <p className="font-medium">Análisis Bio</p>
                  <p className="text-xs opacity-80">Parámetros de salud</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Visit History */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Historial de Visitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patient.history.map((visit, index) => (
              <div 
                key={visit.id}
                className="relative flex gap-4 pb-4 last:pb-0"
              >
                {/* Timeline line */}
                {index < patient.history.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                )}
                
                {/* Icon */}
                <div className={`
                  relative z-10 flex h-10 w-10 items-center justify-center rounded-full
                  ${visit.type === "dermo" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
                `}>
                  {visit.type === "dermo" ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <FlaskConical className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={visit.type === "dermo" ? "default" : "secondary"}>
                      {visit.type === "dermo" ? "Dermocosmética" : "Bioquímica"}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(visit.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{visit.summary}</p>
                  <Button variant="ghost" size="sm" className="text-primary -ml-2">
                    Ver detalles completos
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
