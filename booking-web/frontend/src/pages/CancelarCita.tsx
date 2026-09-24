import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarX2, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { solicitarCancelacion, useReserva } from '@/hooks/useBooking';
import { aplicarColorPrimario } from '@/lib/color';

/**
 * Enlace "cancelar mi cita" de los emails. Este servidor no conoce las citas
 * (están en la app de la farmacia): se registra la petición y la farmacia la
 * aplica en su próxima sincronización y envía la confirmación por email.
 */
export default function CancelarCita() {
  const { token = '' } = useParams<{ token: string }>();
  const { data: reserva } = useReserva();
  const [estado, setEstado] = useState<'preguntando' | 'enviando' | 'hecho' | 'error'>('preguntando');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    if (reserva) aplicarColorPrimario(reserva.farmacia.colorPrimario);
  }, [reserva]);

  const cancelar = async () => {
    setEstado('enviando');
    try {
      await solicitarCancelacion(token);
      setEstado('hecho');
    } catch (e) {
      setMensajeError(e instanceof Error ? e.message : 'Inténtalo de nuevo');
      setEstado('error');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <Card className="max-w-md mx-auto shadow-lg">
        <CardContent className="p-8 text-center space-y-4">
          {reserva?.farmacia.nombre && <p className="text-sm text-muted-foreground">{reserva.farmacia.nombre}</p>}

          {estado === 'hecho' ? (
            <>
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <h1 className="text-xl font-bold">Hemos recibido tu cancelación</h1>
              <p className="text-muted-foreground">
                La farmacia la aplicará en unos minutos y te enviará un email de confirmación.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Pedir otra cita</Link>
              </Button>
            </>
          ) : (
            <>
              <CalendarX2 className="w-14 h-14 text-primary mx-auto" />
              <h1 className="text-xl font-bold">¿Cancelar tu cita?</h1>
              <p className="text-muted-foreground">
                Si no puedes venir, cancélala para que otra persona pueda aprovechar el hueco.
              </p>
              {estado === 'error' && (
                <Alert>
                  <AlertDescription>{mensajeError}</AlertDescription>
                </Alert>
              )}
              <Button onClick={cancelar} disabled={estado === 'enviando'} className="w-full">
                {estado === 'enviando' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, cancelar mi cita'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/">No, volver</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
