/**
 * Página pública para cancelar una cita
 * Se accede desde el enlace del email
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Calendar, Clock, Building2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useConfiguracion } from '@/hooks/useConfiguracion';

interface DatosCita {
  valido: boolean;
  error?: string;
  tipo?: string;
  cita?: {
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
    tipo: string;
    estado: string;
  };
  paciente?: {
    nombre: string;
  };
}

export default function CancelarCita() {
  const { token } = useParams<{ token: string }>();
  const { data: config } = useConfiguracion();
  const nombreFarmacia = config?.farmaciaNombre || 'Sistema de Gestión';
  
  const [estado, setEstado] = useState<'loading' | 'confirmando' | 'success' | 'error'>('loading');
  const [datos, setDatos] = useState<DatosCita | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar el token al cargar
  useEffect(() => {
    if (!token) {
      setEstado('error');
      setMensaje('Enlace no válido');
      return;
    }

    verificarToken();
  }, [token]);

  const verificarToken = async () => {
    try {
      const response = await api.get<DatosCita>(`/public/cita/verificar/${token}`);
      setDatos(response);
      
      if (!response.valido) {
        setEstado('error');
        setMensaje(response.error || 'Token no válido');
      } else {
        setEstado('confirmando');
      }
    } catch (error) {
      setEstado('error');
      setMensaje('Error al verificar el enlace');
    }
  };

  const cancelarCita = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; message: string }>(`/public/cita/cancelar/${token}`, {
        motivo: motivo || undefined,
      });
      
      if (response.success) {
        setEstado('success');
        setMensaje(response.message);
      } else {
        setMensaje('Error al cancelar la cita');
      }
    } catch (error) {
      setMensaje('Error al cancelar la cita');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{nombreFarmacia}</p>
        </div>

        <Card className="shadow-lg">
          {/* Loading */}
          {estado === 'loading' && (
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando...</p>
            </CardContent>
          )}

          {/* Confirmar cancelación */}
          {estado === 'confirmando' && datos?.cita && (
            <>
              <CardHeader className="text-center border-b bg-red-50">
                <CardTitle className="text-xl flex items-center justify-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Cancelar Cita
                </CardTitle>
                <CardDescription>
                  ¿Estás seguro de que deseas cancelar esta cita?
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Datos de la cita */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-sm text-muted-foreground">Cita a cancelar:</p>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{formatearFecha(datos.cita.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{datos.cita.hora}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paciente: {datos.paciente?.nombre}
                  </p>
                </div>

                {/* Motivo (opcional) */}
                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo de cancelación (opcional)</Label>
                  <Textarea
                    id="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Cuéntanos por qué cancelas la cita..."
                    className="min-h-[80px]"
                  />
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta acción no se puede deshacer. Si deseas reagendar, usa la opción "Modificar cita" en su lugar.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <Link to="/solicitar-cita">No cancelar</Link>
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={cancelarCita}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Sí, cancelar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Success */}
          {estado === 'success' && (
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Cita Cancelada</h3>
              <p className="text-muted-foreground mb-6">{mensaje}</p>
              <p className="text-sm text-muted-foreground mb-6">
                Recibirás un email de confirmación de la cancelación.
              </p>
              <Button asChild>
                <Link to="/solicitar-cita">Solicitar nueva cita</Link>
              </Button>
            </CardContent>
          )}

          {/* Error */}
          {estado === 'error' && (
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground mb-6">{mensaje}</p>
              <Button variant="outline" asChild>
                <Link to="/solicitar-cita">Solicitar nueva cita</Link>
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} {nombreFarmacia}
        </p>
      </div>
    </div>
  );
}
