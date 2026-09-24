import { memo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Gráfico de líneas de evolución compartido (mediciones del paciente y
 * programa de nutrición).
 */

// Dos colores fijos (identidad de serie) coherentes con los gráficos de Bio.
// Nunca más de dos series por gráfico y sin doble eje: cada magnitud en su gráfico.
export const COLOR_1 = "hsl(var(--primary))";
export const COLOR_2 = "hsl(var(--secondary))";

interface Serie<T> {
  clave: keyof T & string;
  label: string;
  color: string;
}

interface GraficoProps<T> {
  /** Puntos de la serie; cada uno necesita una etiqueta para el eje X */
  datos: T[];
  series: Serie<T>[];
  unidad: string;
  dominio?: [number | "auto", number | "auto"];
  /** Líneas de referencia horizontales (objetivo, hitos...) */
  referencias?: { valor: number; label: string }[];
}

function GraficoLineaBase<T extends { etiqueta: string }>({ datos, series, unidad, dominio, referencias = [] }: GraficoProps<T>) {
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
}

export const GraficoLinea = memo(GraficoLineaBase) as typeof GraficoLineaBase;
