import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { usePacientesRecientes } from "@/hooks/useEstadisticas";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Paciente } from "@/types";

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
};

const formatLastVisit = (fecha: string | undefined): string => {
  if (!fecha) return "Sin visitas";
  
  try {
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    } else if (diffDays === 1) {
      return "Ayer";
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return fechaObj.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    }
  } catch {
    return "Fecha inválida";
  }
};

const getLastService = (paciente: Paciente & { analisisDermo: any[]; analisisBio: any[] }): { type: "dermo" | "bio" | null; fecha: string | null } => {
  const ultimoDermo = paciente.analisisDermo?.[0];
  const ultimoBio = paciente.analisisBio?.[0];

  if (!ultimoDermo && !ultimoBio) {
    return { type: null, fecha: null };
  }

  if (!ultimoDermo) {
    return { type: "bio", fecha: ultimoBio?.fecha || null };
  }

  if (!ultimoBio) {
    return { type: "dermo", fecha: ultimoDermo?.fecha || null };
  }

  // Comparar fechas
  const fechaDermo = new Date(ultimoDermo.fecha);
  const fechaBio = new Date(ultimoBio.fecha);

  if (fechaDermo > fechaBio) {
    return { type: "dermo", fecha: ultimoDermo.fecha };
  } else {
    return { type: "bio", fecha: ultimoBio.fecha };
  }
};

export function RecentPatients() {
  const { data: pacientes, isLoading } = usePacientesRecientes(5);

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Pacientes Recientes</CardTitle>
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
        <CardTitle className="text-lg font-semibold">Pacientes Recientes</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
          <Link to="/pacientes">
            Ver todos
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {pacientes && pacientes.length > 0 ? (
          pacientes.map((paciente: any) => {
            const lastService = getLastService(paciente);
            const lastVisit = formatLastVisit(lastService.fecha || paciente.createdAt);

            return (
              <Link
                key={paciente.id}
                to={`/pacientes/${paciente.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Avatar className="h-10 w-10 border-2 border-muted">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {getInitials(paciente.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {paciente.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{lastVisit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastService.type && (
                    <Badge 
                      variant={lastService.type === "dermo" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {lastService.type === "dermo" ? "Dermo" : "Bio"}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay pacientes registrados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
