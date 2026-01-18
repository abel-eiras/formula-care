import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCrearPaciente } from "@/hooks/usePacientes";

interface DialogoNuevoPacienteProps {
  /** Callback cuando se crea el paciente, recibe el ID del nuevo paciente */
  onPacienteCreado: (pacienteId: string) => void;
  /** Si el diálogo debe estar deshabilitado (ej: cuando se edita un análisis) */
  disabled?: boolean;
}

/**
 * Componente de diálogo para crear un paciente rápidamente desde los formularios de análisis.
 * Solo pide los datos mínimos necesarios para poder continuar con el análisis.
 */
export function DialogoNuevoPaciente({
  onPacienteCreado,
  disabled = false,
}: DialogoNuevoPacienteProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    sex: "O" as "M" | "F" | "O",
  });

  const crearPaciente = useCrearPaciente();

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (formData.name.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("El teléfono es obligatorio");
      return;
    }
    if (formData.phone.trim().length < 9) {
      toast.error("El teléfono debe tener al menos 9 caracteres");
      return;
    }
    if (!formData.age || parseInt(formData.age) <= 0) {
      toast.error("La edad debe ser un número positivo");
      return;
    }

    try {
      const nuevoPaciente = await crearPaciente.mutateAsync({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        age: parseInt(formData.age),
        sex: formData.sex,
      });

      toast.success(`Paciente "${nuevoPaciente.name}" creado correctamente`);
      onPacienteCreado(nuevoPaciente.id);
      setOpen(false);
      // Resetear formulario
      setFormData({
        name: "",
        phone: "",
        email: "",
        age: "",
        sex: "O",
      });
    } catch (error) {
      console.error("Error al crear paciente:", error);
      toast.error("Error al crear el paciente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear nuevo paciente</DialogTitle>
          <DialogDescription>
            Introduce los datos básicos del paciente. Podrás completar su
            información más adelante desde su ficha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input
              id="nombre"
              placeholder="Nombre y apellidos"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                placeholder="600 000 000"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edad">Edad *</Label>
              <Input
                id="edad"
                type="number"
                placeholder="35"
                min="1"
                max="150"
                value={formData.age}
                onChange={(e) => handleChange("age", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sexo">Sexo</Label>
            <Select
              value={formData.sex}
              onValueChange={(value: "M" | "F" | "O") =>
                handleChange("sex", value)
              }
            >
              <SelectTrigger id="sexo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="O">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={crearPaciente.isPending}
          >
            {crearPaciente.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear paciente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
