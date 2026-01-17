import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, FlaskConical, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ParameterConfig {
  id: string;
  label: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  placeholder: string;
}

const parameters: ParameterConfig[] = [
  { id: "glucose", label: "Glucosa", unit: "mg/dL", normalMin: 70, normalMax: 100, placeholder: "70-100" },
  { id: "cholesterol", label: "Colesterol Total", unit: "mg/dL", normalMin: 0, normalMax: 200, placeholder: "<200" },
  { id: "triglycerides", label: "Triglicéridos", unit: "mg/dL", normalMin: 0, normalMax: 150, placeholder: "<150" },
  { id: "systolic", label: "Tensión Sistólica", unit: "mmHg", normalMin: 90, normalMax: 120, placeholder: "90-120" },
  { id: "diastolic", label: "Tensión Diastólica", unit: "mmHg", normalMin: 60, normalMax: 80, placeholder: "60-80" },
];

type Status = "normal" | "high" | "low" | null;

const getStatus = (value: string, config: ParameterConfig): Status => {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (num < config.normalMin) return "low";
  if (num > config.normalMax) return "high";
  return "normal";
};

const StatusBadge = ({ status }: { status: Status }) => {
  if (!status) return null;
  
  return (
    <Badge
      className={cn(
        "gap-1",
        status === "normal" && "bg-success-soft text-success border-success/20",
        status === "high" && "bg-destructive-soft text-destructive border-destructive/20",
        status === "low" && "bg-warning-soft text-warning border-warning/20"
      )}
    >
      {status === "normal" ? (
        <>
          <CheckCircle className="h-3 w-3" />
          Normal
        </>
      ) : status === "high" ? (
        <>
          <AlertTriangle className="h-3 w-3" />
          Alto
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" />
          Bajo
        </>
      )}
    </Badge>
  );
};

export default function ServicioBio() {
  const [values, setValues] = useState<Record<string, string>>({
    glucose: "",
    cholesterol: "",
    triglycerides: "",
    systolic: "",
    diastolic: "",
    weight: "",
    height: "",
  });

  const handleChange = (id: string, value: string) => {
    setValues(prev => ({ ...prev, [id]: value }));
  };

  const imc = useMemo(() => {
    const weight = parseFloat(values.weight);
    const height = parseFloat(values.height);
    if (!weight || !height || height === 0) return null;
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  }, [values.weight, values.height]);

  const imcStatus = useMemo(() => {
    if (!imc) return null;
    const value = parseFloat(imc);
    if (value < 18.5) return "low";
    if (value > 25) return "high";
    return "normal";
  }, [imc]);

  const imcLabel = useMemo(() => {
    if (!imc) return null;
    const value = parseFloat(imc);
    if (value < 18.5) return "Bajo peso";
    if (value < 25) return "Normal";
    if (value < 30) return "Sobrepeso";
    return "Obesidad";
  }, [imc]);

  const handleSave = () => {
    toast.success("Análisis bioquímico guardado correctamente");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="gap-2 -ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-secondary" />
              Parámetros Bioquímicos
            </h1>
            <p className="text-muted-foreground">Análisis inteligente de salud</p>
          </div>
        </div>
        <Button size="lg" onClick={handleSave} className="shadow-md gap-2">
          <Save className="h-5 w-5" />
          Guardar Análisis
        </Button>
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Parameters */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary/10">
                <FlaskConical className="h-5 w-5 text-secondary" />
              </div>
              Parámetros Sanguíneos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {parameters.map((param) => {
              const status = getStatus(values[param.id], param);
              return (
                <div key={param.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={param.id}>{param.label}</Label>
                    <StatusBadge status={status} />
                  </div>
                  <div className="relative">
                    <Input
                      id={param.id}
                      type="number"
                      placeholder={param.placeholder}
                      value={values[param.id]}
                      onChange={(e) => handleChange(param.id, e.target.value)}
                      className={cn(
                        "pr-16 transition-colors",
                        status === "high" && "border-destructive focus-visible:ring-destructive",
                        status === "low" && "border-warning focus-visible:ring-warning",
                        status === "normal" && "border-success focus-visible:ring-success"
                      )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {param.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Body Metrics */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Medidas Corporales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso</Label>
                  <div className="relative">
                    <Input
                      id="weight"
                      type="number"
                      placeholder="Ej: 70"
                      value={values.weight}
                      onChange={(e) => handleChange("weight", e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Altura</Label>
                  <div className="relative">
                    <Input
                      id="height"
                      type="number"
                      placeholder="Ej: 170"
                      value={values.height}
                      onChange={(e) => handleChange("height", e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">cm</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IMC Card */}
          <Card className={cn(
            "shadow-sm border-border/50 transition-all duration-300",
            imc && "ring-2",
            imcStatus === "normal" && "ring-success/50",
            imcStatus === "high" && "ring-destructive/50",
            imcStatus === "low" && "ring-warning/50"
          )}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Índice de Masa Corporal (IMC)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-foreground">
                    {imc ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {imc ? "kg/m²" : "Introduce peso y altura"}
                  </p>
                </div>
                {imc && (
                  <Badge
                    className={cn(
                      "text-lg px-4 py-2",
                      imcStatus === "normal" && "bg-success text-success-foreground",
                      imcStatus === "high" && "bg-destructive text-destructive-foreground",
                      imcStatus === "low" && "bg-warning text-warning-foreground"
                    )}
                  >
                    {imcLabel}
                  </Badge>
                )}
              </div>
              {imc && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="flex-1 bg-warning/60" />
                      <div className="flex-1 bg-success" />
                      <div className="flex-1 bg-warning" />
                      <div className="flex-1 bg-destructive" />
                    </div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 w-1 bg-foreground rounded-full shadow-md transition-all duration-300"
                      style={{
                        left: `${Math.min(Math.max((parseFloat(imc) - 15) / 25 * 100, 0), 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>15</span>
                    <span>18.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>40</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
