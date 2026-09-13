import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Clock, User, Mail, Phone, MessageSquare, Loader2, AlertTriangle, MessageCircle } from 'lucide-react';
import { useDisponibilidad, useSolicitarCita, useFarmaciaPublica, useEventosPublicos } from '@/hooks/useBooking';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

const RECAPTCHA_ACTION = 'solicitar_cita';

function hoyISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().split('T')[0];
}

function formatearFechaLarga(fechaISO: string): string {
  const f = new Date(fechaISO + 'T00:00:00');
  return f.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SolicitarCita() {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [tipoServicio, setTipoServicio] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string>('');
  const [hora, setHora] = useState('');
  const [datosCliente, setDatosCliente] = useState({ nombre: '', email: '', telefono: '', notas: '' });
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [resultado, setResultado] = useState<{ estado: 'pendiente' | 'aprobada'; mensaje: string } | null>(null);

  const { data: farmacia, isLoading: cargandoFarmacia, error: errorFarmacia } = useFarmaciaPublica();
  const { data: eventosActivos = [] } = useEventosPublicos();

  const tipoParaDisponibilidad = tipoServicio?.startsWith('evento:') ? 'evento' : tipoServicio;
  const eventoIdParaDisponibilidad = tipoServicio?.startsWith('evento:') ? tipoServicio.split(':')[1] : null;

  const { data: disponibilidad, isLoading: cargandoDisponibilidad } = useDisponibilidad(
    tipoParaDisponibilidad,
    fecha || null,
    eventoIdParaDisponibilidad
  );

  useEffect(() => {
    if (!farmacia?.recaptchaSiteKey) return;
    if (document.querySelector('script[src*="recaptcha/enterprise"]')) return;
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${farmacia.recaptchaSiteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [farmacia?.recaptchaSiteKey]);

  const solicitarCita = useSolicitarCita();
  const horasDisponibles = disponibilidad?.horasDisponibles || [];

  const tiposServicioDisponibles = [
    { value: 'dermo', label: 'Dermocosmética' },
    { value: 'bio', label: 'Análisis Bioquímico' },
    ...eventosActivos.map((evento) => ({ value: `evento:${evento.id}`, label: evento.nombre, evento })),
  ];

  const puedeAvanzarPaso1 = tipoServicio !== null;
  const puedeAvanzarPaso2 = fecha !== '';
  const puedeAvanzarPaso3 = hora !== '';
  const puedeAvanzarPaso4 =
    datosCliente.nombre.trim() !== '' && datosCliente.email.trim() !== '' && datosCliente.telefono.trim() !== '' && aceptaPrivacidad;

  const handleEnviarSolicitud = async () => {
    if (!tipoServicio || !fecha || !hora) return;

    try {
      const tipoFinal = tipoServicio.startsWith('evento:') ? 'evento' : tipoServicio;
      const eventoIdFinal = tipoServicio.startsWith('evento:') ? tipoServicio.split(':')[1] : undefined;

      let captchaToken: string | undefined;
      if (farmacia?.recaptchaSiteKey && window.grecaptcha?.enterprise) {
        captchaToken = await new Promise<string | undefined>((resolve) => {
          window.grecaptcha!.enterprise!.ready(async () => {
            try {
              const token = await window.grecaptcha!.enterprise!.execute(farmacia.recaptchaSiteKey!, { action: RECAPTCHA_ACTION });
              resolve(token || undefined);
            } catch {
              resolve(undefined);
            }
          });
        });
      }

      const res = await solicitarCita.mutateAsync({
        nombreCliente: datosCliente.nombre,
        emailCliente: datosCliente.email,
        telefonoCliente: datosCliente.telefono,
        tipo: tipoFinal as 'dermo' | 'bio' | 'evento',
        fecha,
        hora,
        notas: datosCliente.notas || undefined,
        eventoId: eventoIdFinal,
        captchaToken,
      });

      setResultado({ estado: res.estado === 'aprobada' ? 'aprobada' : 'pendiente', mensaje: res.mensaje });
      setPaso(5);

      if (res.estado === 'aprobada') {
        toast.success('¡Cita confirmada!', { description: 'Tu solicitud ha sido aprobada automáticamente. Revisa tu email.' });
      } else {
        toast.success('Solicitud enviada', { description: 'Te contactaremos pronto para confirmar tu cita.' });
      }
    } catch (error: unknown) {
      const err = error as { data?: { codigo?: string; error?: string }; message?: string };
      const codigo = err.data?.codigo;
      const mensaje = err.data?.error || err.message;
      if (codigo === 'CAPTCHA_REQUERIDO' || codigo === 'CAPTCHA_INVALIDO') {
        toast.error('Verificación de seguridad', { description: mensaje || 'La verificación de seguridad ha fallado. Inténtalo de nuevo.' });
      } else {
        toast.error('Error al enviar solicitud', { description: mensaje || 'Por favor, intenta de nuevo.' });
      }
    }
  };

  const handleResetear = () => {
    setPaso(1);
    setTipoServicio(null);
    setFecha('');
    setHora('');
    setDatosCliente({ nombre: '', email: '', telefono: '', notas: '' });
    setAceptaPrivacidad(false);
    setResultado(null);
  };

  if (cargandoFarmacia) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (errorFarmacia || !farmacia) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No disponible</h2>
              <p className="text-muted-foreground">No hemos podido cargar los datos de reserva. Inténtalo más tarde.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const color = farmacia.colorPrimario || '#79438f';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 bg-card rounded-lg shadow-sm p-6 border">
          {farmacia.logo && (
            <div className="mb-4 flex justify-center">
              <img src={farmacia.logo} alt={farmacia.nombre || 'Logo'} className="h-20 sm:h-24 object-contain max-w-full" />
            </div>
          )}
          {farmacia.nombre && <h2 className="text-xl font-bold mb-2">{farmacia.nombre}</h2>}
          <div className="text-sm text-muted-foreground space-y-1">
            {farmacia.direccion && <p>{farmacia.direccion}</p>}
            {farmacia.ciudad && <p>{farmacia.ciudad}</p>}
            {farmacia.telefono && <p>Tel: {farmacia.telefono}</p>}
            {farmacia.email && <p>Email: {farmacia.email}</p>}
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Solicitar Cita</h1>
          <p className="text-muted-foreground text-lg">Completa el formulario para solicitar tu cita</p>
        </div>

        {paso !== 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors text-white',
                      paso >= num ? '' : 'bg-muted text-muted-foreground'
                    )}
                    style={paso >= num ? { backgroundColor: color } : undefined}
                  >
                    {num}
                  </div>
                  {num < 4 && <div className={cn('w-8 sm:w-16 h-1 mx-1', paso > num ? '' : 'bg-muted')} style={paso > num ? { backgroundColor: color } : undefined} />}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4 space-x-8 sm:space-x-16 text-xs sm:text-sm text-muted-foreground">
              <span style={paso >= 1 ? { color, fontWeight: 600 } : undefined}>Servicio</span>
              <span style={paso >= 2 ? { color, fontWeight: 600 } : undefined}>Fecha</span>
              <span style={paso >= 3 ? { color, fontWeight: 600 } : undefined}>Hora</span>
              <span style={paso >= 4 ? { color, fontWeight: 600 } : undefined}>Datos</span>
            </div>
          </div>
        )}

        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-8">
            {paso === 5 && resultado ? (
              <div className="text-center py-8">
                <div className="mb-6">
                  {resultado.estado === 'aprobada' ? (
                    <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  ) : (
                    <Clock className="w-20 h-20 mx-auto mb-4" style={{ color }} />
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-4">{resultado.estado === 'aprobada' ? '¡Cita Confirmada!' : 'Solicitud Enviada'}</h2>
                <p className="text-muted-foreground mb-6 text-lg">{resultado.mensaje}</p>
                {resultado.estado === 'aprobada' && (
                  <Alert className="mb-6 bg-green-50 border-green-200 text-left">
                    <AlertDescription className="text-green-800">
                      <strong>Fecha:</strong> {formatearFechaLarga(fecha)}
                      <br />
                      <strong>Hora:</strong> {hora}
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={handleResetear} variant="outline" size="lg">
                  Solicitar Otra Cita
                </Button>
              </div>
            ) : (
              <>
                {paso === 1 && (
                  <div className="space-y-6">
                    <Label className="text-lg font-semibold mb-4 block">Selecciona el tipo de servicio</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {tiposServicioDisponibles.map((tipo) => {
                        const esEvento = 'evento' in tipo;
                        const evento = esEvento ? tipo.evento : null;
                        return (
                          <button
                            key={tipo.value}
                            onClick={() => setTipoServicio(tipo.value)}
                            className={cn('p-6 rounded-lg border-2 text-left transition-all hover:shadow-md', tipoServicio === tipo.value ? 'bg-accent' : 'border-border hover:border-muted-foreground/40')}
                            style={tipoServicio === tipo.value ? { borderColor: color } : undefined}
                          >
                            <div className="font-semibold mb-2">{tipo.label}</div>
                            {evento && (
                              <>
                                {evento.descripcion && <div className="text-sm text-muted-foreground mb-2">{evento.descripcion}</div>}
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {evento.fechas.length > 0 && <p>Fechas: {evento.fechas.join(', ')}</p>}
                                  {evento.horas.length > 0 && <p>Horarios: {evento.horas.join(', ')}</p>}
                                </div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setPaso(2)} disabled={!puedeAvanzarPaso1} style={{ backgroundColor: color }}>
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {paso === 2 && (
                  <div className="space-y-6">
                    <Label htmlFor="fecha" className="text-lg font-semibold mb-4 block">
                      Selecciona una fecha
                    </Label>
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
                      className="max-w-xs mx-auto"
                    />
                    {fecha && <p className="text-center text-muted-foreground">{formatearFechaLarga(fecha)}</p>}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setPaso(1)}>
                        Atrás
                      </Button>
                      <Button onClick={() => setPaso(3)} disabled={!puedeAvanzarPaso2} style={{ backgroundColor: color }}>
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {paso === 3 && (
                  <div className="space-y-6">
                    <Label className="text-lg font-semibold mb-4 block">Selecciona una hora disponible</Label>
                    {cargandoDisponibilidad ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
                      </div>
                    ) : horasDisponibles.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No hay horas disponibles para esta fecha. Prueba otra fecha o contacta con la farmacia.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {horasDisponibles.map((h) => (
                          <button
                            key={h}
                            onClick={() => setHora(h)}
                            className={cn('p-3 rounded-lg border-2 transition-all hover:shadow-md', hora === h ? 'bg-accent font-semibold' : 'border-border hover:border-muted-foreground/40')}
                            style={hora === h ? { borderColor: color } : undefined}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setPaso(2)}>
                        Atrás
                      </Button>
                      <Button onClick={() => setPaso(4)} disabled={!puedeAvanzarPaso3} style={{ backgroundColor: color }}>
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {paso === 4 && (
                  <div className="space-y-6">
                    <Label className="text-lg font-semibold mb-4 block">Completa tus datos</Label>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nombre" className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" /> Nombre completo *
                        </Label>
                        <Input id="nombre" value={datosCliente.nombre} onChange={(e) => setDatosCliente({ ...datosCliente, nombre: e.target.value })} placeholder="Tu nombre completo" />
                      </div>
                      <div>
                        <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4" /> Email *
                        </Label>
                        <Input id="email" type="email" value={datosCliente.email} onChange={(e) => setDatosCliente({ ...datosCliente, email: e.target.value })} placeholder="tu@email.com" />
                      </div>
                      <div>
                        <Label htmlFor="telefono" className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4" /> Teléfono *
                        </Label>
                        <Input id="telefono" type="tel" value={datosCliente.telefono} onChange={(e) => setDatosCliente({ ...datosCliente, telefono: e.target.value })} placeholder="600 000 000" />
                      </div>
                      <div>
                        <Label htmlFor="notas" className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4" /> Notas (opcional)
                        </Label>
                        <Textarea id="notas" value={datosCliente.notas} onChange={(e) => setDatosCliente({ ...datosCliente, notas: e.target.value })} placeholder="Información adicional..." rows={4} />
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
                        <Checkbox id="privacidad" checked={aceptaPrivacidad} onCheckedChange={(c) => setAceptaPrivacidad(c === true)} className="mt-0.5" />
                        <Label htmlFor="privacidad" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                          He leído y acepto la{' '}
                          <Link to="/legal/privacidad" target="_blank" className="font-medium hover:underline" style={{ color }}>
                            Política de Privacidad
                          </Link>{' '}
                          y consiento el tratamiento de mis datos personales para la gestión de esta solicitud de cita. *
                        </Label>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Resumen de tu solicitud</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <strong>Servicio:</strong> {tiposServicioDisponibles.find((t) => t.value === tipoServicio)?.label || ''}
                        </p>
                        <p>
                          <strong>Fecha:</strong> {fecha && formatearFechaLarga(fecha)}
                        </p>
                        <p>
                          <strong>Hora:</strong> {hora}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setPaso(3)}>
                        Atrás
                      </Button>
                      <Button onClick={handleEnviarSolicitud} disabled={!puedeAvanzarPaso4 || solicitarCita.isPending} style={{ backgroundColor: color }}>
                        {solicitarCita.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                          </>
                        ) : (
                          'Enviar Solicitud'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {farmacia.whatsapp && (
          <div className="mt-6 text-center">
            <Button
              onClick={() => window.open(`https://wa.me/${farmacia.whatsapp!.replace(/\D/g, '')}`, '_blank')}
              variant="outline"
              className="bg-green-500 hover:bg-green-600 text-white border-green-500"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Contacta con nosotros por WhatsApp
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
