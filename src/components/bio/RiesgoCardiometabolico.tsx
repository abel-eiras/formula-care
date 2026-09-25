/**
 * Riesgo cardiovascular (SCORE2) y test de riesgo de diabetes (FINDRISC)
 * dentro del análisis bioquímico. SCORE2 se calcula solo cuando la prueba
 * incluye tensión, colesterol total y HDL; FINDRISC se ofrece cuando se ha
 * medido la glucemia o la HbA1c.
 */
import { AlertTriangle, HeartPulse, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EnlaceAyuda } from "@/components/ayuda/EnlaceAyuda";
import {
  calcularScore2,
  faltaParaScore2,
  TEXTO_CATEGORIA_SCORE2,
  type CategoriaScore2,
} from "@/lib/riesgo/score2";
import {
  PREGUNTAS_FINDRISC,
  respuesta,
  resultadoFindrisc,
  type IdPreguntaFindrisc,
  type RespuestasFindrisc,
} from "@/lib/riesgo/findrisc";
import { posibleDiabetes, respuestasAutomaticas, type DatosRiesgo } from "@/lib/riesgo/datosRiesgo";

const ESTILO_CATEGORIA: Record<CategoriaScore2 | string, string> = {
  "bajo-moderado": "bg-success-soft text-success border-success/20",
  bajo: "bg-success-soft text-success border-success/20",
  "ligeramente-elevado": "bg-warning-soft text-warning border-warning/20",
  moderado: "bg-warning-soft text-warning border-warning/20",
  alto: "bg-destructive-soft text-destructive border-destructive/20",
  "muy-alto": "bg-destructive-soft text-destructive border-destructive/20",
};

interface Props {
  datos: DatosRiesgo;
  fumador: boolean | null;
  onFumador: (valor: boolean) => void;
  /** null = no se hace el test */
  findrisc: RespuestasFindrisc | null;
  onFindrisc: (respuestas: RespuestasFindrisc | null) => void;
}

function Score2({ datos, fumador, onFumador }: Pick<Props, "datos" | "fumador" | "onFumador">) {
  const faltan = faltaParaScore2({
    edad: datos.edad ?? undefined,
    sexo: datos.sexo,
    fumador: fumador ?? undefined,
    sistolica: datos.sistolica,
    colesterolTotal: datos.colesterolTotal,
    colesterolHDL: datos.colesterolHDL,
  });
  const resultado =
    faltan.length === 0
      ? calcularScore2({
          edad: datos.edad!,
          sexo: datos.sexo as "M" | "F",
          fumador: fumador!,
          sistolica: datos.sistolica!,
          colesterolTotal: datos.colesterolTotal!,
          colesterolHDL: datos.colesterolHDL!,
        })
      : null;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Riesgo cardiovascular a 10 años (SCORE2)</h4>
      <div className="flex flex-wrap items-center gap-4">
        <Label>¿Fuma actualmente?</Label>
        <RadioGroup
          className="flex gap-4"
          value={fumador == null ? "" : fumador ? "si" : "no"}
          onValueChange={(valor) => onFumador(valor === "si")}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="si" id="fumador-si" />
            <Label htmlFor="fumador-si" className="font-normal">Sí</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="fumador-no" />
            <Label htmlFor="fumador-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {resultado ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold">{resultado.riesgo.toLocaleString("es-ES")} %</span>
          <Badge className={cn("text-xs", ESTILO_CATEGORIA[resultado.categoria])}>
            {TEXTO_CATEGORIA_SCORE2[resultado.categoria]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {resultado.modelo}, calibrado para España · a esta edad: menos de {resultado.umbrales[0]} % bajo-moderado, desde{" "}
            {resultado.umbrales[1]} % muy alto
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Para calcularlo falta: {faltan.join(", ")}.</p>
      )}

      {posibleDiabetes(datos.glucemia, datos.hba1c) && (
        <p className="flex items-start gap-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          La glucemia o la HbA1c están en rango de diabetes: SCORE2 no está pensado para personas con diabetes. Tómalo
          solo como orientación y deriva al médico.
        </p>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Para personas sin enfermedad cardiovascular, diabetes, enfermedad renal crónica ni hipercolesterolemia familiar.
      </p>
    </div>
  );
}

function Findrisc({ datos, findrisc, onFindrisc }: Pick<Props, "datos" | "findrisc" | "onFindrisc">) {
  const automaticas = respuestasAutomaticas(datos);
  // Lo calculado con los datos del análisis manda sobre lo guardado
  const respuestas: RespuestasFindrisc = { ...(findrisc ?? {}), ...automaticas };
  const resultado = findrisc ? resultadoFindrisc(respuestas) : null;

  const responder = (id: IdPreguntaFindrisc, valor: string) =>
    onFindrisc({ ...respuestas, [id]: respuesta(id, valor) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="hacer-findrisc"
          checked={findrisc !== null}
          onCheckedChange={(marcado) => onFindrisc(marcado ? automaticas : null)}
        />
        <Label htmlFor="hacer-findrisc" className="font-semibold">
          Hacer el test FINDRISC (riesgo de diabetes tipo 2 a 10 años)
        </Label>
      </div>

      {findrisc && (
        <div className="space-y-4 rounded-md border border-border/60 p-4">
          {PREGUNTAS_FINDRISC.map((pregunta, i) => {
            const auto = automaticas[pregunta.id];
            const actual = respuestas[pregunta.id];
            return (
              <div key={pregunta.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <Label className="leading-snug">
                    {i + 1}. {pregunta.texto}
                  </Label>
                  {actual && (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {actual.puntos} {actual.puntos === 1 ? "punto" : "puntos"}
                    </span>
                  )}
                </div>
                {auto ? (
                  <p className="text-sm text-muted-foreground">
                    {pregunta.opciones.find((o) => o.valor === auto.valor)?.texto} (calculado con los datos del análisis)
                  </p>
                ) : (
                  <RadioGroup
                    className="flex flex-wrap gap-x-5 gap-y-2"
                    value={actual?.valor ?? ""}
                    onValueChange={(valor) => responder(pregunta.id, valor)}
                  >
                    {pregunta.opciones.map((opcion) => (
                      <div key={opcion.valor} className="flex items-center gap-2">
                        <RadioGroupItem value={opcion.valor} id={`findrisc-${pregunta.id}-${opcion.valor}`} />
                        <Label htmlFor={`findrisc-${pregunta.id}-${opcion.valor}`} className="font-normal">
                          {opcion.texto}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            );
          })}

          {resultado ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
              <span className="text-2xl font-bold">{resultado.total} puntos</span>
              <Badge className={cn("text-xs", ESTILO_CATEGORIA[resultado.categoria])}>{resultado.texto}</Badge>
              <span className="text-xs text-muted-foreground">
                Riesgo estimado de diabetes tipo 2 en 10 años: {resultado.riesgo}
              </span>
            </div>
          ) : (
            <p className="border-t border-border/60 pt-3 text-sm text-muted-foreground">
              Responde todas las preguntas para ver el resultado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RiesgoCardiometabolico({ datos, fumador, onFumador, findrisc, onFindrisc }: Props) {
  const ofrecerFindrisc = datos.glucemia !== undefined || datos.hba1c !== undefined || findrisc !== null;
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <HeartPulse className="h-5 w-5" />
            Riesgo cardiovascular y de diabetes
          </h3>
          <EnlaceAyuda tema="score2-findrisc" texto="Cómo se calcula" />
        </div>
        <Score2 datos={datos} fumador={fumador} onFumador={onFumador} />
        {ofrecerFindrisc && <Findrisc datos={datos} findrisc={findrisc} onFindrisc={onFindrisc} />}
        {!ofrecerFindrisc && (
          <p className="text-sm text-muted-foreground">
            El test FINDRISC se ofrece cuando se mide la glucemia o la hemoglobina glucosilada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
