/**
 * Página de Detalle de Farmacia
 * Muestra información, usuarios y estadísticas de una farmacia
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useFarmacia, 
  useActualizarFarmacia, 
  useDesactivarFarmacia, 
  useActivarFarmacia,
  useCrearUsuarioFarmacia,
  useActualizarUsuarioFarmacia,
  useCambiarPasswordUsuario,
  useEliminarUsuarioFarmacia,
} from '@/hooks/useAdmin';
import { ConfigFarmaciaTab } from './ConfigFarmaciaTab';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  UserCheck, 
  Calendar, 
  Settings,
  Plus,
  Power,
  PowerOff,
  Loader2,
  AlertTriangle,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin,
  Pencil,
  Trash2,
  Key,
  ExternalLink,
  Copy,
} from 'lucide-react';
import type { PlanFarmacia } from '@/types';

// Componente de badge de plan
function PlanBadge({ plan }: { plan: PlanFarmacia }) {
  const variants: Record<PlanFarmacia, 'default' | 'secondary' | 'outline'> = {
    basico: 'outline',
    profesional: 'secondary',
    enterprise: 'default',
  };
  
  return (
    <Badge variant={variants[plan]}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

export default function FarmaciaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: farmacia, isLoading, error } = useFarmacia(id || '');
  const actualizarMutation = useActualizarFarmacia();
  const desactivarMutation = useDesactivarFarmacia();
  const activarMutation = useActivarFarmacia();
  const crearUsuarioMutation = useCrearUsuarioFarmacia();
  const actualizarUsuarioMutation = useActualizarUsuarioFarmacia();
  const cambiarPasswordMutation = useCambiarPasswordUsuario();
  const eliminarUsuarioMutation = useEliminarUsuarioFarmacia();

  // Estado para edición
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState<{
    nombre: string;
    direccion: string;
    ciudad: string;
    telefono: string;
    email: string;
    web: string;
    plan: PlanFarmacia;
    maxUsuarios: number;
    maxPacientes: number;
  } | null>(null);

  // Estado para diálogo de nuevo usuario (invitación por correo: sin contraseña)
  const [dialogoUsuarioAbierto, setDialogoUsuarioAbierto] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    email: '',
    rol: 'usuario' as 'admin' | 'farmaceutico' | 'usuario',
  });

  // Estado para edición de usuario
  const [dialogoEditarUsuario, setDialogoEditarUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<{
    id: string;
    nombre: string;
    rol: 'admin' | 'farmaceutico' | 'usuario';
    activo: boolean;
  } | null>(null);

  // Estado para cambiar contraseña
  const [dialogoCambiarPassword, setDialogoCambiarPassword] = useState(false);
  const [usuarioPasswordId, setUsuarioPasswordId] = useState<string | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');

  // Iniciar edición
  const iniciarEdicion = () => {
    if (farmacia) {
      setFormData({
        nombre: farmacia.nombre,
        direccion: farmacia.direccion || '',
        ciudad: farmacia.ciudad || '',
        telefono: farmacia.telefono || '',
        email: farmacia.email || '',
        web: farmacia.web || '',
        plan: farmacia.plan,
        maxUsuarios: farmacia.maxUsuarios,
        maxPacientes: farmacia.maxPacientes,
      });
      setEditando(true);
    }
  };

  // Guardar cambios
  const guardarCambios = async () => {
    if (!formData || !id) return;

    try {
      await actualizarMutation.mutateAsync({ id, datos: formData });
      toast.success('Farmacia actualizada correctamente');
      setEditando(false);
    } catch {
      toast.error('Error al actualizar la farmacia');
    }
  };

  // Toggle activa
  const handleToggleActiva = async () => {
    if (!farmacia || !id) return;

    if (farmacia.activa) {
      if (!confirm(`¿Estás seguro de desactivar "${farmacia.nombre}"? Los usuarios no podrán acceder.`)) {
        return;
      }
      try {
        await desactivarMutation.mutateAsync(id);
        toast.success('Farmacia desactivada');
      } catch {
        toast.error('Error al desactivar');
      }
    } else {
      try {
        await activarMutation.mutateAsync(id);
        toast.success('Farmacia activada');
      } catch {
        toast.error('Error al activar');
      }
    }
  };

  // Crear usuario (se envía invitación por correo para que cree su contraseña)
  const handleCrearUsuario = async () => {
    if (!id || !nuevoUsuario.nombre || !nuevoUsuario.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    try {
      await crearUsuarioMutation.mutateAsync({
        farmaciaId: id,
        datos: nuevoUsuario,
      });
      toast.success('Usuario creado. Se ha enviado un correo para que establezca su contraseña.');
      setDialogoUsuarioAbierto(false);
      setNuevoUsuario({ nombre: '', email: '', rol: 'usuario' });
    } catch {
      toast.error('Error al crear el usuario');
    }
  };

  // Editar usuario
  const handleEditarUsuario = async () => {
    if (!id || !usuarioEditando) return;

    try {
      await actualizarUsuarioMutation.mutateAsync({
        farmaciaId: id,
        usuarioId: usuarioEditando.id,
        datos: {
          nombre: usuarioEditando.nombre,
          rol: usuarioEditando.rol,
          activo: usuarioEditando.activo,
        },
      });
      toast.success('Usuario actualizado correctamente');
      setDialogoEditarUsuario(false);
      setUsuarioEditando(null);
    } catch {
      toast.error('Error al actualizar el usuario');
    }
  };

  // Cambiar contraseña
  const handleCambiarPassword = async () => {
    if (!id || !usuarioPasswordId || !nuevaPassword) {
      toast.error('La contraseña es requerida');
      return;
    }

    if (nuevaPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await cambiarPasswordMutation.mutateAsync({
        farmaciaId: id,
        usuarioId: usuarioPasswordId,
        password: nuevaPassword,
      });
      toast.success('Contraseña actualizada correctamente');
      setDialogoCambiarPassword(false);
      setUsuarioPasswordId(null);
      setNuevaPassword('');
    } catch {
      toast.error('Error al cambiar la contraseña');
    }
  };

  // Eliminar usuario
  const handleEliminarUsuario = async (usuarioId: string, nombre: string) => {
    if (!id) return;

    if (!confirm(`¿Estás seguro de eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await eliminarUsuarioMutation.mutateAsync({
        farmaciaId: id,
        usuarioId,
      });
      toast.success('Usuario eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el usuario');
    }
  };

  // Copiar enlace de citas
  const handleCopiarEnlaceCitas = () => {
    if (!farmacia) return;
    const url = `${window.location.origin}/cita/${farmacia.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !farmacia) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Farmacia no encontrada o error al cargar
          </AlertDescription>
        </Alert>
        <Link to="/admin/farmacias" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Farmacias
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/farmacias">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{farmacia.nombre}</h1>
              <Badge variant={farmacia.activa ? 'default' : 'destructive'}>
                {farmacia.activa ? 'Activa' : 'Inactiva'}
              </Badge>
              <PlanBadge plan={farmacia.plan} />
            </div>
            <p className="text-muted-foreground">{farmacia.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={farmacia.activa ? 'destructive' : 'default'}
            onClick={handleToggleActiva}
            disabled={desactivarMutation.isPending || activarMutation.isPending}
          >
            {farmacia.activa ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Desactivar
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Activar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farmacia.estadisticas.totalUsuarios}
              <span className="text-sm text-muted-foreground"> / {farmacia.maxUsuarios}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farmacia.estadisticas.totalPacientes}
              <span className="text-sm text-muted-foreground"> / {farmacia.maxPacientes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farmacia.estadisticas.totalCitas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farmacia.estadisticas.totalEventos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="mr-2 h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" />
            Usuarios ({farmacia.usuarios.length})
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Tab Información */}
        <TabsContent value="info">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Información de la Farmacia</CardTitle>
                <CardDescription>Datos de contacto y configuración</CardDescription>
              </div>
              {!editando ? (
                <Button onClick={iniciarEdicion}>Editar</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditando(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={guardarCambios} disabled={actualizarMutation.isPending}>
                    {actualizarMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {editando && formData ? (
                // Modo edición
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plan</Label>
                      <Select
                        value={formData.plan}
                        onValueChange={(value: PlanFarmacia) => setFormData({ ...formData, plan: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basico">Básico</SelectItem>
                          <SelectItem value="profesional">Profesional</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Dirección</Label>
                      <Input
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ciudad</Label>
                      <Input
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Web</Label>
                      <Input
                        value={formData.web}
                        onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Máx. Usuarios</Label>
                      <Input
                        type="number"
                        value={formData.maxUsuarios}
                        onChange={(e) => setFormData({ ...formData, maxUsuarios: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Máx. Pacientes</Label>
                      <Input
                        type="number"
                        value={formData.maxPacientes}
                        onChange={(e) => setFormData({ ...formData, maxPacientes: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{farmacia.direccion || 'Sin dirección'}, {farmacia.ciudad || ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{farmacia.telefono || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{farmacia.email || 'Sin email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{farmacia.web || 'Sin web'}</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Fecha de alta: {new Date(farmacia.fechaAlta).toLocaleDateString('es-ES')}
                  {farmacia.fechaExpiracion && (
                    <> · Expira: {new Date(farmacia.fechaExpiracion).toLocaleDateString('es-ES')}</>
                  )}
                </p>
                
                {/* Enlace público de citas */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Enlace público de citas</p>
                    <p className="text-xs text-muted-foreground">
                      {window.location.origin}/cita/{farmacia.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopiarEnlaceCitas}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/cita/${farmacia.slug}`, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Usuarios */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>
                  {farmacia.usuarios.length} de {farmacia.maxUsuarios} usuarios
                </CardDescription>
              </div>
              <Dialog open={dialogoUsuarioAbierto} onOpenChange={setDialogoUsuarioAbierto}>
                <DialogTrigger asChild>
                  <Button disabled={farmacia.usuarios.length >= farmacia.maxUsuarios}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Usuario</DialogTitle>
                    <DialogDescription>
                      Se enviará un correo al usuario para que cree su contraseña de forma segura.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={nuevoUsuario.nombre}
                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                        placeholder="Juan García"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={nuevoUsuario.email}
                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                        placeholder="usuario@farmacia.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <Select
                        value={nuevoUsuario.rol}
                        onValueChange={(value: 'admin' | 'farmaceutico' | 'usuario') =>
                          setNuevoUsuario({ ...nuevoUsuario, rol: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="farmaceutico">Farmacéutico</SelectItem>
                          <SelectItem value="usuario">Usuario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogoUsuarioAbierto(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCrearUsuario} disabled={crearUsuarioMutation.isPending}>
                      {crearUsuarioMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Crear
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {farmacia.usuarios.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmacia.usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{usuario.nombre}</p>
                            <p className="text-sm text-muted-foreground">{usuario.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{usuario.rol}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.activo ? 'default' : 'destructive'}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {usuario.ultimoAcceso
                            ? new Date(usuario.ultimoAcceso).toLocaleString('es-ES')
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => {
                                setUsuarioEditando({
                                  id: usuario.id,
                                  nombre: usuario.nombre,
                                  rol: usuario.rol as 'admin' | 'farmaceutico' | 'usuario',
                                  activo: usuario.activo,
                                });
                                setDialogoEditarUsuario(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cambiar contraseña"
                              onClick={() => {
                                setUsuarioPasswordId(usuario.id);
                                setNuevaPassword('');
                                setDialogoCambiarPassword(true);
                              }}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              onClick={() => handleEliminarUsuario(usuario.id, usuario.nombre)}
                              disabled={eliminarUsuarioMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No hay usuarios</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diálogo editar usuario */}
          <Dialog open={dialogoEditarUsuario} onOpenChange={setDialogoEditarUsuario}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>Modificar datos del usuario</DialogDescription>
              </DialogHeader>
              {usuarioEditando && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={usuarioEditando.nombre}
                      onChange={(e) => setUsuarioEditando({ ...usuarioEditando, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select
                      value={usuarioEditando.rol}
                      onValueChange={(value: 'admin' | 'farmaceutico' | 'usuario') =>
                        setUsuarioEditando({ ...usuarioEditando, rol: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="farmaceutico">Farmacéutico</SelectItem>
                        <SelectItem value="usuario">Usuario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={usuarioEditando.activo}
                      onChange={(e) => setUsuarioEditando({ ...usuarioEditando, activo: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="activo">Usuario activo</Label>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogoEditarUsuario(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditarUsuario} disabled={actualizarUsuarioMutation.isPending}>
                  {actualizarUsuarioMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Diálogo cambiar contraseña */}
          <Dialog open={dialogoCambiarPassword} onOpenChange={setDialogoCambiarPassword}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogDescription>Introduce la nueva contraseña para el usuario</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nueva Contraseña</Label>
                  <Input
                    type="password"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogoCambiarPassword(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCambiarPassword} disabled={cambiarPasswordMutation.isPending}>
                  {cambiarPasswordMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  Cambiar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab Configuración */}
        <TabsContent value="config">
          {id && <ConfigFarmaciaTab farmaciaId={id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
