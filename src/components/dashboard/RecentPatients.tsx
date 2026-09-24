import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { usePacientesRecientes } from "@/hooks/useEstadisticas";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Paciente } from "@/types";
import { hoyISO, textoFechaRelativa } from "@/lib/fechas";
import { NOMBRE_SERVICIO, VARIANTE_SERVICIO } from "@/lib/servicios";

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
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
          pacientes.map((paciente: Paciente) => {
            const ultima = paciente.ultimaVisita;
            const textoVisita = ultima
              ? textoFechaRelativa(ultima.fecha)
              : paciente.createdAt
              ? `Alta: ${textoFechaRelativa(hoyISO(new Date(paciente.createdAt)))}`
              : "Sin visitas";

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
                    <span>{textoVisita}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ultima && (
                    <Badge variant={VARIANTE_SERVICIO[ultima.servicio]} className="text-xs">
                      {NOMBRE_SERVICIO[ultima.servicio]}
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
