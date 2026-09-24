import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, UserCog } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePacientes, useActualizarPaciente } from "@/hooks/usePacientes";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { calcularEdad } from "@/lib/edad";

export default function EditarPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pacientes = [], isLoading } = usePacientes();
  const actualizarPaciente = useActualizarPaciente();
  
  const paciente = useMemo(() => {
    return pacientes.find((p) => p.id === id);
  }, [pacientes, id]);

  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    sex: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  // Cargar datos del paciente cuando esté disponible
  useEffect(() => {
    if (paciente) {
      setFormData({
        name: paciente.name || "",
        birthDate: paciente.birthDate || "",
        sex: paciente.sex || "",
        phone: paciente.phone || "",
        email: paciente.email || "",
        address: paciente.address || "",
        notes: paciente.notes || "",
      });
    }
  }, [paciente]);

  // Calcular edad automáticamente cuando cambia la fecha de nacimiento
  const edad = useMemo(() => {
    return formData.birthDate ? calcularEdad(formData.birthDate) : null;
  }, [formData.birthDate]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) {
      toast.error("ID de paciente no válido");
      return;
    }

    if (!formData.name || !formData.phone) {
      toast.error("El nombre y teléfono son obligatorios");
      return;
    }

    if (!formData.sex) {
      toast.error("Debe seleccionar el sexo");
      return;
    }

    // La edad no se introduce: se calcula siempre desde la fecha de nacimiento
    if (edad == null) {
      toast.error("Indica una fecha de nacimiento válida");
      return;
    }

    try {
      await actualizarPaciente.mutateAsync({
        id,
        name: formData.name,
        sex: formData.sex as "M" | "F" | "O",
        phone: formData.phone,
        email: formData.email || undefined,
        birthDate: formData.birthDate,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Paciente actualizado correctamente");
      navigate(`/pacientes/${id}`);
    } catch (error) {
      console.error("Error al actualizar paciente:", error);
      toast.error("Error al actualizar el paciente");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Paciente no encontrado</p>
        <Button variant="outline" asChild>
          <Link to="/pacientes">Volver a pacientes</Link>
        </Button>
      </div>
    );
  }

  // Determinar el origen del paciente
  const esAutoregistro = paciente.origen === "autoregistro";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to={`/pacientes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserCog className="h-6 w-6 text-primary" />
              Editar Paciente
            </h1>
            <Badge variant={esAutoregistro ? "secondary" : "default"}>
              {esAutoregistro ? "Autoregistrado" : "Registrado manualmente"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Modificar datos de {paciente.name}</p>
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild disabled={actualizarPaciente.isPending}>
                <Link to={`/pacientes/${id}`}>Cancelar</Link>
              </Button>
              <Button type="submit" size="lg" className="gap-2" disabled={actualizarPaciente.isPending}>
                <Save className="h-5 w-5" />
                {actualizarPaciente.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
