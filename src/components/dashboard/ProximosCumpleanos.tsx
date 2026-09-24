import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ListaCumpleanos } from "@/components/cumpleanos/ListaCumpleanos";
import { useCumpleanos } from "@/hooks/useCumpleanos";
import { hoyISO, sumarDias } from "@/lib/fechas";

const DIAS_ADELANTE = 7;

/**
 * Recordatorio de cumpleaños: los de hoy y los próximos días, más los de ayer
 * que aún no se han felicitado (por si el día pasó sin abrir la app).
 */
export function ProximosCumpleanos() {
  const hoy = hoyISO();
  const { data = [], isLoading } = useCumpleanos(sumarDias(hoy, -1), sumarDias(hoy, DIAS_ADELANTE));

  const cumpleanos = useMemo(() => data.filter((c) => c.fecha >= hoy || !c.felicitacion), [data, hoy]);
  const pendientesHoy = cumpleanos.filter((c) => c.fecha <= hoy && !c.felicitacion).length;

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5 text-pink-500" />
          Cumpleaños
          {pendientesHoy > 0 && (
            <span className="rounded-full bg-pink-500 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesHoy} por felicitar
            </span>
          )}
        </CardTitle>
        <Link to="/calendario" className="text-sm text-primary hover:underline">
          Ver calendario
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : cumpleanos.length > 0 ? (
          <ListaCumpleanos cumpleanos={cumpleanos} mostrarCuando />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ningún paciente cumple años en los próximos {DIAS_ADELANTE} días
          </p>
        )}
      </CardContent>
    </Card>
  );
}
