import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Printer, Sparkles, Download } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePacientes } from "@/hooks/usePacientes";
import { useCrearAnalisisDermo, useAnalisisDermo, useActualizarAnalisisDermo } from "@/hooks/useAnalisisDermo";
import type { AnalisisDermo, RutinaDia, RutinaNoche, CuidadosSemanales } from "@/types";
// Importación dinámica para reducir el bundle inicial
const loadPDFGenerator = () => import("@/lib/pdfGenerator");

// Opciones de valoración de la piel
const VALORACION_PIEL_OPCIONES = [
  "piel_grasa",
  "flacidez",
  "sensibilidad_rojeces",
  "piel_seca",
  "arrugas",
  "pigmentacion_manchas",
  "piel_mixta",
  "falta_elasticidad",
  "poros_abiertos",
  "piel_deshidratada",
] as const;

const VALORACION_PIEL_LABELS: Record<string, string> = {
  piel_grasa: "Piel grasa",
  flacidez: "Flacidez",
  sensibilidad_rojeces: "Sensibilidad / Rojeces",
  piel_seca: "Piel seca",
  arrugas: "Arrugas",
  pigmentacion_manchas: "Pigmentación / Manchas",
  piel_mixta: "Piel mixta",
  falta_elasticidad: "Falta de elasticidad",
  poros_abiertos: "Poros abiertos",
  piel_deshidratada: "Piel deshidratada",
};

// Opciones de hábitos
const HABITOS_OPCIONES = [
  "sueño_irregular",
  "estrés",
  "problemas_digestivos",
  "ejercicio",
  "dieta_equilibrada",
  "tabaco_alcohol",
] as const;

const HABITOS_LABELS: Record<string, string> = {
  sueño_irregular: "Sueño irregular",
  estrés: "Estrés",
  problemas_digestivos: "Problemas digestivos",
  ejercicio: "Ejercicio",
  dieta_equilibrada: "Dieta equilibrada",
  tabaco_alcohol: "Tabaco / Alcohol",
};

/**
 * Formatea una fecha ISO a formato dd/mm/aaaa
 */
const formatearFecha = (fecha: string): string => {
  if (!fecha) return "";
  try {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const año = date.getFullYear();
    return `${dia} / ${mes} / ${año}`;
  } catch {
    return fecha;
  }
};

/**
 * Parsea una fecha en formato dd/mm/aaaa a ISO
 */
const parsearFecha = (fecha: string): string => {
  if (!fecha) return "";
  const partes = fecha.split("/").map((p) => p.trim());
  if (partes.length === 3) {
    const [dia, mes, año] = partes;
    return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return fecha;
};

export default function ServicioDermo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analisisId = searchParams.get("id");
  const pacienteIdParam = searchParams.get("pacienteId");

  const { data: pacientes = [] } = usePacientes();
  const { data: analisisExistente } = useAnalisisDermo(analisisId || undefined);
  
  // Necesitamos el paciente para el nombre del archivo
  const paciente = analisisExistente?.pacienteId
    ? pacientes.find((p) => p.id === analisisExistente.pacienteId)
    : null;
  const crearAnalisis = useCrearAnalisisDermo();
  const actualizarAnalisis = useActualizarAnalisisDermo();

  // Estado del formulario
  const [pacienteId, setPacienteId] = useState<string>(pacienteIdParam || "");
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    motivoConsulta: "",
    valoracionPiel: [] as string[],
    valoracionPielOtro: "",
    habitos: [] as string[],
    medicacionHabitual: "",
    patologias: "",
    etapaHormonal: "",
    rutinaDia: {
      higiene: "",
      contornoOjos: "",
      productoIntensivo: "",
      hidratacion: "",
      proteccionSolar: "",
    } as RutinaDia,
    rutinaNoche: {
      limpieza: "",
      contornoOjos: "",
      productoIntensivo: "",
      hidratacion: "",
    } as RutinaNoche,
    cuidadosSemanales: {
      exfoliante: "",
      mascarilla: "",
    } as CuidadosSemanales,
    suplementacionOral: "",
    proximaRevision: "",
    farmaceutico: "",
  });

  // Cargar datos existentes si estamos editando
  useEffect(() => {
    if (analisisExistente) {
      setPacienteId(analisisExistente.pacienteId);
      setFormData({
        fecha: analisisExistente.fecha.split("T")[0] || new Date().toISOString().split("T")[0],
        motivoConsulta: analisisExistente.motivoConsulta || "",
        valoracionPiel: analisisExistente.valoracionPiel || [],
        valoracionPielOtro: "",
        habitos: analisisExistente.habitos || [],
        medicacionHabitual: analisisExistente.medicacionHabitual || "",
        patologias: analisisExistente.patologias || "",
        etapaHormonal: analisisExistente.etapaHormonal || "",
        rutinaDia: analisisExistente.rutinaDia || {
          higiene: "",
          contornoOjos: "",
          productoIntensivo: "",
          hidratacion: "",
          proteccionSolar: "",
        },
        rutinaNoche: analisisExistente.rutinaNoche || {
          limpieza: "",
          contornoOjos: "",
          productoIntensivo: "",
          hidratacion: "",
        },
        cuidadosSemanales: analisisExistente.cuidadosSemanales || {
          exfoliante: "",
          mascarilla: "",
        },
        suplementacionOral: analisisExistente.suplementacionOral || "",
        proximaRevision: analisisExistente.proximaRevision || "",
        farmaceutico: analisisExistente.farmaceutico || "",
      });
    }
  }, [analisisExistente]);

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((p) => p.id === pacienteId),
    [pacientes, pacienteId]
  );

  const handleValoracionPielChange = (valor: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      valoracionPiel: checked
        ? [...prev.valoracionPiel, valor]
        : prev.valoracionPiel.filter((v) => v !== valor),
    }));
  };

  const handleHabitosChange = (valor: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      habitos: checked
        ? [...prev.habitos, valor]
        : prev.habitos.filter((v) => v !== valor),
    }));
  };

  const handleRutinaDiaChange = (campo: keyof RutinaDia, valor: string) => {
    setFormData((prev) => ({
      ...prev,
      rutinaDia: { ...prev.rutinaDia, [campo]: valor },
    }));
  };

  const handleRutinaNocheChange = (campo: keyof RutinaNoche, valor: string) => {
    setFormData((prev) => ({
      ...prev,
      rutinaNoche: { ...prev.rutinaNoche, [campo]: valor },
    }));
  };

  const handleCuidadosSemanalesChange = (campo: keyof CuidadosSemanales, valor: string) => {
    setFormData((prev) => ({
      ...prev,
      cuidadosSemanales: { ...prev.cuidadosSemanales, [campo]: valor },
    }));
  };

  const handleSubmit = async () => {
    if (!pacienteId) {
      toast.error("Debe seleccionar un paciente");
      return;
    }

    try {
      const datosAnalisis: Omit<AnalisisDermo, "id" | "createdAt" | "updatedAt" | "paciente"> = {
        pacienteId,
        fecha: new Date(formData.fecha).toISOString(),
        motivoConsulta: formData.motivoConsulta,
        valoracionPiel: formData.valoracionPiel,
        habitos: formData.habitos,
        medicacionHabitual: formData.medicacionHabitual,
        patologias: formData.patologias,
        etapaHormonal: formData.etapaHormonal,
        rutinaDia: formData.rutinaDia,
        rutinaNoche: formData.rutinaNoche,
        cuidadosSemanales: formData.cuidadosSemanales,
        suplementacionOral: formData.suplementacionOral,
        proximaRevision: formData.proximaRevision ? parsearFecha(formData.proximaRevision) : undefined,
        farmaceutico: formData.farmaceutico,
        concerns: [], // Mantener compatibilidad
      };

      if (analisisId) {
        await actualizarAnalisis.mutateAsync({ id: analisisId, ...datosAnalisis });
        toast.success("Análisis actualizado correctamente");
      } else {
        const nuevoAnalisis = await crearAnalisis.mutateAsync(datosAnalisis);
        toast.success("Análisis guardado correctamente");
        // Actualizar la URL con el ID del análisis para habilitar los botones de imprimir y PDF
        if (nuevoAnalisis?.id) {
          navigate(`/servicios/dermo?id=${nuevoAnalisis.id}&pacienteId=${pacienteId}`, { replace: true });
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
    
    // Abrir vista de impresión en nueva pestaña
    window.open(`/servicios/dermo/print?id=${analisisId}`, "_blank");
  };

  const handleDescargarPDF = async () => {
    if (!analisisId) {
      toast.info("Guarde el análisis primero para descargar el PDF");
      return;
    }

    try {
      toast.info("Generando PDF...", { duration: 2000 });
      
      // Cargar el generador de PDF dinámicamente
      const { generatePDFFromElement, generatePDFFilename } = await loadPDFGenerator();
      
      // Abrir la página de impresión en un iframe oculto
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '-9999px';
      iframe.style.bottom = '-9999px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);

      // Marcar que es una descarga de PDF para evitar auto-impresión
      sessionStorage.setItem('pdfDownload', 'true');

      // Esperar a que el iframe cargue completamente
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sessionStorage.removeItem('pdfDownload');
          reject(new Error('Timeout al cargar la página de impresión'));
        }, 10000);

        iframe.onload = () => {
          clearTimeout(timeout);
          // Esperar un poco más para que los estilos se apliquen
          setTimeout(() => {
            resolve();
          }, 1000);
        };

        iframe.onerror = () => {
          clearTimeout(timeout);
          sessionStorage.removeItem('pdfDownload');
          reject(new Error('Error al cargar la página de impresión'));
        };

        iframe.src = `/servicios/dermo/print?id=${analisisId}`;
      });

      const printPage = iframe.contentDocument?.querySelector('.print-page') as HTMLElement;
      if (!printPage) {
        throw new Error('No se encontró el contenido para imprimir');
      }

      const filename = generatePDFFilename(
        'dermo',
        paciente?.nombre,
        analisisExistente?.fecha
      );

      await generatePDFFromElement(printPage, { 
        filename,
        quality: 2, // Alta calidad
        format: 'a4',
        margin: 10,
      });

      toast.success("PDF descargado correctamente");
      document.body.removeChild(iframe);
      sessionStorage.removeItem('pdfDownload');
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      toast.error("Error al generar el PDF. Usa la opción de imprimir del navegador.");
      sessionStorage.removeItem('pdfDownload');
      // Limpiar iframe si existe
      const iframe = document.querySelector('iframe[style*="-9999px"]');
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
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
              <Sparkles className="h-6 w-6 text-primary" />
              Consulta Dermocosmética
            </h1>
            <p className="text-muted-foreground">Análisis completo de piel</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImprimir} className="gap-2" disabled={isLoading || !analisisId}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleDescargarPDF} className="gap-2" disabled={isLoading || !analisisId}>
            <Download className="h-4 w-4" />
            Descargar PDF
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

      {/* Formulario - Replicando la plantilla HTML */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6 space-y-6">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre</Label>
              <Input
                value={pacienteSeleccionado?.name || ""}
                disabled
                className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Teléfono</Label>
              <Input
                value={pacienteSeleccionado?.phone || ""}
                disabled
                className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Email</Label>
              <Input
                value={pacienteSeleccionado?.email || ""}
                disabled
                className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
                className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0"
              />
            </div>
          </div>

          {/* Motivo de consulta */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              Motivo / Objetivo de la consulta:
            </Label>
            <Textarea
              value={formData.motivoConsulta}
              onChange={(e) => setFormData((prev) => ({ ...prev, motivoConsulta: e.target.value }))}
              rows={2}
              className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
            />
          </div>

          {/* Valoración de la piel */}
          <div>
            <div className="bg-[#6495a8] text-white font-semibold text-sm py-2 px-4 rounded-sm mb-4 uppercase tracking-wide">
              Valoración de la piel
            </div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-3">
              {VALORACION_PIEL_OPCIONES.map((opcion) => (
                <div key={opcion} className="flex items-center space-x-2">
                  <Checkbox
                    id={opcion}
                    checked={formData.valoracionPiel.includes(opcion)}
                    onCheckedChange={(checked) => handleValoracionPielChange(opcion, checked as boolean)}
                  />
                  <Label htmlFor={opcion} className="text-sm font-normal cursor-pointer">
                    {VALORACION_PIEL_LABELS[opcion]}
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-2 col-span-2">
                <Checkbox
                  id="valoracion_otro"
                  checked={formData.valoracionPiel.includes("otro")}
                  onCheckedChange={(checked) => handleValoracionPielChange("otro", checked as boolean)}
                />
                <Label htmlFor="valoracion_otro" className="text-sm font-normal cursor-pointer pr-2">
                  Otro:
                </Label>
                <Input
                  value={formData.valoracionPielOtro}
                  onChange={(e) => setFormData((prev) => ({ ...prev, valoracionPielOtro: e.target.value }))}
                  placeholder="Especificar"
                  className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 flex-1"
                />
              </div>
            </div>
          </div>

          {/* Hábitos y Salud */}
          <div>
            <div className="bg-[#6495a8] text-white font-semibold text-sm py-2 px-4 rounded-sm mb-4 uppercase tracking-wide">
              Hábitos y Salud
            </div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-3">
              {HABITOS_OPCIONES.map((opcion) => (
                <div key={opcion} className="flex items-center space-x-2">
                  <Checkbox
                    id={opcion}
                    checked={formData.habitos.includes(opcion)}
                    onCheckedChange={(checked) => handleHabitosChange(opcion, checked as boolean)}
                  />
                  <Label htmlFor={opcion} className="text-sm font-normal cursor-pointer">
                    {HABITOS_LABELS[opcion]}
                  </Label>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-[#6495a8]">Medicación habitual</Label>
                <Textarea
                  value={formData.medicacionHabitual}
                  onChange={(e) => setFormData((prev) => ({ ...prev, medicacionHabitual: e.target.value }))}
                  rows={1}
                  className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-[#6495a8]">Patologías</Label>
                <Textarea
                  value={formData.patologias}
                  onChange={(e) => setFormData((prev) => ({ ...prev, patologias: e.target.value }))}
                  rows={1}
                  className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-semibold uppercase text-[#6495a8]">Mujer - Etapa Hormonal</Label>
                <Textarea
                  value={formData.etapaHormonal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, etapaHormonal: e.target.value }))}
                  rows={1}
                  className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pauta Dermocosmética */}
          <div>
            <div className="bg-[#6495a8] text-white font-semibold text-sm py-2 px-4 rounded-sm mb-4 uppercase tracking-wide">
              Pauta Dermocosmética
            </div>
            <div className="grid grid-cols-2 gap-10">
              {/* Rutina de Día */}
              <div>
                <div className="bg-[#79438f] text-white text-center py-2 text-sm font-normal uppercase mb-4">
                  Rutina de Día
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">1. Higiene</Label>
                    <Textarea
                      value={formData.rutinaDia.higiene}
                      onChange={(e) => handleRutinaDiaChange("higiene", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">2. Contorno de ojos</Label>
                    <Textarea
                      value={formData.rutinaDia.contornoOjos}
                      onChange={(e) => handleRutinaDiaChange("contornoOjos", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">3. Producto intensivo</Label>
                    <Textarea
                      value={formData.rutinaDia.productoIntensivo}
                      onChange={(e) => handleRutinaDiaChange("productoIntensivo", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">4. Hidratación</Label>
                    <Textarea
                      value={formData.rutinaDia.hidratacion}
                      onChange={(e) => handleRutinaDiaChange("hidratacion", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">5. Protección Solar</Label>
                    <Textarea
                      value={formData.rutinaDia.proteccionSolar}
                      onChange={(e) => handleRutinaDiaChange("proteccionSolar", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rutina de Noche */}
              <div>
                <div className="bg-[#79438f] text-white text-center py-2 text-sm font-normal uppercase mb-4">
                  Rutina de Noche
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">1. Limpieza / Doble Limpieza</Label>
                    <Textarea
                      value={formData.rutinaNoche.limpieza}
                      onChange={(e) => handleRutinaNocheChange("limpieza", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">2. Contorno de ojos</Label>
                    <Textarea
                      value={formData.rutinaNoche.contornoOjos}
                      onChange={(e) => handleRutinaNocheChange("contornoOjos", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">3. Producto intensivo</Label>
                    <Textarea
                      value={formData.rutinaNoche.productoIntensivo}
                      onChange={(e) => handleRutinaNocheChange("productoIntensivo", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-[#6495a8]">4. Hidratación</Label>
                    <Textarea
                      value={formData.rutinaNoche.hidratacion}
                      onChange={(e) => handleRutinaNocheChange("hidratacion", e.target.value)}
                      rows={1}
                      className="border-b border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cuidados Semanales y Suplementación */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="bg-[#f0f5f7] border-l-4 border-[#6495a8] p-4 space-y-4">
                <div className="text-xs font-bold uppercase text-[#6495a8] mb-2">Cuidados Semanales</div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase text-[#79438f]">Exfoliante</Label>
                  <Textarea
                    value={formData.cuidadosSemanales.exfoliante}
                    onChange={(e) => handleCuidadosSemanalesChange("exfoliante", e.target.value)}
                    rows={1}
                    className="border-b border-[#6495a8] border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none bg-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase text-[#79438f]">Mascarilla</Label>
                  <Textarea
                    value={formData.cuidadosSemanales.mascarilla}
                    onChange={(e) => handleCuidadosSemanalesChange("mascarilla", e.target.value)}
                    rows={1}
                    className="border-b border-[#6495a8] border-t-0 border-l-0 border-r-0 rounded-none px-0 resize-none bg-transparent"
                  />
                </div>
              </div>
              <div className="bg-[#f0f5f7] border-l-4 border-[#6495a8] p-4">
                <div className="text-xs font-bold uppercase text-[#6495a8] mb-2">Suplementación oral</div>
                <Textarea
                  value={formData.suplementacionOral}
                  onChange={(e) => setFormData((prev) => ({ ...prev, suplementacionOral: e.target.value }))}
                  rows={6}
                  className="border-none bg-transparent text-sm italic resize-none"
                />
              </div>
            </div>
          </div>

          {/* Firmas */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#79438f] uppercase">Próxima Revisión:</span>
              <Input
                value={formData.proximaRevision}
                onChange={(e) => setFormData((prev) => ({ ...prev, proximaRevision: e.target.value }))}
                placeholder="dd / mm / aaaa"
                className="border-b border-[#79438f] border-t-0 border-l-0 border-r-0 rounded-none px-0 w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#79438f] uppercase">Farmacéutico/a:</span>
              <Input
                value={formData.farmaceutico}
                onChange={(e) => setFormData((prev) => ({ ...prev, farmaceutico: e.target.value }))}
                className="border-b border-[#79438f] border-t-0 border-l-0 border-r-0 rounded-none px-0 w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
