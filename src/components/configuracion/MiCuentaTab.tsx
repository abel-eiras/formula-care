import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCambiarMiPassword } from "@/hooks/useUsuarios";
import { LONGITUD_MINIMA, ROLES, mensajeError } from "@/lib/usuarios";

const FORM_VACIO = { passwordActual: "", passwordNueva: "", confirmacion: "" };

/** Datos de la sesión actual y cambio de la contraseña propia */
export function MiCuentaTab() {
  const { usuario } = useAuthContext();
  const cambiarPassword = useCambiarMiPassword();
  const [form, setForm] = useState(FORM_VACIO);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.passwordNueva.length < LONGITUD_MINIMA) {
      toast.error(`La nueva contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`);
      return;
    }
    if (form.passwordNueva !== form.confirmacion) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    try {
      await cambiarPassword.mutateAsync({ passwordActual: form.passwordActual, passwordNueva: form.passwordNueva });
      toast.success("Contraseña actualizada");
      setForm(FORM_VACIO);
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido cambiar la contraseña"));
    }
  };

  const rol = ROLES.find((r) => r.id === usuario?.rol)?.label ?? usuario?.rol;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>Mi cuenta</CardTitle>
          <CardDescription>Sesión iniciada en este equipo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Nombre:</span> {usuario?.nombre}</p>
          <p><span className="text-muted-foreground">Email:</span> {usuario?.email}</p>
          <p><span className="text-muted-foreground">Rol:</span> {rol}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>Si la olvidas, un administrador puede restablecerla desde la pestaña Usuarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password-actual">Contraseña actual</Label>
              <Input
                id="password-actual"
                type="password"
                autoComplete="current-password"
                value={form.passwordActual}
                onChange={(e) => setForm({ ...form, passwordActual: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-nueva">Nueva contraseña</Label>
              <Input
                id="password-nueva"
                type="password"
                autoComplete="new-password"
                value={form.passwordNueva}
                onChange={(e) => setForm({ ...form, passwordNueva: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-confirmacion">Repite la nueva contraseña</Label>
              <Input
                id="password-confirmacion"
                type="password"
                autoComplete="new-password"
                value={form.confirmacion}
                onChange={(e) => setForm({ ...form, confirmacion: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={cambiarPassword.isPending || !form.passwordActual}>
              {cambiarPassword.isPending ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
