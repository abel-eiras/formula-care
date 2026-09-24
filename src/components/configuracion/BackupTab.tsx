/**
 * Copias de seguridad: periodicidad, cifrado opcional, carpeta adicional,
 * generar ahora, guardar fuera, importar (restaurar, también en otro equipo)
 * y listado de copias existentes.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, DatabaseBackup, Download, Eye, EyeOff, FolderOpen, PlayCircle, Trash2, Upload, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { open as abrirDialogoArchivo, save as dialogoGuardar } from '@tauri-apps/plugin-dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { guardarTokenSesion } from '@/lib/api';
import {
  useConfigBackup,
  useActualizarConfigBackup,
  useListaBackups,
  useCrearBackupAhora,
  useBorrarBackup,
  useImportarBackup,
  useExportarBackup,
} from '@/hooks/useBackups';

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BackupTab() {
  const { data: config, isLoading } = useConfigBackup();
  const actualizarConfig = useActualizarConfigBackup();
  const { data: backups, isLoading: cargandoBackups } = useListaBackups();
  const crearAhora = useCrearBackupAhora();
  const borrarBackup = useBorrarBackup();
  const importarBackup = useImportarBackup();
  const exportarBackup = useExportarBackup();
  const { usuario } = useAuthContext();
  // Restaurar, borrar y guardar fuera: solo administradores (el servidor lo exige)
  const esAdmin = usuario?.rol === 'admin';

  const [periodicidad, setPeriodicidad] = useState<'diaria' | 'semanal' | 'mensual' | 'desactivada'>('diaria');
  const [cifradoActivo, setCifradoActivo] = useState(false);
  const [mostrarCamposPassword, setMostrarCamposPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Estado del flujo de importación: ruta elegida + contraseña + diálogo de confirmación
  const [rutaImportar, setRutaImportar] = useState<string | null>(null);
  const [passwordImportar, setPasswordImportar] = useState('');
  const [dialogoImportarAbierto, setDialogoImportarAbierto] = useState(false);

  useEffect(() => {
    if (config) {
      setPeriodicidad(config.backupPeriodicidad);
      setCifradoActivo(config.backupCifrado);
      setMostrarCamposPassword(false);
      setPassword('');
      setConfirmarPassword('');
    }
  }, [config]);

  const handleGuardar = async () => {
    if (cifradoActivo && mostrarCamposPassword) {
      if (password.length < 4) {
        toast.error('La contraseña debe tener al menos 4 caracteres');
        return;
      }
      if (password !== confirmarPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    try {
      await actualizarConfig.mutateAsync({
        backupPeriodicidad: periodicidad,
        backupCifrado: cifradoActivo,
        ...(cifradoActivo && mostrarCamposPassword ? { password } : {}),
      });
      toast.success('Configuración de copias de seguridad guardada');
      setMostrarCamposPassword(false);
      setPassword('');
      setConfirmarPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la configuración');
    }
  };

  const handleCrearAhora = async () => {
    try {
      await crearAhora.mutateAsync();
      toast.success('Copia de seguridad generada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar la copia de seguridad');
    }
  };

  const handleBorrar = async (nombre: string) => {
    try {
      await borrarBackup.mutateAsync(nombre);
      toast.success('Copia de seguridad borrada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al borrar la copia de seguridad');
    }
  };

  const handleElegirCarpeta = async () => {
    const carpeta = await abrirDialogoArchivo({ directory: true, multiple: false, title: 'Carpeta para las copias' });
    if (!carpeta || Array.isArray(carpeta)) return;
    try {
      await actualizarConfig.mutateAsync({ backupCarpetaExtra: carpeta });
      toast.success('Las próximas copias se guardarán también en esa carpeta');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido guardar la carpeta');
    }
  };

  const handleQuitarCarpeta = async () => {
    try {
      await actualizarConfig.mutateAsync({ backupCarpetaExtra: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido quitar la carpeta');
    }
  };

  const handleGuardarEn = async (nombre: string) => {
    const destino = await dialogoGuardar({
      defaultPath: nombre,
      filters: [{ name: 'Copia de seguridad de Formula Care', extensions: ['fcbackup'] }],
    });
    if (!destino) return;
    try {
      await exportarBackup.mutateAsync({ nombre, destino });
      toast.success('Copia guardada', { description: destino });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido guardar la copia');
    }
  };

  const handleElegirArchivo = async () => {
    const seleccion = await abrirDialogoArchivo({
      multiple: false,
      filters: [{ name: 'Copia de seguridad de Formula Care', extensions: ['fcbackup'] }],
    });
    if (!seleccion || Array.isArray(seleccion)) return;
    setRutaImportar(seleccion);
    setPasswordImportar('');
    setDialogoImportarAbierto(true);
  };

  const handleConfirmarImportar = async () => {
    if (!rutaImportar) return;
    try {
      await importarBackup.mutateAsync({
        path: rutaImportar,
        password: passwordImportar || undefined,
      });
      setDialogoImportarAbierto(false);
      // Los usuarios y contraseñas pasan a ser los de la copia: nueva sesión
      toast.success('Copia restaurada. Inicia sesión con un usuario de la copia.');
      guardarTokenSesion(null);
      setTimeout(() => window.location.assign('/login'), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar la copia de seguridad');
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-primary" />
            Copias de seguridad
          </CardTitle>
          <CardDescription>
            Incluyen todos los datos de pacientes y toda la configuración (usuarios, correo,
            plantillas, apariencia...), así que se pueden restaurar en cualquier otro equipo.
            Si activas el cifrado, usa una contraseña que recuerdes: sin ella no podrás
            restaurar las copias cifradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Periodicidad</Label>
            <Select value={periodicidad} onValueChange={(v) => setPeriodicidad(v as typeof periodicidad)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diaria</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="desactivada">Desactivada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="backupCifrado"
                checked={cifradoActivo}
                onCheckedChange={(checked) => {
                  const activo = checked === true;
                  setCifradoActivo(activo);
                  if (activo && !config?.backupCifrado) {
                    setMostrarCamposPassword(true);
                  }
                  if (!activo) {
                    setMostrarCamposPassword(false);
                  }
                }}
              />
              <Label htmlFor="backupCifrado" className="cursor-pointer">
                Cifrar copias de seguridad
              </Label>
            </div>

            {cifradoActivo && config?.backupCifrado && !mostrarCamposPassword && (
              <Button variant="link" className="h-auto p-0" onClick={() => setMostrarCamposPassword(true)}>
                Cambiar contraseña
              </Button>
            )}

            {cifradoActivo && mostrarCamposPassword && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-1">
                <div className="space-y-2">
                  <Label htmlFor="backupPassword">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="backupPassword"
                      type={mostrarPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                    >
                      {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupPasswordConfirm">Confirmar contraseña</Label>
                  <Input
                    id="backupPasswordConfirm"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Guardar también en otra carpeta</Label>
            <p className="text-sm text-muted-foreground">
              Si el ordenador se estropea, las copias guardadas solo en él se pierden. Elige un disco
              externo, un USB o una carpeta sincronizada (OneDrive, Google Drive, Dropbox...).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-sm">{config?.backupCarpetaExtra ?? 'Ninguna'}</code>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleElegirCarpeta} disabled={actualizarConfig.isPending}>
                <FolderOpen className="h-4 w-4" />
                {config?.backupCarpetaExtra ? 'Cambiar' : 'Elegir carpeta'}
              </Button>
              {config?.backupCarpetaExtra && (
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleQuitarCarpeta} disabled={actualizarConfig.isPending}>
                  <X className="h-4 w-4" /> Quitar
                </Button>
              )}
            </div>
            {config?.backupUltimoError && (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {config.backupUltimoError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleGuardar} disabled={actualizarConfig.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              Guardar configuración
            </Button>
            <Button onClick={handleCrearAhora} disabled={crearAhora.isPending} variant="secondary" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Realizar copia ahora
            </Button>
            {esAdmin && (
              <Button onClick={handleElegirArchivo} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Restaurar una copia
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>Copias guardadas</CardTitle>
          <CardDescription>Copias almacenadas en este equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          {cargandoBackups ? (
            <div className="text-muted-foreground">Cargando...</div>
          ) : !backups || backups.length === 0 ? (
            <div className="text-muted-foreground text-sm">Todavía no hay ninguna copia de seguridad.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.nombre}>
                    <TableCell>{formatearFecha(backup.fecha)}</TableCell>
                    <TableCell>{formatearTamano(backup.tamanoBytes)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {esAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGuardarEn(backup.nombre)}
                            disabled={exportarBackup.isPending}
                            aria-label="Guardar en…"
                            title="Guardar en… (USB, otra carpeta)"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleBorrar(backup.nombre)}
                            disabled={borrarBackup.isPending}
                            aria-label="Borrar copia"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={dialogoImportarAbierto} onOpenChange={setDialogoImportarAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar copia de seguridad</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reemplazará <strong>todos los datos actuales</strong> de esta instalación
              (pacientes, citas, configuración) por los de la copia elegida. Antes de tocar
              nada se guarda automáticamente una copia de seguridad del estado actual, por si
              hace falta deshacerlo. Puede ser una copia de otro equipo. Al terminar tendrás
              que iniciar sesión con un usuario de la copia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="importPassword">Contraseña (solo si la copia está cifrada)</Label>
            <Input
              id="importPassword"
              type="password"
              value={passwordImportar}
              onChange={(e) => setPasswordImportar(e.target.value)}
              placeholder="Déjalo en blanco si no está cifrada"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importarBackup.isPending}>Cancelar</AlertDialogCancel>
            {/* Botón normal (no AlertDialogAction): necesitamos que el diálogo
                siga abierto si la restauración falla (p. ej. contraseña
                incorrecta), y AlertDialogAction se cierra siempre al pulsarlo. */}
            <Button
              variant="destructive"
              onClick={handleConfirmarImportar}
              disabled={importarBackup.isPending}
            >
              {importarBackup.isPending ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
