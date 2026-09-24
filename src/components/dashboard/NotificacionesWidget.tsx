import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Calendar, AlertCircle, Clock, Gift } from "lucide-react";
import { useNotificaciones, useContadorNotificaciones, useMarcarNotificacionLeida, useMarcarTodasLeidas } from "@/hooks/useNotificaciones";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const getIconByTipo = (tipo: string) => {
  switch (tipo) {
    case "cita":
      return Calendar;
    case "revision":
      return Clock;
    case "alerta":
      return AlertCircle;
    case "cumpleanos":
      return Gift;
    default:
      return Bell;
  }
};

const getColorByTipo = (tipo: string) => {
  switch (tipo) {
    case "cita":
      return "bg-primary/10 text-primary border-primary/20";
    case "revision":
      return "bg-warning/10 text-warning border-warning/20";
    case "alerta":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "cumpleanos":
      return "bg-pink-100 text-pink-600 border-pink-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function NotificacionesWidget() {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const { data: notificaciones = [], isLoading } = useNotificaciones(false, mostrarTodas ? 10 : 5);
  const { data: contador = 0 } = useContadorNotificaciones();
  const marcarLeida = useMarcarNotificacionLeida();
  const marcarTodasLeidas = useMarcarTodasLeidas();

  const handleMarcarLeida = async (id: string) => {
    await marcarLeida.mutateAsync(id);
  };

  const handleMarcarTodasLeidas = async () => {
    await marcarTodasLeidas.mutateAsync();
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
          </CardTitle>
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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
            {contador > 0 && (
              <Badge variant="destructive" className="ml-2">
                {contador}
              </Badge>
            )}
          </CardTitle>
          {contador > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarcarTodasLeidas}
              disabled={marcarTodasLeidas.isPending}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notificaciones.length > 0 ? (
          <div className="space-y-3">
            {notificaciones.map((notif) => {
              const Icon = getIconByTipo(notif.tipo);
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    notif.leida
                      ? "bg-muted/50 border-border"
                      : "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", getColorByTipo(notif.tipo))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{notif.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.mensaje}</p>
                        </div>
                        {!notif.leida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMarcarLeida(notif.id)}
                            disabled={marcarLeida.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {notif.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      )}
                      {notif.paciente && (
                        <p className="text-xs text-muted-foreground">
                          Paciente: {notif.paciente.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {notificaciones.length >= 5 && !mostrarTodas && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setMostrarTodas(true)}
              >
                Ver todas las notificaciones
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay notificaciones</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
