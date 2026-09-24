import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Calendar, Clock, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useProximasRevisiones, type RevisionProxima } from "@/hooks/useEstadisticas";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { hoyISO, parsearFecha } from "@/lib/fechas";

const formatearFecha = (fecha: string): string => {
  try {
    return parsearFecha(fecha).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fecha;
  }
};

export function ProximasRevisiones() {
  const { data: revisiones = [], isLoading } = useProximasRevisiones(5);

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Próximas Revisiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Próximas Revisiones
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
          <Link to="/calendario">
            Ver todas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {revisiones.length > 0 ? (
          revisiones.map((revision: RevisionProxima) => {
            // El backend solo devuelve revisiones con fecha, de ahí la aserción.
            // Días de calendario entre hoy y la revisión (ambos a mediodía local)
            const diasRestantes = Math.round(
              (parsearFecha(revision.proximaRevision!.slice(0, 10)).getTime() - parsearFecha(hoyISO()).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const esUrgente = diasRestantes <= 7;
            const esMuyUrgente = diasRestantes <= 3;

            return (
              <Link
                key={revision.id}
                to={`/pacientes/${revision.pacienteId}`}
                className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      p-2 rounded-lg
                      ${esMuyUrgente ? "bg-destructive/10 text-destructive" : esUrgente ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}
                    `}
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {revision.paciente?.name || "Paciente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatearFecha(revision.proximaRevision)}</span>
                      <span>· {revision.servicio === "nutricion" ? "Nutrición" : "Dermo"}</span>
                      {diasRestantes >= 0 && (
                        <Badge
                          variant={esMuyUrgente ? "destructive" : esUrgente ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {diasRestantes === 0
                            ? "Hoy"
                            : diasRestantes === 1
                            ? "Mañana"
                            : `En ${diasRestantes} días`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay revisiones programadas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
