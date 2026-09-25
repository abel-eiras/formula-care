import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Printer, FlaskConical, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePacientes } from "@/hooks/usePacientes";
import { useCrearAnalisisBio, useAnalisisBio, useActualizarAnalisisBio } from "@/hooks/useAnalisisBio";
import { DialogoNuevoPaciente } from "@/components/pacientes/DialogoNuevoPaciente";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { evaluarValor, getMensajeValoracion } from "@/lib/valoracionBio";
import { cn } from "@/lib/utils";
import type { AnalisisBio, ParametroReferencia, ParametroBioConfig } from "@/types";
import { imprimirRuta } from "@/lib/imprimir";
import { BotonesInforme } from "@/components/informes/BotonesInforme";
import { nombreInforme } from "@/lib/informePdf";
// Parámetros por defecto (usados si no hay configuración guardada)
const PARAMETROS_DEFAULT: ParametroBioConfig[] = [
  // Básicos: glucemia y tensión arterial
  { id: "glucemia", label: "Glucemia", unit: "mg/dL", grupo: "basicos", activo: true, orden: 1 },
  { id: "systolic", label: "Tensión Sistólica", unit: "mmHg", grupo: "basicos", activo: true, orden: 2 },
  { id: "diastolic", label: "Tensión Diastólica", unit: "mmHg", grupo: "basicos", activo: true, orden: 3 },
  { id: "pulsaciones", label: "Pulsaciones", unit: "lpm", grupo: "basicos", activo: true, orden: 4 },
  // Avanzados: colesterol y otros parámetros de sangre
  { id: "cholesterol", label: "Colesterol Total", unit: "mg/dL", grupo: "avanzados", activo: true, orden: 1 },
  { id: "cholesterolHDL", label: "Colesterol HDL", unit: "mg/dL", grupo: "avanzados", activo: true, orden: 2 },
  { id: "cholesterolLDL", label: "Colesterol LDL", unit: "mg/dL", grupo: "avanzados", activo: true, orden: 3 },
  { id: "triglycerides", label: "Triglicéridos", unit: "mg/dL", grupo: "avanzados", activo: true, orden: 4 },
  { id: "hemoglobinaGlucosilada", label: "Hemoglobina Glucosilada (HbA1c)", unit: "%", grupo: "avanzados", activo: true, orden: 5 },
  { id: "proteinaCReactiva", label: "Proteína C Reactiva (PCR)", unit: "mg/L", grupo: "avanzados", activo: true, orden: 6 },
  { id: "vitaminaD", label: "Vitamina D", unit: "ng/mL", grupo: "avanzados", activo: true, orden: 7 },
  { id: "ferritina", label: "Ferritina", unit: "ng/mL", grupo: "avanzados", activo: true, orden: 8 },
  // Medidas corporales
  { id: "peso", label: "Peso", unit: "kg", grupo: "corporales", activo: true, orden: 1 },
  { id: "altura", label: "Altura", unit: "cm", grupo: "corporales", activo: true, orden: 2 },
  { id: "cintura", label: "Perímetro Abdominal", unit: "cm", grupo: "corporales", activo: true, orden: 3 },
  { id: "imc", label: "IMC", unit: "kg/m²", grupo: "corporales", activo: true, orden: 4 },
];

// Componente para mostrar badge de valoración
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

// Función para obtener clase CSS del input según valoración
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

// Función para crear campo de parámetro con valoración
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
  
  // Necesitamos el paciente para el nombre del archivo
  const paciente = analisisExistente?.pacienteId
    ? pacientes.find((p) => p.id === analisisExistente.pacienteId)
    : null;
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
    peso: "",
    altura: "",
    cintura: "",
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
        glucemia: analisisExistente.glucemia?.toString() || "",
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
        peso: analisisExistente.peso?.toString() || "",
        altura: analisisExistente.altura?.toString() || "",
        cintura: analisisExistente.cintura?.toString() || "",
        observaciones: analisisExistente.observaciones || "",
        recomendaciones: analisisExistente.recomendaciones || "",
      });
    }
  }, [analisisExistente]);

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((p) => p.id === pacienteId),
    [pacientes, pacienteId]
  );

  // Obtener parámetros configurados (activos y ordenados)
  const parametrosBioConfig = useMemo(() => {
    if (configuracion?.parametrosBioConfig && configuracion.parametrosBioConfig.length > 0) {
      return configuracion.parametrosBioConfig;
    }
    return PARAMETROS_DEFAULT;
  }, [configuracion]);

  // Helper para verificar si un parámetro está activo
  const isParametroActivo = useCallback((parametroId: string): boolean => {
    const param = parametrosBioConfig.find(p => p.id === parametroId);
    return param?.activo ?? true;
  }, [parametrosBioConfig]);

  // Obtener parámetros activos por grupo
  const getParametrosGrupo = useCallback((grupo: string): ParametroBioConfig[] => {
    return parametrosBioConfig
      .filter(p => p.grupo === grupo && p.activo)
      .sort((a, b) => a.orden - b.orden);
  }, [parametrosBioConfig]);

  // Calcular IMC
  const imc = useMemo(() => {
    const peso = parseFloat(formData.peso);
    const altura = parseFloat(formData.altura);
    if (!peso || !altura) return null;
    const alturaM = altura / 100;
    return Number((peso / (alturaM * alturaM)).toFixed(1));
  }, [formData.peso, formData.altura]);

  // Evaluar IMC si está activa la valoración
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
      // Medidas y tensión van a la tabla única de mediciones: vacío = null para
      // que al editar se pueda borrar un valor
      const medida = (valor: string, entero = false) =>
        valor ? (entero ? parseInt(valor) : parseFloat(valor)) : null;
      const datosAnalisis: Omit<AnalisisBio, "id" | "createdAt" | "updatedAt" | "paciente" | "imc" | "icc"> = {
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
        systolic: medida(formData.systolic, true),
        diastolic: medida(formData.diastolic, true),
        pulsaciones: medida(formData.pulsaciones, true),
        peso: medida(formData.peso),
        altura: medida(formData.altura),
        cintura: medida(formData.cintura),
        observaciones: formData.observaciones || undefined,
        recomendaciones: formData.recomendaciones || undefined,
      };

      if (analisisId) {
        await actualizarAnalisis.mutateAsync({ id: analisisId, ...datosAnalisis });
        toast.success("Análisis actualizado correctamente");
      } else {
        const nuevoAnalisis = await crearAnalisis.mutateAsync(datosAnalisis);
        toast.success("Análisis guardado correctamente");
        // Actualizar la URL con el ID del análisis para habilitar los botones de imprimir y PDF
        if (nuevoAnalisis?.id) {
          navigate(`/servicios/bio?id=${nuevoAnalisis.id}&pacienteId=${pacienteId}`, { replace: true });
        }
      }
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
    
    imprimirRuta(`/servicios/bio/print?id=${analisisId}`);
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
          <BotonesInforme
            ruta={`/servicios/bio/print?id=${analisisId}`}
            pacienteId={paciente?.id}
            emailPaciente={paciente?.email}
            titulo="Informe de análisis bioquímico"
            nombreFichero={nombreInforme("bio", paciente?.name, analisisExistente?.fecha)}
            deshabilitado={isLoading || !analisisId}
          />
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
            <div className="flex items-center justify-between">
              <Label htmlFor="paciente">Paciente *</Label>
              <DialogoNuevoPaciente
                onPacienteCreado={setPacienteId}
                disabled={!!analisisId}
              />
            </div>
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
          {getParametrosGrupo("basicos").length > 0 && (
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">Parámetros Básicos</h3>
                <div className="space-y-4">
                  {getParametrosGrupo("basicos").map((param) => (
                    <ParametroInput
                      key={param.id}
                      id={param.id}
                      label={param.label}
                      unit={param.unit}
                      value={formData[param.id as keyof typeof formData] || ""}
                      onChange={(value) => handleChange(param.id as keyof typeof formData, value)}
                      configuracion={configuracion}
                      parametroId={param.id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bloque 2: Parámetros Avanzados */}
          {getParametrosGrupo("avanzados").length > 0 && (
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 text-secondary">Parámetros Avanzados</h3>
                <div className="space-y-4">
                  {getParametrosGrupo("avanzados").map((param) => (
                    <ParametroInput
                      key={param.id}
                      id={param.id}
                      label={param.label}
                      unit={param.unit}
                      value={formData[param.id as keyof typeof formData] || ""}
                      onChange={(value) => handleChange(param.id as keyof typeof formData, value)}
                      configuracion={configuracion}
                      parametroId={param.id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
          {/* Bloque 3: Medidas Corporales */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 text-success">Medidas Corporales</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="peso">Peso (kg)</Label>
                    <Input
                      id="peso"
                      type="number"
                      step="0.1"
                      placeholder="Ej: 70"
                      value={formData.peso}
                      onChange={(e) => handleChange("peso", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="altura">Altura (cm)</Label>
                    <Input
                      id="altura"
                      type="number"
                      placeholder="Ej: 170"
                      value={formData.altura}
                      onChange={(e) => handleChange("altura", e.target.value)}
                    />
                  </div>
                  {isParametroActivo("cintura") && (
                    <div className="space-y-2">
                      <Label htmlFor="cintura">Perímetro abdominal (cm)</Label>
                      <Input
                        id="cintura"
                        type="number"
                        step="0.5"
                        placeholder="Ej: 90"
                        value={formData.cintura}
                        onChange={(e) => handleChange("cintura", e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {imc !== null && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">Índice de Masa Corporal (IMC)</Label>
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
                          {imc} kg/m²
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
