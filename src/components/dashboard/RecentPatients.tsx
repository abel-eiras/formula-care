import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Patient {
  id: string;
  name: string;
  lastVisit: string;
  service: "dermo" | "bio";
  status: "pending" | "completed";
}

const recentPatients: Patient[] = [
  { id: "1", name: "María García López", lastVisit: "Hace 2 horas", service: "dermo", status: "completed" },
  { id: "2", name: "Carlos Rodríguez", lastVisit: "Hace 4 horas", service: "bio", status: "pending" },
  { id: "3", name: "Ana Fernández", lastVisit: "Ayer", service: "dermo", status: "completed" },
  { id: "4", name: "Pedro Martínez", lastVisit: "Ayer", service: "bio", status: "completed" },
  { id: "5", name: "Laura Sánchez", lastVisit: "Hace 2 días", service: "dermo", status: "pending" },
];

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
};

export function RecentPatients() {
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
        {recentPatients.map((patient) => (
          <Link
            key={patient.id}
            to={`/pacientes/${patient.id}`}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <Avatar className="h-10 w-10 border-2 border-muted">
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                {getInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {patient.name}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{patient.lastVisit}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={patient.service === "dermo" ? "default" : "secondary"}
                className="text-xs"
              >
                {patient.service === "dermo" ? "Dermo" : "Bio"}
              </Badge>
              {patient.status === "pending" && (
                <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
