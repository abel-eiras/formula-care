import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useMedicionesPaciente } from "@/hooks/usePacientes";
import { parsearFecha } from "@/lib/fechas";
import type { Medicion } from "@/types";
import { COLOR_1, COLOR_2, GraficoLinea } from "./GraficoLinea";

const ORIGEN: Record<Medicion["origen"], string> = {
  bio: "Bioquímica",
  nutricion: "Nutrición",
};

interface Punto extends Medicion {
  etiqueta: string;
}

/**
 * Evolución de todas las medidas del paciente (peso, IMC, perímetros,
 * composición corporal y tensión), vengan del servicio que vengan: la tabla
 * de mediciones es única, así que Bio y Nutrición comparten historial.
 */
export function EvolucionMediciones({ pacienteId }: { pacienteId: string }) {
  const { data: mediciones = [], isLoading } = useMedicionesPaciente(pacienteId);

  const datos = useMemo<Punto[]>(
    () =>
      mediciones.map((m) => ({
        ...m,
        etiqueta: parsearFecha(m.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" }),
      })),
    [mediciones]
  );

  if (isLoading) return <LoadingSpinner />;

  if (datos.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">Todavía no hay medidas registradas.</CardContent>
      </Card>
    );
  }

  const ultima = datos[datos.length - 1];
  const graficos = [
    {
      valor: "peso",
      titulo: "Peso",
      grafico: <GraficoLinea datos={datos} unidad="kg" series={[{ clave: "peso", label: "Peso", color: COLOR_1 }]} />,
    },
    {
      valor: "imc",
      titulo: "Índice de masa corporal",
      grafico: <GraficoLinea datos={datos} unidad="kg/m²" series={[{ clave: "imc", label: "IMC", color: COLOR_1 }]} />,
    },
    {
      valor: "perimetros",
      titulo: "Perímetros",
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
      titulo: "Composición corporal",
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
      valor: "pulsaciones",
      titulo: "Pulsaciones",
      grafico: <GraficoLinea datos={datos} unidad="lpm" series={[{ clave: "pulsaciones", label: "Pulsaciones", color: COLOR_1 }]} />,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {datos.length} mediciones de todos los servicios · última: {ultima.etiqueta} ({ORIGEN[ultima.origen]})
      </p>
      <Tabs defaultValue="peso" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {graficos.map((g) => (
            <TabsTrigger key={g.valor} value={g.valor}>
              {g.titulo}
            </TabsTrigger>
          ))}
        </TabsList>
        {graficos.map((g) => (
          <TabsContent key={g.valor} value={g.valor}>
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">{g.titulo}</CardTitle>
              </CardHeader>
              <CardContent>{g.grafico}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
