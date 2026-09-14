import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { obtenerDatosModificacion, modificarCitaToken, useDisponibilidad, type DatosModificacion, useFarmaciaPublica } from '@/hooks/useBooking';

function hoyISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().split('T')[0];
}

export default function ModificarCita() {
  const { token } = useParams<{ token: string }>();
  const { data: farmacia } = useFarmaciaPublica();
  const nombreFarmacia = farmacia?.nombre || 'Reserva de citas';

  const [estado, setEstado] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [datos, setDatos] = useState<DatosModificacion | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: disponibilidad, isLoading: cargandoDisponibilidad } = useDisponibilidad(datos?.cita?.tipo || null, fecha || null);

  useEffect(() => {
    if (!token) {
      setEstado('error');
      setMensaje('Enlace no válido');
      return;
    }
    obtenerDatosModificacion(token)
      .then((response) => {
        setDatos(response);
        if (!response.valido) {
          setEstado('error');
          setMensaje(response.error || 'Token no válido');
        } else {
          setFecha(response.cita?.fecha || '');
          setEstado('form');
        }
      })
      .catch(() => {
        setEstado('error');
        setMensaje('Error al verificar el enlace');
      });
  }, [token]);

  const enviar = async () => {
    if (!token || !fecha || !hora) return;
    setIsSubmitting(true);
    try {
      const response = await modificarCitaToken(token, fecha, hora);
      if (response.success) {
        setEstado('success');
        setMensaje(response.message);
      } else {
        setMensaje(response.error || 'Error al modificar la cita');
      }
    } catch (error) {
      const err = error as { data?: { error?: string } };
      setMensaje(err.data?.error || 'Error al modificar la cita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const horasDisponibles = disponibilidad?.horasDisponibles || [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{nombreFarmacia}</p>
        </div>

        <Card className="shadow-lg">
          {estado === 'loading' && (
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando...</p>
            </CardContent>
          )}

          {estado === 'form' && datos?.cita && (
            <>
              <CardHeader className="text-center border-b">
                <CardTitle className="text-xl">Modificar Cita</CardTitle>
                <CardDescription>Hola {datos.paciente?.nombre}, elige una nueva fecha y hora</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {mensaje && (
                  <Alert variant="destructive">
                    <AlertDescription>{mensaje}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fecha">Nueva fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    min={hoyISO()}
                    max={hoyISO(60)}
                    onChange={(e) => {
                      setFecha(e.target.value);
                      setHora('');
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nueva hora</Label>
                  {cargandoDisponibilidad ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : horasDisponibles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay horas disponibles para esta fecha.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {horasDisponibles.map((h) => (
                        <button
                          key={h}
                          onClick={() => setHora(h)}
                          className={`p-2 rounded-lg border-2 text-sm transition-all ${hora === h ? 'border-primary bg-accent font-semibold' : 'border-border hover:border-muted-foreground/40'}`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button className="w-full" size="lg" onClick={enviar} disabled={!fecha || !hora || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </Button>
              </CardContent>
            </>
          )}

          {estado === 'success' && (
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Cita Modificada</h3>
              <p className="text-muted-foreground mb-6">{mensaje}</p>
              <p className="text-sm text-muted-foreground">Recibirás un nuevo email con los enlaces de confirmar/cancelar para la nueva fecha.</p>
            </CardContent>
          )}

          {estado === 'error' && (
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground mb-6">{mensaje}</p>
              <Button variant="outline" asChild>
                <Link to="/">Solicitar nueva cita</Link>
              </Button>
            </CardContent>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} {nombreFarmacia}
        </p>
      </div>
    </div>
  );
}
