import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, UserPlus, FileCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCrearPaciente } from "@/hooks/usePacientes";
import { useConfiguracionRgpd } from "@/hooks/useConfiguracion";
import type { Paciente } from "@/types";

/**
 * Calcula la edad a partir de la fecha de nacimiento
 */
const calcularEdad = (birthDate: string): number | null => {
  if (!birthDate) return null;
  const hoy = new Date();
  const nacimiento = new Date(birthDate);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

export default function NuevoPaciente() {
  const navigate = useNavigate();
  const crearPaciente = useCrearPaciente();
  const { data: rgpdConfig } = useConfiguracionRgpd();
  
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    sex: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  
  // Estado para el consentimiento
  const [consentimientoAceptado, setConsentimientoAceptado] = useState(false);

  // Calcular edad automáticamente cuando cambia la fecha de nacimiento
  const edad = useMemo(() => {
    return formData.birthDate ? calcularEdad(formData.birthDate) : null;
  }, [formData.birthDate]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error("El nombre y teléfono son obligatorios");
      return;
    }

    if (!formData.birthDate && !edad) {
      toast.error("Debe proporcionar fecha de nacimiento o edad");
      return;
    }

    if (!formData.sex) {
      toast.error("Debe seleccionar el sexo");
      return;
    }

    // Verificar consentimiento si está requerido
    if (rgpdConfig?.consentimientoRequerido && !consentimientoAceptado) {
      toast.error("Debe confirmar que el paciente ha dado su consentimiento");
      return;
    }

    try {
      const nuevoPaciente: Omit<Paciente, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        age: edad || 0, // Si no hay fecha, usar 0 (se puede calcular después)
        sex: formData.sex as "M" | "F" | "O",
        phone: formData.phone,
        email: formData.email || undefined,
        birthDate: formData.birthDate || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      };

      await crearPaciente.mutateAsync(nuevoPaciente);
      toast.success("Paciente registrado correctamente");
      navigate("/pacientes");
    } catch (error) {
      console.error("Error al crear paciente:", error);
      toast.error("Error al registrar el paciente");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to="/pacientes">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Nuevo Paciente
          </h1>
          <p className="text-muted-foreground">Registrar un nuevo paciente</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm border-border/50 max-w-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Datos del Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  placeholder="Ej: María García López"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de Nacimiento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                  required
                />
                {edad !== null && (
                  <p className="text-sm text-muted-foreground">
                    Edad calculada: {edad} años
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sexo *</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => handleChange("sex", value)}
                  required
                >
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Hombre</SelectItem>
                    <SelectItem value="F">Mujer</SelectItem>
                    <SelectItem value="O">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ej: 612 345 678"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: paciente@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Ej: Calle Mayor 15, Madrid"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="notes">Notas / Alergias</Label>
                <Textarea
                  id="notes"
                  placeholder="Información relevante sobre el paciente..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            {/* Checkbox de consentimiento */}
            {rgpdConfig?.consentimientoRequerido && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consentimiento"
                    checked={consentimientoAceptado}
                    onCheckedChange={(checked) => setConsentimientoAceptado(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label 
                      htmlFor="consentimiento" 
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <FileCheck className="h-4 w-4 text-primary" />
                      Consentimiento del paciente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Confirmo que el paciente ha sido informado y ha dado su consentimiento 
                      para el tratamiento de sus datos de salud según la política de privacidad.
                      {rgpdConfig.consentimientoVersion && (
                        <span className="ml-1 text-primary">
                          (Versión: {rgpdConfig.consentimientoVersion})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild disabled={crearPaciente.isPending}>
                <Link to="/pacientes">Cancelar</Link>
              </Button>
              <Button type="submit" size="lg" className="gap-2" disabled={crearPaciente.isPending}>
                <Save className="h-5 w-5" />
                {crearPaciente.isPending ? "Guardando..." : "Guardar Paciente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
