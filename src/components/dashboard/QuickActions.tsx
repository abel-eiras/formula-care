import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Sparkles, FlaskConical, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    title: "Nuevo Paciente",
    description: "Registrar paciente",
    icon: UserPlus,
    href: "/pacientes/nuevo",
    variant: "primary" as const,
  },
  {
    title: "Análisis Dermo",
    description: "Iniciar consulta",
    icon: Sparkles,
    href: "/servicios/dermo",
    variant: "secondary" as const,
  },
  {
    title: "Análisis Bio",
    description: "Parámetros salud",
    icon: FlaskConical,
    href: "/servicios/bio",
    variant: "default" as const,
  },
  {
    title: "Agendar Cita",
    description: "Nueva cita",
    icon: Calendar,
    href: "/calendario",
    variant: "outline" as const,
    disabled: false,
  },
];

export function QuickActions() {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant={action.variant === "primary" ? "default" : action.variant === "secondary" ? "secondary" : "outline"}
              className="h-auto py-4 px-4 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
              disabled={action.disabled}
              asChild={!action.disabled}
            >
              {action.disabled ? (
                <div className="flex flex-col items-center gap-2">
                  <action.icon className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs opacity-70">{action.description}</p>
                  </div>
                </div>
              ) : (
                <Link to={action.href} className="flex flex-col items-center gap-2">
                  <action.icon className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs opacity-70">{action.description}</p>
                  </div>
                </Link>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
