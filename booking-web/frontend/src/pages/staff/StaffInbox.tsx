import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, X, Mail, Phone, Calendar, Clock } from 'lucide-react';
import { useAprobarSolicitud, useRechazarSolicitud, useSolicitudes, type SolicitudCita } from '@/hooks/useStaff';
import { toast } from '@/components/ui/sonner';

const ESTADOS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'rechazada', label: 'Rechazadas' },
];

function formatearFecha(fecha: string): string {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function SolicitudCard({ solicitud }: { solicitud: SolicitudCita }) {
  const [motivo, setMotivo] = useState('');
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();

  const handleAprobar = async () => {
    try {
      await aprobar.mutateAsync(solicitud.id);
      toast.success('Solicitud aprobada', { description: 'Se ha creado la cita y enviado el email de confirmación.' });
    } catch (error) {
      const err = error as { data?: { error?: string } };
      toast.error('No se pudo aprobar', { description: err.data?.error });
    }
  };

  const handleRechazar = async () => {
    try {
      await rechazar.mutateAsync({ id: solicitud.id, motivo: motivo || undefined });
      toast.success('Solicitud rechazada', { description: 'Se ha enviado un email al cliente.' });
    } catch (error) {
      const err = error as { data?: { error?: string } };
      toast.error('No se pudo rechazar', { description: err.data?.error });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{solicitud.nombreCliente}</p>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {solicitud.emailCliente}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {solicitud.telefonoCliente}
              </span>
            </div>
          </div>
          <Badge variant={solicitud.estado === 'pendiente' ? 'outline' : solicitud.estado === 'aprobada' ? 'default' : 'destructive'}>{solicitud.estado}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {formatearFecha(solicitud.fecha)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {solicitud.hora}
          </span>
          <span className="text-muted-foreground">Servicio: {solicitud.tipo}</span>
        </div>

        {solicitud.notas && <p className="text-sm text-muted-foreground border-l-2 pl-2">{solicitud.notas}</p>}
        {solicitud.motivoRechazo && (
          <p className="text-sm text-destructive border-l-2 border-destructive pl-2">Motivo de rechazo: {solicitud.motivoRechazo}</p>
        )}

        {solicitud.estado === 'pendiente' && (
          <div className="pt-2 space-y-2">
            {mostrarRechazo && (
              <Textarea placeholder="Motivo del rechazo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="text-sm" />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAprobar} disabled={aprobar.isPending || rechazar.isPending} className="gap-1">
                {aprobar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprobar
              </Button>
              {!mostrarRechazo ? (
                <Button size="sm" variant="outline" onClick={() => setMostrarRechazo(true)}>
                  Rechazar
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={handleRechazar} disabled={rechazar.isPending} className="gap-1">
                  {rechazar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Confirmar rechazo
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StaffInbox() {
  const [estado, setEstado] = useState('pendiente');
  const { data: solicitudes, isLoading } = useSolicitudes(estado);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {ESTADOS.map((e) => (
          <Button key={e.value} size="sm" variant={estado === e.value ? 'default' : 'outline'} onClick={() => setEstado(e.value)}>
            {e.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !solicitudes || solicitudes.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No hay solicitudes en este estado.</p>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <SolicitudCard key={s.id} solicitud={s} />
          ))}
        </div>
      )}
    </div>
  );
}
