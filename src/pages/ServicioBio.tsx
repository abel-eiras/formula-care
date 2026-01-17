import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Printer, FlaskConical, AlertTriangle, CheckCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePacientes } from "@/hooks/usePacientes";
import { useCrearAnalisisBio, useAnalisisBio, useActualizarAnalisisBio } from "@/hooks/useAnalisisBio";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { evaluarValor, getMensajeValoracion } from "@/lib/valoracionBio";
import { cn } from "@/lib/utils";
import type { AnalisisBio, ParametroReferencia } from "@/types";

// Componente para mostrar badge de valoraci?n
function ValoracionBadge({
  valor,
  parametroId,
  referencia,
}: {
  valor: number;
  parametroId: string;
  referencia?: Record<string, ParametroReferencia>;
}) {
  const estado = evaluarValor(valor, referencia?.[parametroId]);
  const mensaje = getMensajeValoracion(estado);

  if (!estado) return null;

  return (
    <Badge
      className={cn(
        "gap-1 text-xs",
        estado === "normal" && "bg-success-soft text-success border-success/20",
        estado === "advertencia" && "bg-warning-soft text-warning border-warning/20",
        estado === "critico" && "bg-destructive-soft text-destructive border-destructive/20"
      )}
    >
      {estado === "normal" ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {mensaje}
    </Badge>
  );
}

// Funci?n para obtener clase CSS del input seg?n valoraci?n
function getInputClass(estado: "normal" | "advertencia" | "critico" | null): string {
  if (!estado) return "";
  switch (estado) {
    case "normal":
      return "border-success focus-visible:ring-success";
    case "advertencia":
      return "border-warning focus-visible:ring-warning";
    case "critico":
      return "border-destructive focus-visible:ring-destructive";
    default:
      return "";
  }
}

// Funci?n para crear campo de par?metro con valoraci?n
function ParametroInput({
  id,
  label,
  unit,
  value,
  onChange,
  configuracion,
  parametroId,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  configuracion?: { valoracionBioActiva: boolean; parametrosReferencia?: Record<string, ParametroReferencia> };
  parametroId: string;
}) {
  const numValue = value ? parseFloat(value) : undefined;
  const estado = configuracion?.valoracionBioActiva
    ? evaluarValor(numValue, configuracion.parametrosReferencia?.[parametroId])
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label} ({unit})</Label>
        {configuracion?.valoracionBioActiva && numValue !== undefined && (
          <ValoracionBadge valor={numValue} parametroId={parametroId} referencia={configuracion.parametrosReferencia} />
        )}
      </div>
      <Input
        id={id}
        type="number"
        step={parametroId === "hemoglobinaGlucosilada" || parametroId === "proteinaCReactiva" || parametroId === "vitaminaD" ? "0.1" : "1"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(estado && getInputClass(estado))}
      />
    </div>
  );
}

export default function ServicioBio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analisisId = searchParams.get("id");
  const pacienteIdParam = searchParams.get("pacienteId");

  const { data: pacientes = [] } = usePacientes();
  const { data: analisisExistente } = useAnalisisBio(analisisId || undefined);
  const { data: configuracion } = useConfiguracion();
  const crearAnalisis = useCrearAnalisisBio();
  const actualizarAnalisis = useActualizarAnalisisBio();

  // Estado del formulario
  const [pacienteId, setPacienteId] = useState<string>(pacienteIdParam || "");
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    // Par?metros b?sicos
    glucemia: "",
    cholesterol: "",
    cholesterolHDL: "",
    cholesterolLDL: "",
    triglycerides: "",
    // Par?metros avanzados
    hemoglobinaGlucosilada: "",
    proteinaCReactiva: "",
    vitaminaD: "",
    ferritina: "",
    // Tensi?n arterial y pulsaciones
    systolic: "",
    diastolic: "",
    pulsaciones: "",
    // Medidas corporales
    weight: "",
    height: "",
    // Observaciones y recomendaciones
    observaciones: "",
    recomendaciones: "",
  });

  // Cargar datos existentes si estamos editando
  useEffect(() => {
    if (analisisExistente) {
      setPacienteId(analisisExistente.pacienteId);
      setFormData({
        fecha: analisisExistente.fecha.split("T")[0] || new Date().toISOString().split("T")[0],
        glucemia: analisisExistente.glucemia?.toString() || analisisExistente.glucose?.toString() || "",
        cholesterol: analisisExistente.cholesterol?.toString() || "",
        cholesterolHDL: analisisExistente.cholesterolHDL?.toString() || "",
        cholesterolLDL: analisisExistente.cholesterolLDL?.toString() || "",
        triglycerides: analisisExistente.triglycerides?.toString() || "",
        hemoglobinaGlucosilada: analisisExistente.hemoglobinaGlucosilada?.toString() || "",
        proteinaCReactiva: analisisExistente.proteinaCReactiva?.toString() || "",
        vitaminaD: analisisExistente.vitaminaD?.toString() || "",
        ferritina: analisisExistente.ferritina?.toString() || "",
        systolic: analisisExistente.systolic?.toString() || "",
        diastolic: analisisExistente.diastolic?.toString() || "",
        pulsaciones: analisisExistente.pulsaciones?.toString() || "",
        weight: analisisExistente.weight?.toString() || "",
        height: analisisExistente.height?.toString() || "",
        observaciones: analisisExistente.observaciones || "",
        recomendaciones: analisisExistente.recomendaciones || "",
      });
    }
  }, [analisisExistente]);

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((p) => p.id === pacienteId),
    [pacientes, pacienteId]
  );

  // Calcular IMC
  const imc = useMemo(() => {
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);
    if (!weight || !height || height === 0) return null;
    const heightM = height / 100;
    return Number((weight / (heightM * heightM)).toFixed(1));
  }, [formData.weight, formData.height]);

  // Evaluar IMC si est? activa la valoraci?n
  const estadoIMC = useMemo(() => {
    if (!configuracion?.valoracionBioActiva || !imc) return null;
    return evaluarValor(imc, configuracion.parametrosReferencia?.imc);
  }, [imc, configuracion]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!pacienteId) {
      toast.error("Debe seleccionar un paciente");
      return;
    }

    try {
      const datosAnalisis: Omit<AnalisisBio, "id" | "createdAt" | "updatedAt" | "paciente" | "imc"> = {
        pacienteId,
        fecha: new Date(formData.fecha).toISOString(),
        glucemia: formData.glucemia ? parseFloat(formData.glucemia) : undefined,
        cholesterol: formData.cholesterol ? parseFloat(formData.cholesterol) : undefined,
        cholesterolHDL: formData.cholesterolHDL ? parseFloat(formData.cholesterolHDL) : undefined,
        cholesterolLDL: formData.cholesterolLDL ? parseFloat(formData.cholesterolLDL) : undefined,
        triglycerides: formData.triglycerides ? parseFloat(formData.triglycerides) : undefined,
        hemoglobinaGlucosilada: formData.hemoglobinaGlucosilada ? parseFloat(formData.hemoglobinaGlucosilada) : undefined,
        proteinaCReactiva: formData.proteinaCReactiva ? parseFloat(formData.proteinaCReactiva) : undefined,
        vitaminaD: formData.vitaminaD ? parseFloat(formData.vitaminaD) : undefined,
        ferritina: formData.ferritina ? parseFloat(formData.ferritina) : undefined,
        systolic: formData.systolic ? parseInt(formData.systolic) : undefined,
        diastolic: formData.diastolic ? parseInt(formData.diastolic) : undefined,
        pulsaciones: formData.pulsaciones ? parseInt(formData.pulsaciones) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        observaciones: formData.observaciones || undefined,
        recomendaciones: formData.recomendaciones || undefined,
      };

      if (analisisId) {
        await actualizarAnalisis.mutateAsync({ id: analisisId, ...datosAnalisis });
        toast.success("An?lisis actualizado correctamente");
      } else {
        const nuevoAnalisis = await crearAnalisis.mutateAsync(datosAnalisis);
        toast.success("An?lisis guardado correctamente");
        // Abrir vista de impresi?n autom?ticamente despu?s de crear
        if (nuevoAnalisis?.id) {
          setTimeout(() => {
            window.open(`/servicios/bio/print?id=${nuevoAnalisis.id}`, "_blank");
          }, 500);
        }
      }

      navigate(`/pacientes/${pacienteId}`);
    } catch (error) {
      console.error("Error al guardar an?lisis:", error);
      toast.error("Error al guardar el an?lisis");
    }
  };

  const handleImprimir = () => {
    if (!analisisId) {
      toast.info("Guarde el an?lisis primero para imprimir");
      return;
    }
    
    // Abrir vista de impresi?n en nueva pesta?a
    window.open(`/servicios/bio/print?id=${analisisId}`, "_blank");
  };

  const isLoading = crearAnalisis.isPending || actualizarAnalisis.isPending;

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
              <FlaskConical className="h-6 w-6 text-primary" />
              An?lisis Bioqu?mico
            </h1>
            <p className="text-muted-foreground">Par?metros de salud</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImprimir} className="gap-2" disabled={isLoading || !analisisId}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button size="lg" onClick={handleSubmit} className="shadow-md gap-2" disabled={isLoading}>
            <Save className="h-5 w-5" />
            {isLoading ? "Guardando..." : analisisId ? "Actualizar" : "Guardar An?lisis"}
          </Button>
        </div>
      </div>

      {/* Selector de Paciente */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="paciente">Paciente *</Label>
            <Select value={pacienteId} onValueChange={setPacienteId} disabled={!!analisisId}>
              <SelectTrigger id="paciente">
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {pacientes.map((paciente) => (
                  <SelectItem key={paciente.id} value={paciente.id}>
                    {paciente.name} - {paciente.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pacienteSeleccionado && (
              <p className="text-sm text-muted-foreground">
                {pacienteSeleccionado.email && `Email: ${pacienteSeleccionado.email}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda */}
        <div className="space-y-6">
          {/* Bloque 1: Par?metros B?sicos */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-primary">Par?metros B?sicos</h3>
              <div className="space-y-4">
                <ParametroInput
                  id="glucemia"
                  label="Glucemia"
                  unit="mg/dL"
                  value={formData.glucemia}
                  onChange={(value) => handleChange("glucemia", value)}
                  configuracion={configuracion}
                  parametroId="glucemia"
                />
                <ParametroInput
                  id="cholesterol"
                  label="Colesterol Total"
                  unit="mg/dL"
                  value={formData.cholesterol}
                  onChange={(value) => handleChange("cholesterol", value)}
                  configuracion={configuracion}
                  parametroId="cholesterol"
                />
                <ParametroInput
                  id="cholesterolHDL"
                  label="Colesterol HDL"
                  unit="mg/dL"
                  value={formData.cholesterolHDL}
                  onChange={(value) => handleChange("cholesterolHDL", value)}
                  configuracion={configuracion}
                  parametroId="cholesterolHDL"
                />
                <ParametroInput
                  id="cholesterolLDL"
                  label="Colesterol LDL"
                  unit="mg/dL"
                  value={formData.cholesterolLDL}
                  onChange={(value) => handleChange("cholesterolLDL", value)}
                  configuracion={configuracion}
                  parametroId="cholesterolLDL"
                />
                <ParametroInput
                  id="triglycerides"
                  label="Triglic?ridos"
                  unit="mg/dL"
                  value={formData.triglycerides}
                  onChange={(value) => handleChange("triglycerides", value)}
                  configuracion={configuracion}
                  parametroId="triglycerides"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bloque 2: Par?metros Avanzados */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-secondary">Par?metros Avanzados</h3>
              <div className="space-y-4">
                <ParametroInput
                  id="hemoglobinaGlucosilada"
                  label="Hemoglobina Glucosilada - HbA1c"
                  unit="%"
                  value={formData.hemoglobinaGlucosilada}
                  onChange={(value) => handleChange("hemoglobinaGlucosilada", value)}
                  configuracion={configuracion}
                  parametroId="hemoglobinaGlucosilada"
                />
                <ParametroInput
                  id="proteinaCReactiva"
                  label="Prote?na C Reactiva - PCR"
                  unit="mg/L"
                  value={formData.proteinaCReactiva}
                  onChange={(value) => handleChange("proteinaCReactiva", value)}
                  configuracion={configuracion}
                  parametroId="proteinaCReactiva"
                />
                <ParametroInput
                  id="vitaminaD"
                  label="Vitamina D"
                  unit="ng/mL"
                  value={formData.vitaminaD}
                  onChange={(value) => handleChange("vitaminaD", value)}
                  configuracion={configuracion}
                  parametroId="vitaminaD"
                />
                <ParametroInput
                  id="ferritina"
                  label="Ferritina"
                  unit="ng/mL"
                  value={formData.ferritina}
                  onChange={(value) => handleChange("ferritina", value)}
                  configuracion={configuracion}
                  parametroId="ferritina"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
          {/* Bloque 3: Tensi?n Arterial y Pulsaciones */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-destructive">Tensi?n Arterial y Pulsaciones</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ParametroInput
                    id="systolic"
                    label="Sist?lica"
                    unit="mmHg"
                    value={formData.systolic}
                    onChange={(value) => handleChange("systolic", value)}
                    configuracion={configuracion}
                    parametroId="systolic"
                  />
                  <ParametroInput
                    id="diastolic"
                    label="Diast?lica"
                    unit="mmHg"
                    value={formData.diastolic}
                    onChange={(value) => handleChange("diastolic", value)}
                    configuracion={configuracion}
                    parametroId="diastolic"
                  />
                </div>
                <ParametroInput
                  id="pulsaciones"
                  label="Pulsaciones"
                  unit="lpm"
                  value={formData.pulsaciones}
                  onChange={(value) => handleChange("pulsaciones", value)}
                  configuracion={configuracion}
                  parametroId="pulsaciones"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bloque 4: Medidas Corporales */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-success">Medidas Corporales</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="Ej: 70"
                      value={formData.weight}
                      onChange={(e) => handleChange("weight", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="Ej: 170"
                      value={formData.height}
                      onChange={(e) => handleChange("height", e.target.value)}
                    />
                  </div>
                </div>
                {imc !== null && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">?ndice de Masa Corporal (IMC)</Label>
                          {configuracion?.valoracionBioActiva && estadoIMC && (
                            <ValoracionBadge
                              valor={imc}
                              parametroId="imc"
                              referencia={configuracion.parametrosReferencia}
                            />
                          )}
                        </div>
                        <p className={cn(
                          "text-2xl font-bold mt-1",
                          estadoIMC === "normal" && "text-success",
                          estadoIMC === "advertencia" && "text-warning",
                          estadoIMC === "critico" && "text-destructive"
                        )}>
                          {imc} kg/m?
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {imc < 18.5
                            ? "Bajo peso"
                            : imc < 25
                            ? "Normal"
                            : imc < 30
                            ? "Sobrepeso"
                            : "Obesidad"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fecha */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha del An?lisis</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleChange("fecha", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Observaciones y Recomendaciones */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 text-primary">Observaciones y Recomendaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Anotaciones sobre el análisis..."
                value={formData.observaciones}
                onChange={(e) => handleChange("observaciones", e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recomendaciones">Recomendaciones</Label>
              <Textarea
                id="recomendaciones"
                placeholder="Recomendaciones para el paciente..."
                value={formData.recomendaciones}
                onChange={(e) => handleChange("recomendaciones", e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
