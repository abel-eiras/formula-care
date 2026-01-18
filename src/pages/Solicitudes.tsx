/**
 * Página de Gestión de Solicitudes de Citas
 * Permite aprobar o rechazar solicitudes pendientes
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSolicitudes, useAprobarSolicitud, useRechazarSolicitud } from '@/hooks/useSolicitudes';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  Filter,
} from 'lucide-react';

type EstadoFiltro = 'todos' | 'pendiente' | 'aprobada' | 'rechazada';

export default function Solicitudes() {
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('pendiente');
  const [dialogoRechazo, setDialogoRechazo] = useState(false);
  const [solicitudRechazar, setSolicitudRechazar] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [solicitudProcesando, setSolicitudProcesando] = useState<string | null>(null);

  // Queries y mutations
  const { data: solicitudes, isLoading, error } = useSolicitudes(
    filtroEstado === 'todos' ? undefined : filtroEstado
  );
  const aprobarMutation = useAprobarSolicitud();
  const rechazarMutation = useRechazarSolicitud();

  // Aprobar solicitud
  const handleAprobar = async (id: string) => {
    setSolicitudProcesando(id);
    try {
      await aprobarMutation.mutateAsync(id);
      toast.success('Solicitud aprobada. Se ha enviado email de confirmación al cliente.');
    } catch {
      toast.error('Error al aprobar la solicitud');
    } finally {
      setSolicitudProcesando(null);
    }
  };

  // Rechazar solicitud
  const handleRechazar = async () => {
    if (!solicitudRechazar) return;

    try {
      await rechazarMutation.mutateAsync({
        id: solicitudRechazar,
        motivo: motivoRechazo || undefined,
      });
      toast.success('Solicitud rechazada. Se ha enviado email al cliente.');
      setDialogoRechazo(false);
      setSolicitudRechazar(null);
      setMotivoRechazo('');
    } catch {
      toast.error('Error al rechazar la solicitud');
    }
  };

  // Abrir diálogo de rechazo
  const abrirDialogoRechazo = (id: string) => {
    setSolicitudRechazar(id);
    setMotivoRechazo('');
    setDialogoRechazo(true);
  };

  // Obtener badge de estado
  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="mr-1 h-3 w-3" />Aprobada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="mr-1 h-3 w-3" />Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Obtener badge de tipo
  const getBadgeTipo = (tipo: string) => {
    if (tipo.startsWith('evento:')) {
      return <Badge className="bg-purple-100 text-purple-800">Evento</Badge>;
    }
    switch (tipo) {
      case 'dermo':
        return <Badge className="bg-pink-100 text-pink-800">Dermocosmética</Badge>;
      case 'bio':
        return <Badge className="bg-blue-100 text-blue-800">Bioquímica</Badge>;
      default:
        return <Badge>{tipo}</Badge>;
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return fecha;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error al cargar las solicitudes</AlertDescription>
        </Alert>
      </div>
    );
  }

  const solicitudesPendientes = solicitudes?.filter(s => s.estado === 'pendiente').length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Solicitudes de Citas</h1>
          <p className="text-muted-foreground">
            Gestiona las solicitudes recibidas desde la página pública
            {solicitudesPendientes > 0 && (
              <Badge variant="destructive" className="ml-2">
                {solicitudesPendientes} pendiente{solicitudesPendientes > 1 ? 's' : ''}
              </Badge>
            )}
          </p>
        </div>

        {/* Filtro de estado */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoFiltro)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="aprobada">Aprobadas</SelectItem>
              <SelectItem value="rechazada">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitudes</CardTitle>
          <CardDescription>
            {solicitudes?.length || 0} solicitud(es) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {solicitudes && solicitudes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{solicitud.nombreCliente}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {solicitud.emailCliente}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {solicitud.telefonoCliente}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getBadgeTipo(solicitud.tipo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium capitalize">{formatearFecha(solicitud.fecha)}</p>
                          <p className="text-sm text-muted-foreground">{solicitud.hora}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getBadgeEstado(solicitud.estado)}</TableCell>
                    <TableCell>
                      {solicitud.notas ? (
                        <div className="flex items-start gap-1 max-w-[200px]">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-sm truncate" title={solicitud.notas}>
                            {solicitud.notas}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {solicitud.estado === 'pendiente' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAprobar(solicitud.id)}
                            disabled={solicitudProcesando !== null}
                          >
                            {solicitudProcesando === solicitud.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-1 h-4 w-4" />
                            )}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => abrirDialogoRechazo(solicitud.id)}
                            disabled={solicitudProcesando !== null}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                      {solicitud.estado === 'aprobada' && solicitud.cita && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/calendario?fecha=${solicitud.fecha}`}
                        >
                          Ver en calendario
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No hay solicitudes {filtroEstado !== 'todos' ? filtroEstado + 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de rechazo */}
      <Dialog open={dialogoRechazo} onOpenChange={setDialogoRechazo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              Opcionalmente, indica el motivo del rechazo. Se enviará al cliente por email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Motivo del rechazo (opcional)"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogoRechazo(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={rechazarMutation.isPending}
            >
              {rechazarMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Rechazar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
