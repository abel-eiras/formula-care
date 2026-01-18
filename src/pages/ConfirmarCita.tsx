/**
 * Página pública para confirmar asistencia a una cita
 * Se accede desde el enlace del email
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Calendar, Clock, Building2 } from 'lucide-react';
import { api } from '@/lib/api';

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

export default function ConfirmarCita() {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<'loading' | 'confirmando' | 'success' | 'error'>('loading');
  const [datos, setDatos] = useState<DatosCita | null>(null);
  const [mensaje, setMensaje] = useState('');

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

  const confirmarAsistencia = async () => {
    setEstado('loading');
    try {
      const response = await api.post<{ success: boolean; message: string }>(`/public/cita/confirmar/${token}`, {});
      
      if (response.success) {
        setEstado('success');
        setMensaje(response.message);
      } else {
        setEstado('error');
        setMensaje('Error al confirmar la cita');
      }
    } catch (error) {
      setEstado('error');
      setMensaje('Error al confirmar la cita');
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
          <p className="text-sm text-muted-foreground">Farmacia Pontevea</p>
        </div>

        <Card className="shadow-lg">
          {/* Loading */}
          {estado === 'loading' && (
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Procesando...</p>
            </CardContent>
          )}

          {/* Confirmar */}
          {estado === 'confirmando' && datos?.cita && (
            <>
              <CardHeader className="text-center border-b">
                <CardTitle className="text-xl">Confirmar Asistencia</CardTitle>
                <CardDescription>
                  Hola {datos.paciente?.nombre}, confirma tu asistencia a la cita
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{formatearFecha(datos.cita.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{datos.cita.hora}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Servicio: {datos.cita.tipo}
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={confirmarAsistencia}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirmar mi asistencia
                </Button>
              </CardContent>
            </>
          )}

          {/* Success */}
          {estado === 'success' && (
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Asistencia Confirmada</h3>
              <p className="text-muted-foreground mb-6">{mensaje}</p>
              {datos?.cita && (
                <Alert className="text-left mb-6">
                  <AlertDescription>
                    <p><strong>Fecha:</strong> {formatearFecha(datos.cita.fecha)}</p>
                    <p><strong>Hora:</strong> {datos.cita.hora}</p>
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Te esperamos. Recuerda llegar con unos minutos de antelación.
              </p>
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
          © {new Date().getFullYear()} Farmacia Pontevea
        </p>
      </div>
    </div>
  );
}
