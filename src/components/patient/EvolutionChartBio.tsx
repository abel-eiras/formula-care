import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAnalisisBioPorPaciente } from "@/hooks/useAnalisisBio";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EvolutionChartBioProps {
  pacienteId: string;
}

export function EvolutionChartBio({ pacienteId }: EvolutionChartBioProps) {
  const { data: analisis = [], isLoading } = useAnalisisBioPorPaciente(pacienteId);

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analisis.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay análisis bioquímicos para mostrar evolución</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para gráficos
  const datosEvolucion = analisis
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((a) => ({
      fecha: new Date(a.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      fechaCompleta: a.fecha,
      glucemia: a.glucemia || null,
      cholesterol: a.cholesterol || null,
      cholesterolHDL: a.cholesterolHDL || null,
      cholesterolLDL: a.cholesterolLDL || null,
      triglycerides: a.triglycerides || null,
      hemoglobinaGlucosilada: a.hemoglobinaGlucosilada || null,
      proteinaCReactiva: a.proteinaCReactiva || null,
      vitaminaD: a.vitaminaD || null,
      ferritina: a.ferritina || null,
    }));

  // Parámetros básicos
  const parametrosBasicos = [
    { key: "glucemia", label: "Glucemia", unit: "mg/dL", color: "hsl(var(--primary))" },
    { key: "cholesterol", label: "Colesterol Total", unit: "mg/dL", color: "hsl(var(--secondary))" },
    { key: "cholesterolHDL", label: "Colesterol HDL", unit: "mg/dL", color: "#10b981" },
    { key: "cholesterolLDL", label: "Colesterol LDL", unit: "mg/dL", color: "#f59e0b" },
    { key: "triglycerides", label: "Triglicéridos", unit: "mg/dL", color: "#ef4444" },
  ];

  // Parámetros avanzados
  const parametrosAvanzados = [
    { key: "hemoglobinaGlucosilada", label: "HbA1c", unit: "%", color: "hsl(var(--primary))" },
    { key: "proteinaCReactiva", label: "PCR", unit: "mg/L", color: "hsl(var(--secondary))" },
    { key: "vitaminaD", label: "Vitamina D", unit: "ng/mL", color: "#10b981" },
    { key: "ferritina", label: "Ferritina", unit: "ng/mL", color: "#f59e0b" },
  ];

  const renderChart = (parametros: typeof parametrosBasicos, titulo: string) => {
    // Filtrar parámetros que tienen datos
    const parametrosConDatos = parametros.filter((param) =>
      datosEvolucion.some((d) => d[param.key as keyof typeof datosEvolucion[0]] !== null)
    );

    if (parametrosConDatos.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No hay datos disponibles para {titulo}</p>
        </div>
      );
    }

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datosEvolucion} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="fecha" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Legend />
            {parametrosConDatos.map((param, index) => (
              <Line
                key={param.key}
                type="monotone"
                dataKey={param.key}
                name={`${param.label} (${param.unit})`}
                stroke={param.color}
                strokeWidth={2}
                dot={{ fill: param.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Tabs defaultValue="basicos" className="space-y-6">
      <TabsList>
        <TabsTrigger value="basicos">Parámetros Básicos</TabsTrigger>
        <TabsTrigger value="avanzados">Parámetros Avanzados</TabsTrigger>
      </TabsList>

      <TabsContent value="basicos">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Evolución de Parámetros Básicos</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChart(parametrosBasicos, "parámetros básicos")}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="avanzados">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Evolución de Parámetros Avanzados</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChart(parametrosAvanzados, "parámetros avanzados")}
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}
