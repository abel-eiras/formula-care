import { memo } from "react";
import { AlertTriangle, Info, Lightbulb, Plus, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ETIQUETAS_CATEGORIA, type PrioridadSugerencia, type Sugerencia } from "@/lib/nutricion/sugerencias";

const ESTILO_PRIORIDAD: Record<PrioridadSugerencia, { clase: string; label: string }> = {
  alta: { clase: "border-l-destructive", label: "Prioridad alta" },
  media: { clase: "border-l-warning", label: "A revisar" },
  info: { clase: "border-l-success", label: "Informativa" },
};

interface PanelSugerenciasProps {
  sugerencias: Sugerencia[];
  /** Si se pasa, cada sugerencia muestra un botón para añadir su texto a las recomendaciones */
  onAnadir?: (sugerencia: Sugerencia) => void;
  /** Ids de sugerencias ya añadidas (para desactivar el botón) */
  anadidas?: ReadonlySet<string>;
}

/**
 * Sugerencias para el farmacéutico. Cada una muestra el dato que la ha
 * disparado para que la decisión final sea siempre del profesional.
 */
export const PanelSugerencias = memo(function PanelSugerencias({ sugerencias, onAnadir, anadidas }: PanelSugerenciasProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Sugerencias ({sugerencias.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Orientativas y basadas en reglas a partir de los datos registrados. No sustituyen el criterio profesional ni la
          pauta del médico prescriptor.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sugerencias.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin sugerencias con los datos actuales. Completa medidas, hábitos o el registro de alimentación para obtenerlas.
          </p>
        ) : (
          sugerencias.map((s) => (
            <div key={s.id} className={cn("rounded-md border border-l-4 p-3 space-y-2", ESTILO_PRIORIDAD[s.prioridad].clase)}>
              <div className="flex flex-wrap items-center gap-2">
                {s.prioridad === "alta" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Info className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">{s.titulo}</span>
                <Badge variant="outline" className="text-xs">
                  {ETIQUETAS_CATEGORIA[s.categoria]}
                </Badge>
                {s.derivar && (
                  <Badge className="text-xs gap-1 bg-destructive-soft text-destructive border-destructive/20">
                    <Stethoscope className="h-3 w-3" />
                    Informar al médico
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Motivo:</span> {s.motivo}
              </p>
              <p className="text-sm">{s.texto}</p>
              {onAnadir && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-2 text-primary"
                  disabled={anadidas?.has(s.id)}
                  onClick={() => onAnadir(s)}
                >
                  <Plus className="h-4 w-4" />
                  {anadidas?.has(s.id) ? "Añadida" : "Añadir a recomendaciones"}
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
});
