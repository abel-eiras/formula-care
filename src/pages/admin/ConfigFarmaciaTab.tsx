/**
 * Tab de configuración de una farmacia (superadmin)
 * Parámetros bioquímicos (referencia + lista) y configuración SMTP/email
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfiguracionFarmacia, useActualizarConfiguracionFarmacia } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Save, Loader2, Plus, Pencil, Trash2, Mail, FlaskConical } from 'lucide-react';
import type { ParametroReferencia, ParametroBioConfig, ActualizarConfiguracionFarmaciaData } from '@/types';

const GRUPOS_INFO: Record<string, { label: string }> = {
  basicos: { label: 'Básicos' },
  avanzados: { label: 'Avanzados' },
  tension: { label: 'Tensión' },
  corporales: { label: 'Corporales' },
};

interface ConfigFarmaciaTabProps {
  farmaciaId: string;
}

export function ConfigFarmaciaTab({ farmaciaId }: ConfigFarmaciaTabProps) {
  const { data: config, isLoading, error } = useConfiguracionFarmacia(farmaciaId);
  const actualizarMutation = useActualizarConfiguracionFarmacia();

  const [valoracionBioActiva, setValoracionBioActiva] = useState(true);
  const [parametrosReferencia, setParametrosReferencia] = useState<Record<string, ParametroReferencia>>({});
  const [parametrosBioConfig, setParametrosBioConfig] = useState<ParametroBioConfig[]>([]);
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'resend'>('smtp');
  const [emailRemitente, setEmailRemitente] = useState('');
  const [emailNombreRemitente, setEmailNombreRemitente] = useState('');
  const [usarConfigPlataforma, setUsarConfigPlataforma] = useState(true);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | null>(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpAcceptSelfSigned, setSmtpAcceptSelfSigned] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassOverride, setSmtpPassOverride] = useState('');

  const [dialogNuevoAbierto, setDialogNuevoAbierto] = useState(false);
  const [dialogEditarAbierto, setDialogEditarAbierto] = useState(false);
  const [nuevoParametro, setNuevoParametro] = useState<Partial<ParametroBioConfig>>({ label: '', unit: '', grupo: 'basicos' });
  const [parametroEditando, setParametroEditando] = useState<ParametroBioConfig | null>(null);

  useEffect(() => {
    if (config) {
      setValoracionBioActiva(config.valoracionBioActiva);
      setParametrosReferencia(config.parametrosReferencia ?? {});
      setParametrosBioConfig(config.parametrosBioConfig ?? []);
      setEmailProvider((config.emailProvider as 'smtp' | 'resend') || 'smtp');
      setEmailRemitente(config.emailRemitente ?? '');
      setEmailNombreRemitente(config.emailNombreRemitente ?? '');
      setUsarConfigPlataforma(!config.smtpHost && !config.smtpUser);
      setSmtpHost(config.smtpHost ?? '');
      setSmtpPort(config.smtpPort ?? 587);
      setSmtpSecure(config.smtpSecure ?? false);
      setSmtpAcceptSelfSigned(config.smtpAcceptSelfSigned ?? false);
      setSmtpUser(config.smtpUser ?? '');
    }
  }, [config]);

  const handleGuardarTodo = async () => {
    const datos: ActualizarConfiguracionFarmaciaData = {
      valoracionBioActiva,
      parametrosReferencia,
      parametrosBioConfig,
      emailProvider,
      emailRemitente: emailRemitente || null,
      emailNombreRemitente: emailNombreRemitente || null,
    };
    if (usarConfigPlataforma) {
      datos.smtpHost = null;
      datos.smtpPort = null;
      datos.smtpSecure = false;
      datos.smtpAcceptSelfSigned = false;
      datos.smtpUser = null;
      datos.smtpPass = null;
    } else {
      datos.smtpHost = smtpHost || null;
      datos.smtpPort = smtpPort;
      datos.smtpSecure = smtpSecure;
      datos.smtpAcceptSelfSigned = smtpAcceptSelfSigned;
      datos.smtpUser = smtpUser || null;
      if (smtpPassOverride.trim()) datos.smtpPass = smtpPassOverride;
    }
    try {
      await actualizarMutation.mutateAsync({ farmaciaId, datos });
      toast.success('Configuración guardada');
      setSmtpPassOverride('');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const actualizarParametroReferencia = (paramId: string, campo: keyof ParametroReferencia, valor: number) => {
    setParametrosReferencia((prev) => ({
      ...prev,
      [paramId]: {
        ...(prev[paramId] ?? { normalMin: 0, normalMax: 0 }),
        [campo]: valor,
      },
    }));
  };

  const guardarParametrosBio = async () => {
    try {
      await actualizarMutation.mutateAsync({
        farmaciaId,
        datos: { parametrosBioConfig },
      });
      toast.success('Parámetros bioquímicos guardados');
    } catch {
      toast.error('Error al guardar parámetros');
    }
  };

  const handleCrearParametro = () => {
    if (!nuevoParametro.label || !nuevoParametro.unit || !nuevoParametro.grupo) {
      toast.error('Completa nombre, unidad y grupo');
      return;
    }
    const id = `custom_${Date.now()}`;
    const parametrosGrupo = parametrosBioConfig.filter((p) => p.grupo === nuevoParametro.grupo);
    const maxOrden = parametrosGrupo.length ? Math.max(...parametrosGrupo.map((p) => p.orden)) : 0;
    const nuevo: ParametroBioConfig = {
      id,
      label: nuevoParametro.label,
      unit: nuevoParametro.unit,
      grupo: nuevoParametro.grupo as ParametroBioConfig['grupo'],
      activo: true,
      orden: maxOrden + 1,
    };
    setParametrosBioConfig((prev) => [...prev, nuevo]);
    setNuevoParametro({ label: '', unit: '', grupo: 'basicos' });
    setDialogNuevoAbierto(false);
  };

  const handleGuardarEdicion = () => {
    if (!parametroEditando) return;
    if (!parametroEditando.label || !parametroEditando.unit) {
      toast.error('Nombre y unidad obligatorios');
      return;
    }
    setParametrosBioConfig((prev) =>
      prev.map((p) => (p.id === parametroEditando.id ? parametroEditando : p))
    );
    setDialogEditarAbierto(false);
    setParametroEditando(null);
  };

  const eliminarParametro = (id: string) => {
    if (!confirm('¿Eliminar este parámetro?')) return;
    setParametrosBioConfig((prev) => prev.filter((p) => p.id !== id));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error al cargar la configuración</p>
        </CardContent>
      </Card>
    );
  }

  const parametrosReferenciaIds = Object.keys(parametrosReferencia);

  return (
    <div className="space-y-6">
      {/* Valoración bio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Valoración bioquímica
          </CardTitle>
          <CardDescription>Activar o desactivar la valoración automática por rangos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Valoración activa</Label>
            <Switch checked={valoracionBioActiva} onCheckedChange={setValoracionBioActiva} />
          </div>
        </CardContent>
      </Card>

      {/* Rangos de referencia */}
      <Card>
        <CardHeader>
          <CardTitle>Rangos de referencia</CardTitle>
          <CardDescription>
            Valores mínimo y máximo por parámetro para valoración (normal, advertencia, crítico)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parametrosReferenciaIds.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay parámetros con rangos definidos</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parámetro</TableHead>
                    <TableHead>Normal min</TableHead>
                    <TableHead>Normal max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parametrosReferenciaIds.map((id) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{id}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24"
                          value={parametrosReferencia[id]?.normalMin ?? ''}
                          onChange={(e) =>
                            actualizarParametroReferencia(id, 'normalMin', Number(e.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24"
                          value={parametrosReferencia[id]?.normalMax ?? ''}
                          onChange={(e) =>
                            actualizarParametroReferencia(id, 'normalMax', Number(e.target.value))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parámetros bioquímicos (lista) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parámetros bioquímicos</CardTitle>
              <CardDescription>Lista de parámetros disponibles (nombre, unidad, grupo)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialogNuevoAbierto(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
              <Button size="sm" onClick={guardarParametrosBio} disabled={actualizarMutation.isPending}>
                {actualizarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Guardar lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {parametrosBioConfig.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay parámetros configurados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...parametrosBioConfig].sort((a, b) => a.orden - b.orden).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.label}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>{GRUPOS_INFO[p.grupo]?.label ?? p.grupo}</TableCell>
                    <TableCell>
                      <Badge variant={p.activo ? 'default' : 'secondary'}>{p.activo ? 'Sí' : 'No'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setParametroEditando({ ...p });
                            setDialogEditarAbierto(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => eliminarParametro(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Email / SMTP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Correo (SMTP / Resend)
          </CardTitle>
          <CardDescription>
            Por defecto se usa la configuración de la plataforma. Puedes definir una propia para esta farmacia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="usar-plataforma"
              checked={usarConfigPlataforma}
              onCheckedChange={setUsarConfigPlataforma}
            />
            <Label htmlFor="usar-plataforma">Usar configuración por defecto de la plataforma</Label>
          </div>
          {!usarConfigPlataforma && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select value={emailProvider} onValueChange={(v: 'smtp' | 'resend') => setEmailProvider(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="resend">Resend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email remitente</Label>
                  <Input
                    type="email"
                    value={emailRemitente}
                    onChange={(e) => setEmailRemitente(e.target.value)}
                    placeholder="noreply@farmacia.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre del remitente</Label>
                <Input
                  value={emailNombreRemitente}
                  onChange={(e) => setEmailNombreRemitente(e.target.value)}
                  placeholder="Farmacia"
                />
              </div>
              {emailProvider === 'smtp' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Host SMTP</Label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Puerto</Label>
                    <Input
                      type="number"
                      value={smtpPort ?? ''}
                      onChange={(e) => setSmtpPort(e.target.value ? parseInt(e.target.value, 10) : null)}
                      placeholder="587"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="smtpSecure" checked={smtpSecure} onCheckedChange={setSmtpSecure} />
                    <Label htmlFor="smtpSecure">Conexión segura (SSL)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="smtpAcceptSelfSigned" checked={smtpAcceptSelfSigned} onCheckedChange={setSmtpAcceptSelfSigned} />
                    <Label htmlFor="smtpAcceptSelfSigned">Aceptar certificado autofirmado</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Usuario SMTP</Label>
                    <Input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña SMTP</Label>
                    <Input
                      type="password"
                      value={smtpPassOverride}
                      onChange={(e) => setSmtpPassOverride(e.target.value)}
                      placeholder="Dejar en blanco para no cambiar"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGuardarTodo} disabled={actualizarMutation.isPending}>
          {actualizarMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar toda la configuración
        </Button>
      </div>

      {/* Dialog nuevo parámetro */}
      <Dialog open={dialogNuevoAbierto} onOpenChange={setDialogNuevoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo parámetro</DialogTitle>
            <DialogDescription>Añadir parámetro bioquímico</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={nuevoParametro.label ?? ''}
                onChange={(e) => setNuevoParametro({ ...nuevoParametro, label: e.target.value })}
                placeholder="Ej: Glucemia"
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={nuevoParametro.unit ?? ''}
                onChange={(e) => setNuevoParametro({ ...nuevoParametro, unit: e.target.value })}
                placeholder="mg/dL"
              />
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select
                value={nuevoParametro.grupo ?? 'basicos'}
                onValueChange={(v) => setNuevoParametro({ ...nuevoParametro, grupo: v as ParametroBioConfig['grupo'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GRUPOS_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearParametro}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar parámetro */}
      <Dialog open={dialogEditarAbierto} onOpenChange={setDialogEditarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar parámetro</DialogTitle>
          </DialogHeader>
          {parametroEditando && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={parametroEditando.label}
                  onChange={(e) => setParametroEditando({ ...parametroEditando, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input
                  value={parametroEditando.unit}
                  onChange={(e) => setParametroEditando({ ...parametroEditando, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select
                  value={parametroEditando.grupo}
                  onValueChange={(v) => setParametroEditando({ ...parametroEditando, grupo: v as ParametroBioConfig['grupo'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GRUPOS_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={parametroEditando.activo}
                  onCheckedChange={(v) => setParametroEditando({ ...parametroEditando, activo: v })}
                />
                <Label>Activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarEdicion}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
