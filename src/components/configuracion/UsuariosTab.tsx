import { useState } from "react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  useActualizarUsuario,
  useCrearUsuario,
  useEliminarUsuario,
  useUsuarios,
  type RolUsuario,
  type UsuarioGestion,
} from "@/hooks/useUsuarios";
import { LONGITUD_MINIMA, ROLES, mensajeError } from "@/lib/usuarios";

/** Alta de un usuario con contraseña inicial (la app local no envía invitaciones) */
function DialogoNuevoUsuario({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const crear = useCrearUsuario();
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "farmaceutico" as RolUsuario });

  const guardar = async () => {
    if (form.nombre.trim().length < 2 || !form.email.includes("@") || form.password.length < LONGITUD_MINIMA) {
      toast.error(`Indica nombre, email y una contraseña de al menos ${LONGITUD_MINIMA} caracteres`);
      return;
    }
    try {
      await crear.mutateAsync({ ...form, nombre: form.nombre.trim(), email: form.email.trim() });
      toast.success(`Usuario ${form.nombre} creado. Comunícale su contraseña inicial.`);
      setForm({ nombre: "", email: "", password: "", rol: "farmaceutico" });
      onCerrar();
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido crear el usuario"));
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea la cuenta con una contraseña inicial y comunícasela a la persona; podrá cambiarla en Configuración → Mi cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nuevo-nombre">Nombre</Label>
            <Input id="nuevo-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-email">Email (para iniciar sesión)</Label>
            <Input id="nuevo-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-password">Contraseña inicial</Label>
            <Input
              id="nuevo-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={form.rol} onValueChange={(rol) => setForm({ ...form, rol: rol as RolUsuario })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label} — {r.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={crear.isPending}>
            {crear.isPending ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Restablecer la contraseña de otro usuario (quien la haya olvidado) */
function DialogoRestablecer({ usuario, onCerrar }: { usuario: UsuarioGestion | null; onCerrar: () => void }) {
  const actualizar = useActualizarUsuario();
  const [password, setPassword] = useState("");

  const guardar = async () => {
    if (!usuario) return;
    if (password.length < LONGITUD_MINIMA) {
      toast.error(`La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`);
      return;
    }
    try {
      await actualizar.mutateAsync({ id: usuario.id, password });
      toast.success(`Contraseña de ${usuario.nombre} restablecida`);
      setPassword("");
      onCerrar();
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido restablecer la contraseña"));
    }
  };

  return (
    <Dialog open={!!usuario} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Nueva contraseña para {usuario?.nombre}. Comunícasela y pídele que la cambie en Configuración → Mi cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reset-password">Nueva contraseña</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={actualizar.isPending}>
            Restablecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Gestión de usuarios de la instalación (solo administradores): alta con
 * contraseña inicial, rol, activar/desactivar, restablecer contraseña y baja.
 * El servidor impide dejar la farmacia sin ningún administrador activo.
 */
export function UsuariosTab() {
  const { usuario: yo } = useAuthContext();
  const esAdmin = yo?.rol === "admin";
  const { data: usuarios = [], isLoading } = useUsuarios(esAdmin);
  const actualizar = useActualizarUsuario();
  const eliminar = useEliminarUsuario();
  const [creando, setCreando] = useState(false);
  const [restableciendo, setRestableciendo] = useState<UsuarioGestion | null>(null);

  const cambiar = async (u: UsuarioGestion, datos: { rol?: RolUsuario; activo?: boolean }) => {
    try {
      await actualizar.mutateAsync({ id: u.id, ...datos });
      toast.success("Usuario actualizado");
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido actualizar el usuario"));
    }
  };

  const borrar = async (u: UsuarioGestion) => {
    try {
      await eliminar.mutateAsync(u.id);
      toast.success(`Usuario ${u.nombre} eliminado`);
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido eliminar el usuario"));
    }
  };

  if (!esAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Solo los administradores pueden gestionar usuarios.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Personas que pueden entrar en Formula Care en este equipo.</CardDescription>
        </div>
        <Button className="gap-2" onClick={() => setCreando(true)}>
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => {
                  const soyYo = u.id === yo?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">
                          {u.nombre} {soyYo && <Badge variant="outline" className="ml-1">Tú</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell>
                        <Select value={u.rol} onValueChange={(rol) => cambiar(u, { rol: rol as RolUsuario })}>
                          <SelectTrigger className="w-44" aria-label={`Rol de ${u.nombre}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={u.activo}
                          aria-label={`${u.nombre} activo`}
                          onCheckedChange={(activo) => cambiar(u, { activo })}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString("es-ES") : "Nunca"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {!soyYo && (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setRestableciendo(u)}>
                            <KeyRound className="h-4 w-4" />
                            Restablecer contraseña
                          </Button>
                        )}
                        {!soyYo && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Eliminar ${u.nombre}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar a {u.nombre}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  No podrá volver a entrar. Si solo quieres impedirle el acceso temporalmente, desactívalo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => borrar(u)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <DialogoNuevoUsuario abierto={creando} onCerrar={() => setCreando(false)} />
      <DialogoRestablecer usuario={restableciendo} onCerrar={() => setRestableciendo(null)} />
    </Card>
  );
}
