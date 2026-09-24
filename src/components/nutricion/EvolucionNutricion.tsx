import { memo, useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HITOS_PERDIDA, resumirEvolucion, serieEvolucion, type PuntoEvolucion } from "@/lib/nutricion/metricas";
import type { ProgramaNutricion, VisitaNutricion } from "@/types";
import { formatearDiferencia } from "@/lib/nutricion/formulario";

// Dos colores fijos (identidad de serie) coherentes con los gráficos de Bio.
// Nunca más de dos series por gráfico y sin doble eje: cada magnitud en su gráfico.
const COLOR_1 = "hsl(var(--primary))";
const COLOR_2 = "hsl(var(--secondary))";

interface Serie {
  clave: keyof PuntoEvolucion;
  label: string;
  color: string;
}

interface GraficoProps {
  datos: PuntoEvolucion[];
  series: Serie[];
  unidad: string;
  dominio?: [number | "auto", number | "auto"];
  /** Líneas de referencia horizontales (objetivo, hitos...) */
  referencias?: { valor: number; label: string }[];
}

const GraficoLinea = memo(function GraficoLinea({ datos, series, unidad, dominio, referencias = [] }: GraficoProps) {
  const conDatos = series.filter((s) => datos.some((d) => d[s.clave] != null));
  if (conDatos.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">Todavía no hay datos registrados para este gráfico.</p>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="etiqueta" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={dominio ?? ["auto", "auto"]}
            unit={unidad === "%" ? "%" : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(valor: number, nombre: string) => [`${valor} ${unidad}`, nombre]}
          />
          {conDatos.length > 1 && <Legend />}
          {referencias.map((r) => (
            <ReferenceLine
              key={r.label}
              y={r.valor}
              ifOverflow="extendDomain"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{ value: r.label, position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
          ))}
          {conDatos.map((s) => (
            <Line
              key={s.clave}
              type="monotone"
              dataKey={s.clave}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ fill: s.color, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-bold text-foreground">{valor}</p>
        {detalle && <p className="text-xs text-muted-foreground mt-1">{detalle}</p>}
      </CardContent>
    </Card>
  );
}

interface EvolucionNutricionProps {
  programa: ProgramaNutricion;
  visitas: VisitaNutricion[];
}

/**
 * Evolución del programa: indicadores clave respecto a la visita inicial y
 * gráficos por magnitud (peso, % perdido, perímetros, composición, tensión,
 * adherencia y motivación).
 */
export function EvolucionNutricion({ programa, visitas }: EvolucionNutricionProps) {
  const resumen = useMemo(() => resumirEvolucion(visitas), [visitas]);
  const datos = useMemo(() => serieEvolucion(visitas), [visitas]);

  if (visitas.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="py-10 text-center text-muted-foreground">
          Registra la visita inicial para empezar a ver la evolución.
        </CardContent>
      </Card>
    );
  }

  const hitosVisibles = HITOS_PERDIDA.filter((h) => h <= Math.max(10, (resumen.porcentajePerdida ?? 0) + 5)).map((h) => ({
    valor: h,
    label: `${h} %`,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Indicador
          titulo="Peso actual"
          valor={resumen.pesoActual != null ? `${resumen.pesoActual} kg` : "—"}
          detalle={resumen.pesoInicial != null ? `Inicial: ${resumen.pesoInicial} kg · ${formatearDiferencia(resumen.diferenciaPeso, "kg")}` : undefined}
        />
        <Indicador
          titulo="Peso perdido"
          valor={resumen.porcentajePerdida != null ? `${resumen.porcentajePerdida.toLocaleString("es-ES")} %` : "—"}
          detalle={
            resumen.hitoAlcanzado
              ? `Hito del ${resumen.hitoAlcanzado} % superado`
              : `${resumen.semanasPrograma.toLocaleString("es-ES")} semanas de programa`
          }
        />
        <Indicador
          titulo="Cintura"
          valor={resumen.diferenciaCintura != null ? formatearDiferencia(resumen.diferenciaCintura, "cm") : "—"}
          detalle="Respecto a la visita inicial"
        />
        <Indicador
          titulo="Masa libre de grasa"
          valor={resumen.diferenciaMasaMagra != null ? formatearDiferencia(resumen.diferenciaMasaMagra, "kg") : "—"}
          detalle={
            resumen.proporcionMagraPerdida != null
              ? `${Math.round(resumen.proporcionMagraPerdida * 100)} % del peso perdido`
              : "Requiere bioimpedancia al inicio y ahora"
          }
        />
      </div>

      <Tabs defaultValue="peso" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="peso">Peso</TabsTrigger>
          <TabsTrigger value="porcentaje">% perdido</TabsTrigger>
          <TabsTrigger value="perimetros">Perímetros</TabsTrigger>
          <TabsTrigger value="composicion">Composición</TabsTrigger>
          <TabsTrigger value="tension">Tensión</TabsTrigger>
          <TabsTrigger value="adherencia">Adherencia</TabsTrigger>
        </TabsList>

        {[
          {
            valor: "peso",
            titulo: "Peso",
            grafico: (
              <GraficoLinea
                datos={datos}
                unidad="kg"
                series={[{ clave: "peso", label: "Peso", color: COLOR_1 }]}
                referencias={programa.pesoObjetivo ? [{ valor: programa.pesoObjetivo, label: "Objetivo" }] : []}
              />
            ),
          },
          {
            valor: "porcentaje",
            titulo: "Porcentaje de peso perdido respecto al inicio",
            grafico: (
              <GraficoLinea
                datos={datos}
                unidad="%"
                dominio={[0, "auto"]}
                series={[{ clave: "porcentajePerdida", label: "Peso perdido", color: COLOR_1 }]}
                referencias={hitosVisibles}
              />
            ),
          },
          {
            valor: "perimetros",
            titulo: "Perímetros de cintura y cadera",
            grafico: (
              <GraficoLinea
                datos={datos}
                unidad="cm"
                series={[
                  { clave: "cintura", label: "Cintura", color: COLOR_1 },
                  { clave: "cadera", label: "Cadera", color: COLOR_2 },
                ]}
              />
            ),
          },
          {
            valor: "composicion",
            titulo: "Composición corporal (bioimpedancia)",
            grafico: (
              <GraficoLinea
                datos={datos}
                unidad="kg"
                series={[
                  { clave: "masaGrasa", label: "Masa grasa", color: COLOR_1 },
                  { clave: "masaMagra", label: "Masa libre de grasa", color: COLOR_2 },
                ]}
              />
            ),
          },
          {
            valor: "tension",
            titulo: "Tensión arterial",
            grafico: (
              <GraficoLinea
                datos={datos}
                unidad="mmHg"
                series={[
                  { clave: "systolic", label: "Sistólica", color: COLOR_1 },
                  { clave: "diastolic", label: "Diastólica", color: COLOR_2 },
                ]}
              />
            ),
          },
          {
            valor: "adherencia",
            titulo: "Adherencia y motivación (0-10)",
            grafico: (
              <GraficoLinea
                datos={datos}
                unidad="/10"
                dominio={[0, 10]}
                series={[
                  { clave: "adherencia", label: "Adherencia", color: COLOR_1 },
                  { clave: "motivacion", label: "Motivación", color: COLOR_2 },
                ]}
              />
            ),
          },
        ].map((t) => (
          <TabsContent key={t.valor} value={t.valor}>
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">{t.titulo}</CardTitle>
              </CardHeader>
              <CardContent>{t.grafico}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
