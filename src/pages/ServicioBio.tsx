import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Printer, FlaskConical } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePacientes } from "@/hooks/usePacientes";
import { useCrearAnalisisBio, useAnalisisBio, useActualizarAnalisisBio } from "@/hooks/useAnalisisBio";
import type { AnalisisBio } from "@/types";

export default function ServicioBio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analisisId = searchParams.get("id");
  const pacienteIdParam = searchParams.get("pacienteId");

  const { data: pacientes = [] } = usePacientes();
  const { data: analisisExistente } = useAnalisisBio(analisisId || undefined);
  const crearAnalisis = useCrearAnalisisBio();
  const actualizarAnalisis = useActualizarAnalisisBio();

  // Estado del formulario
  const [pacienteId, setPacienteId] = useState<string>(pacienteIdParam || "");
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    // Parámetros básicos
    glucemia: "",
    cholesterol: "",
    cholesterolHDL: "",
    cholesterolLDL: "",
    triglycerides: "",
    // Parámetros avanzados
    hemoglobinaGlucosilada: "",
    proteinaCReactiva: "",
    vitaminaD: "",
    ferritina: "",
    // Tensión arterial y pulsaciones
    systolic: "",
    diastolic: "",
    pulsaciones: "",
    // Medidas corporales
    weight: "",
    height: "",
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
      };

      if (analisisId) {
        await actualizarAnalisis.mutateAsync({ id: analisisId, ...datosAnalisis });
        toast.success("Análisis actualizado correctamente");
      } else {
        const nuevoAnalisis = await crearAnalisis.mutateAsync(datosAnalisis);
        toast.success("Análisis guardado correctamente");
        // Abrir vista de impresión automáticamente después de crear
        if (nuevoAnalisis?.id) {
          setTimeout(() => {
            window.open(`/servicios/bio/print?id=${nuevoAnalisis.id}`, "_blank");
          }, 500);
        }
      }

      navigate(`/pacientes/${pacienteId}`);
    } catch (error) {
      console.error("Error al guardar análisis:", error);
      toast.error("Error al guardar el análisis");
    }
  };

  const handleImprimir = () => {
    if (!analisisId) {
      toast.info("Guarde el análisis primero para imprimir");
      return;
    }
    
    // Abrir vista de impresión en nueva pestaña
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
              Análisis Bioquímico
            </h1>
            <p className="text-muted-foreground">Parámetros de salud</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImprimir} className="gap-2" disabled={isLoading || !analisisId}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button size="lg" onClick={handleSubmit} className="shadow-md gap-2" disabled={isLoading}>
            <Save className="h-5 w-5" />
            {isLoading ? "Guardando..." : analisisId ? "Actualizar" : "Guardar Análisis"}
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
          {/* Bloque 1: Parámetros Básicos */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-primary">Parámetros Básicos</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="glucemia">Glucemia (mg/dL)</Label>
                  <Input
                    id="glucemia"
                    type="number"
                    placeholder="70-100"
                    value={formData.glucemia}
                    onChange={(e) => handleChange("glucemia", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cholesterol">Colesterol Total (mg/dL)</Label>
                  <Input
                    id="cholesterol"
                    type="number"
                    placeholder="<200"
                    value={formData.cholesterol}
                    onChange={(e) => handleChange("cholesterol", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cholesterolHDL">Colesterol HDL (mg/dL)</Label>
                  <Input
                    id="cholesterolHDL"
                    type="number"
                    placeholder=">40 (hombres), >50 (mujeres)"
                    value={formData.cholesterolHDL}
                    onChange={(e) => handleChange("cholesterolHDL", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cholesterolLDL">Colesterol LDL (mg/dL)</Label>
                  <Input
                    id="cholesterolLDL"
                    type="number"
                    placeholder="<100"
                    value={formData.cholesterolLDL}
                    onChange={(e) => handleChange("cholesterolLDL", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triglycerides">Triglicéridos (mg/dL)</Label>
                  <Input
                    id="triglycerides"
                    type="number"
                    placeholder="<150"
                    value={formData.triglycerides}
                    onChange={(e) => handleChange("triglycerides", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloque 2: Parámetros Avanzados */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-secondary">Parámetros Avanzados</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hemoglobinaGlucosilada">Hemoglobina Glucosilada - HbA1c (%)</Label>
                  <Input
                    id="hemoglobinaGlucosilada"
                    type="number"
                    step="0.1"
                    placeholder="<5.7"
                    value={formData.hemoglobinaGlucosilada}
                    onChange={(e) => handleChange("hemoglobinaGlucosilada", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proteinaCReactiva">Proteína C Reactiva - PCR (mg/L)</Label>
                  <Input
                    id="proteinaCReactiva"
                    type="number"
                    step="0.1"
                    placeholder="<3"
                    value={formData.proteinaCReactiva}
                    onChange={(e) => handleChange("proteinaCReactiva", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vitaminaD">Vitamina D (ng/mL)</Label>
                  <Input
                    id="vitaminaD"
                    type="number"
                    step="0.1"
                    placeholder="30-100"
                    value={formData.vitaminaD}
                    onChange={(e) => handleChange("vitaminaD", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ferritina">Ferritina (ng/mL)</Label>
                  <Input
                    id="ferritina"
                    type="number"
                    placeholder="15-200 (hombres), 15-150 (mujeres)"
                    value={formData.ferritina}
                    onChange={(e) => handleChange("ferritina", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
          {/* Bloque 3: Tensión Arterial y Pulsaciones */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-destructive">Tensión Arterial y Pulsaciones</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="systolic">Sistólica (mmHg)</Label>
                    <Input
                      id="systolic"
                      type="number"
                      placeholder="90-120"
                      value={formData.systolic}
                      onChange={(e) => handleChange("systolic", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diastolic">Diastólica (mmHg)</Label>
                    <Input
                      id="diastolic"
                      type="number"
                      placeholder="60-80"
                      value={formData.diastolic}
                      onChange={(e) => handleChange("diastolic", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulsaciones">Pulsaciones (lpm)</Label>
                  <Input
                    id="pulsaciones"
                    type="number"
                    placeholder="60-100"
                    value={formData.pulsaciones}
                    onChange={(e) => handleChange("pulsaciones", e.target.value)}
                  />
                </div>
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
                        <Label className="text-sm font-semibold">Índice de Masa Corporal (IMC)</Label>
                        <p className="text-2xl font-bold text-primary mt-1">{imc} kg/m²</p>
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
                <Label htmlFor="fecha">Fecha del Análisis</Label>
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
    </div>
  );
}
