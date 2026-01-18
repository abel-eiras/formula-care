/**
 * Página pública para modificar una cita
 * Se accede desde el enlace del email
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Calendar as CalendarIcon, Clock, Building2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useConfiguracion } from '@/hooks/useConfiguracion';

interface DatosModificacion {
  valido: boolean;
  error?: string;
  cita?: {
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
    tipo: string;
  };
  paciente?: {
    nombre: string;
  };
}

// Horas disponibles (simplificado)
const HORAS_DISPONIBLES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00',
];

export default function ModificarCita() {
  const { token } = useParams<{ token: string }>();
  const { data: config } = useConfiguracion();
  const nombreFarmacia = config?.farmaciaNombre || 'Sistema de Gestión';
  
  const [estado, setEstado] = useState<'loading' | 'modificando' | 'success' | 'error'>('loading');
  const [datos, setDatos] = useState<DatosModificacion | null>(null);
  const [mensaje, setMensaje] = useState('');
  
  // Estado del formulario
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('');
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
      const response = await api.get<DatosModificacion>(`/public/cita/modificar/${token}`);
      setDatos(response);
      
      if (!response.valido) {
        setEstado('error');
        setMensaje(response.error || 'Token no válido');
      } else {
        setEstado('modificando');
        // Establecer valores actuales
        if (response.cita) {
          setFechaSeleccionada(new Date(response.cita.fecha));
          setHoraSeleccionada(response.cita.hora);
        }
      }
    } catch (error) {
      setEstado('error');
      setMensaje('Error al verificar el enlace');
    }
  };

  const modificarCita = async () => {
    if (!fechaSeleccionada || !horaSeleccionada) {
      setMensaje('Por favor, selecciona fecha y hora');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; message: string }>(`/public/cita/modificar/${token}`, {
        fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
        hora: horaSeleccionada,
      });
      
      if (response.success) {
        setEstado('success');
        setMensaje(response.message);
      } else {
        setMensaje('Error al modificar la cita');
      }
    } catch (error) {
      setMensaje('Error al modificar la cita');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha: string | Date) => {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
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

          {/* Modificar */}
          {estado === 'modificando' && datos?.cita && (
            <>
              <CardHeader className="text-center border-b">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  <Pencil className="h-5 w-5" />
                  Modificar Cita
                </CardTitle>
                <CardDescription>
                  Hola {datos.paciente?.nombre}, selecciona la nueva fecha y hora
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Cita actual */}
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold mb-1">Cita actual:</p>
                    <p>📅 {formatearFecha(datos.cita.fecha)}</p>
                    <p>🕐 {datos.cita.hora}</p>
                  </AlertDescription>
                </Alert>

                {/* Nueva fecha */}
                <div className="space-y-2">
                  <Label>Nueva fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaSeleccionada && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaSeleccionada 
                          ? format(fechaSeleccionada, "PPP", { locale: es })
                          : "Selecciona una fecha"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaSeleccionada}
                        onSelect={setFechaSeleccionada}
                        disabled={(date) => date < new Date()}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Nueva hora */}
                <div className="space-y-2">
                  <Label>Nueva hora</Label>
                  <Select value={horaSeleccionada} onValueChange={setHoraSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {HORAS_DISPONIBLES.map((hora) => (
                        <SelectItem key={hora} value={hora}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {hora}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {mensaje && (
                  <Alert variant="destructive">
                    <AlertDescription>{mensaje}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={modificarCita}
                  disabled={isSubmitting || !fechaSeleccionada || !horaSeleccionada}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Modificando...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-5 w-5 mr-2" />
                      Confirmar cambios
                    </>
                  )}
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
              <h3 className="text-xl font-semibold mb-2">Cita Modificada</h3>
              <p className="text-muted-foreground mb-6">{mensaje}</p>
              {fechaSeleccionada && (
                <Alert className="text-left mb-6">
                  <AlertDescription>
                    <p><strong>Nueva fecha:</strong> {formatearFecha(fechaSeleccionada)}</p>
                    <p><strong>Nueva hora:</strong> {horaSeleccionada}</p>
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Recibirás un email de confirmación con los nuevos datos.
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
          © {new Date().getFullYear()} {nombreFarmacia}
        </p>
      </div>
    </div>
  );
}
