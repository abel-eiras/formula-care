import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, Calendar as CalendarIcon, User, Mail, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDisponibilidad, useSolicitarCita } from '@/hooks/useSolicitudes';
import { useEventosActivos } from '@/hooks/useEventos';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import type { Evento } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

export default function SolicitarCita() {
  // Estados del formulario
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [tipoServicio, setTipoServicio] = useState<string | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('');
  const [datosCliente, setDatosCliente] = useState({
    nombre: '',
    email: '',
    telefono: '',
    notas: '',
  });
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [resultadoSolicitud, setResultadoSolicitud] = useState<{
    estado: 'pendiente' | 'aprobada';
    mensaje: string;
  } | null>(null);

  // Hook para obtener eventos activos y configuración de farmacia
  const { data: eventosActivos = [] } = useEventosActivos();
  const { data: configFarmacia } = useConfiguracion();

  // Determinar tipo y eventoId para disponibilidad
  const tipoParaDisponibilidad = tipoServicio?.startsWith('evento:') ? 'evento' : tipoServicio;
  const eventoIdParaDisponibilidad = tipoServicio?.startsWith('evento:') 
    ? tipoServicio.split(':')[1] 
    : null;

  // Hook para obtener disponibilidad
  const fechaString = fechaSeleccionada ? format(fechaSeleccionada, 'yyyy-MM-dd') : null;
  const { data: disponibilidad, isLoading: cargandoDisponibilidad, refetch: refetchDisponibilidad } = useDisponibilidad(
    tipoParaDisponibilidad,
    fechaString,
    eventoIdParaDisponibilidad
  );

  // Recargar disponibilidad cuando cambia la fecha o el tipo de servicio
  useEffect(() => {
    if (fechaSeleccionada && tipoParaDisponibilidad) {
      refetchDisponibilidad();
      // Resetear hora seleccionada si cambia la fecha
      setHoraSeleccionada('');
    }
  }, [fechaSeleccionada, tipoParaDisponibilidad, refetchDisponibilidad]);

  // Hook para crear solicitud
  const solicitarCita = useSolicitarCita();

  // Obtener horas disponibles
  const horasDisponibles = disponibilidad?.horasDisponibles || [];

  // Construir lista de tipos de servicio: dermo, bio, y eventos activos
  const tiposServicioDisponibles = [
    { value: 'dermo', label: 'Dermocosmética' },
    { value: 'bio', label: 'Análisis Bioquímico' },
    ...eventosActivos.map(evento => ({
      value: `evento:${evento.id}`,
      label: evento.nombre,
      evento: evento,
    })),
  ];

  // Validar si se puede avanzar al siguiente paso
  const puedeAvanzarPaso1 = tipoServicio !== null;
  const puedeAvanzarPaso2 = fechaSeleccionada !== undefined;
  const puedeAvanzarPaso3 = horaSeleccionada !== '';
  const puedeAvanzarPaso4 =
    datosCliente.nombre.trim() !== '' &&
    datosCliente.email.trim() !== '' &&
    datosCliente.telefono.trim() !== '';

  // Obtener días disponibles (próximos 60 días)
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + 60);


  // Manejar envío del formulario
  const handleEnviarSolicitud = async () => {
    if (!tipoServicio || !fechaSeleccionada || !horaSeleccionada) return;

    try {
      const tipoFinal = tipoServicio?.startsWith('evento:') ? 'evento' : tipoServicio;
      const eventoIdFinal = tipoServicio?.startsWith('evento:') ? tipoServicio.split(':')[1] : undefined;

      const resultado = await solicitarCita.mutateAsync({
        nombreCliente: datosCliente.nombre,
        emailCliente: datosCliente.email,
        telefonoCliente: datosCliente.telefono,
        tipo: tipoFinal as 'dermo' | 'bio' | 'evento',
        fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
        hora: horaSeleccionada,
        notas: datosCliente.notas || undefined,
        eventoId: eventoIdFinal,
      });

      setResultadoSolicitud({
        estado: resultado.estado,
        mensaje: resultado.mensaje,
      });
      setSolicitudEnviada(true);
      setPaso(5);

      if (resultado.estado === 'aprobada') {
        toast.success('¡Cita confirmada!', {
          description: 'Tu solicitud ha sido aprobada automáticamente. Revisa tu email.',
        });
      } else {
        toast.success('Solicitud enviada', {
          description: 'Te contactaremos pronto para confirmar tu cita.',
        });
      }
    } catch (error: any) {
      console.error('Error al enviar solicitud:', error);
      toast.error('Error al enviar solicitud', {
        description: error?.message || 'Por favor, intenta de nuevo.',
      });
    }
  };

  // Resetear formulario
  const handleResetear = () => {
    setPaso(1);
    setTipoServicio(null);
    setEventoSeleccionado(null);
    setFechaSeleccionada(undefined);
    setHoraSeleccionada('');
    setDatosCliente({ nombre: '', email: '', telefono: '', notas: '' });
    setSolicitudEnviada(false);
    setResultadoSolicitud(null);
  };

  // Obtener evento seleccionado si el tipoServicio es un evento
  const eventoActual = tipoServicio?.startsWith('evento:') 
    ? eventosActivos.find(e => e.id === tipoServicio.split(':')[1])
    : null;

  // Función para abrir WhatsApp
  const handleWhatsApp = () => {
    if (configFarmacia?.farmaciaWhatsapp) {
      const numero = configFarmacia.farmaciaWhatsapp.replace(/\s/g, ''); // Eliminar espacios
      const mensaje = encodeURIComponent('Hola, me gustaría solicitar información sobre sus servicios.');
      window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado con logo y datos de contacto */}
        <div className="text-center mb-8 bg-white rounded-lg shadow-sm p-6">
          {configFarmacia?.farmaciaLogo && (
            <div className="mb-4 flex justify-center">
              <img
                src={configFarmacia.farmaciaLogo.startsWith('data:') 
                  ? configFarmacia.farmaciaLogo 
                  : `/microcaya/${configFarmacia.farmaciaLogo}`}
                alt={configFarmacia.farmaciaNombre || 'Logo'}
                className="h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          {configFarmacia?.farmaciaNombre && (
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {configFarmacia.farmaciaNombre}
            </h2>
          )}
          <div className="text-sm text-gray-600 space-y-1">
            {configFarmacia?.farmaciaDireccion && (
              <p>{configFarmacia.farmaciaDireccion}</p>
            )}
            {configFarmacia?.farmaciaCiudad && (
              <p>{configFarmacia.farmaciaCiudad}</p>
            )}
            {configFarmacia?.farmaciaTelefono && (
              <p>Tel: {configFarmacia.farmaciaTelefono}</p>
            )}
            {configFarmacia?.farmaciaEmail && (
              <p>Email: {configFarmacia.farmaciaEmail}</p>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Solicitar Cita
          </h1>
          <p className="text-gray-600 text-lg">
            Completa el formulario para solicitar tu cita
          </p>
        </div>

        {/* Indicador de pasos */}
        {!solicitudEnviada && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                      paso >= num
                        ? 'bg-[#79438f] text-white'
                        : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {num}
                  </div>
                  {num < 4 && (
                    <div
                      className={cn(
                        'w-8 sm:w-16 h-1 mx-1 transition-colors',
                        paso > num ? 'bg-[#79438f]' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4 space-x-8 sm:space-x-16 text-xs sm:text-sm text-gray-600">
              <span className={paso >= 1 ? 'text-[#79438f] font-semibold' : ''}>
                Servicio
              </span>
              <span className={paso >= 2 ? 'text-[#79438f] font-semibold' : ''}>
                Fecha
              </span>
              <span className={paso >= 3 ? 'text-[#79438f] font-semibold' : ''}>
                Hora
              </span>
              <span className={paso >= 4 ? 'text-[#79438f] font-semibold' : ''}>
                Datos
              </span>
            </div>
          </div>
        )}

        {/* Contenido del formulario */}
        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-8">
            {solicitudEnviada ? (
              // Paso 5: Confirmación
              <div className="text-center py-8">
                <div className="mb-6">
                  {resultadoSolicitud?.estado === 'aprobada' ? (
                    <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  ) : (
                    <Clock className="w-20 h-20 text-[#79438f] mx-auto mb-4" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {resultadoSolicitud?.estado === 'aprobada'
                    ? '¡Cita Confirmada!'
                    : 'Solicitud Enviada'}
                </h2>
                <p className="text-gray-600 mb-6 text-lg">{resultadoSolicitud?.mensaje}</p>
                {resultadoSolicitud?.estado === 'aprobada' && (
                  <Alert className="mb-6 bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      <strong>Fecha:</strong>{' '}
                      {fechaSeleccionada &&
                        format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      <br />
                      <strong>Hora:</strong> {horaSeleccionada}
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={handleResetear} variant="outline" size="lg">
                  Solicitar Otra Cita
                </Button>
              </div>
            ) : (
              <>
                {/* Paso 1: Tipo de servicio */}
                {paso === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg font-semibold mb-4 block">
                        Selecciona el tipo de servicio
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tiposServicioDisponibles.map((tipo) => {
                          const esEvento = tipo.value.startsWith('evento:');
                          const evento = esEvento ? tipo.evento : null;
                          
                          return (
                            <button
                              key={tipo.value}
                              onClick={() => {
                                setTipoServicio(tipo.value);
                                if (esEvento && evento) {
                                  setEventoSeleccionado(evento);
                                } else {
                                  setEventoSeleccionado(null);
                                }
                              }}
                              className={cn(
                                'p-6 rounded-lg border-2 text-left transition-all hover:shadow-md',
                                tipoServicio === tipo.value
                                  ? 'border-[#79438f] bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <div className="font-semibold text-gray-900 mb-2">{tipo.label}</div>
                              {esEvento && evento && (
                                <>
                                  {evento.descripcion && (
                                    <div className="text-sm text-gray-600 mb-2">{evento.descripcion}</div>
                                  )}
                                  <div className="text-xs text-gray-500 space-y-1">
                                    {evento.fechas.length > 0 && (
                                      <p>
                                        Fechas: {evento.fechas.map(f => {
                                          try {
                                            return format(new Date(f + 'T00:00:00'), 'dd-MM-yyyy', { locale: es });
                                          } catch {
                                            return f;
                                          }
                                        }).join(', ')}
                                      </p>
                                    )}
                                    {evento.horas.length > 0 && (
                                      <p>Horarios: {evento.horas.join(', ')}</p>
                                    )}
                                  </div>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => setPaso(2)}
                        disabled={!puedeAvanzarPaso1}
                        className="bg-[#79438f] hover:bg-[#6a3a7a]"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paso 2: Fecha */}
                {paso === 2 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg font-semibold mb-4 block">
                        Selecciona una fecha
                      </Label>
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={fechaSeleccionada}
                          onSelect={setFechaSeleccionada}
                          locale={es}
                          weekStartsOn={1} // Lunes (0=domingo, 1=lunes)
                          disabled={(date) => {
                            // Deshabilitar fechas pasadas
                            const hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            return date < hoy || date > fechaLimite;
                          }}
                          className="rounded-md border"
                        />
                      </div>
                      {fechaSeleccionada && (
                        <div className="mt-4 text-center">
                          <Badge variant="outline" className="text-base px-4 py-2">
                            {format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", {
                              locale: es,
                            })}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setPaso(1)}>
                        Atrás
                      </Button>
                      <Button
                        onClick={() => setPaso(3)}
                        disabled={!puedeAvanzarPaso2}
                        className="bg-[#79438f] hover:bg-[#6a3a7a]"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paso 3: Hora */}
                {paso === 3 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg font-semibold mb-4 block">
                        Selecciona una hora disponible
                      </Label>
                      {cargandoDisponibilidad ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-[#79438f]" />
                        </div>
                      ) : horasDisponibles.length === 0 ? (
                        <Alert>
                          <AlertDescription>
                            No hay horas disponibles para esta fecha. Esto puede deberse a que:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>No hay horarios configurados para este tipo de servicio</li>
                              <li>La fecha está bloqueada</li>
                              <li>Todas las horas están ocupadas</li>
                            </ul>
                            Por favor, selecciona otra fecha o contacta con la farmacia.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {horasDisponibles.map((hora) => (
                            <button
                              key={hora}
                              onClick={() => setHoraSeleccionada(hora)}
                              className={cn(
                                'p-3 rounded-lg border-2 transition-all hover:shadow-md',
                                horaSeleccionada === hora
                                  ? 'border-[#79438f] bg-purple-50 font-semibold'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              {hora}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setPaso(2)}>
                        Atrás
                      </Button>
                      <Button
                        onClick={() => setPaso(4)}
                        disabled={!puedeAvanzarPaso3 || horasDisponibles.length === 0}
                        className="bg-[#79438f] hover:bg-[#6a3a7a]"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Paso 4: Datos del cliente */}
                {paso === 4 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg font-semibold mb-4 block">
                        Completa tus datos
                      </Label>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nombre" className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4" />
                            Nombre completo *
                          </Label>
                          <Input
                            id="nombre"
                            value={datosCliente.nombre}
                            onChange={(e) =>
                              setDatosCliente({ ...datosCliente, nombre: e.target.value })
                            }
                            placeholder="Tu nombre completo"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4" />
                            Email *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={datosCliente.email}
                            onChange={(e) =>
                              setDatosCliente({ ...datosCliente, email: e.target.value })
                            }
                            placeholder="tu@email.com"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="telefono" className="flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4" />
                            Teléfono *
                          </Label>
                          <Input
                            id="telefono"
                            type="tel"
                            value={datosCliente.telefono}
                            onChange={(e) =>
                              setDatosCliente({ ...datosCliente, telefono: e.target.value })
                            }
                            placeholder="600 000 000"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="notas" className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4" />
                            Notas (opcional)
                          </Label>
                          <Textarea
                            id="notas"
                            value={datosCliente.notas}
                            onChange={(e) =>
                              setDatosCliente({ ...datosCliente, notas: e.target.value })
                            }
                            placeholder="Información adicional que quieras compartir..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Resumen de tu solicitud</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Servicio:</strong>{' '}
                          {tipoServicio 
                            ? (tiposServicioDisponibles.find((t) => t.value === tipoServicio)?.label || '')
                            : ''}
                        </p>
                        <p>
                          <strong>Fecha:</strong>{' '}
                          {fechaSeleccionada &&
                            format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", {
                              locale: es,
                            })}
                        </p>
                        <p>
                          <strong>Hora:</strong> {horaSeleccionada}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setPaso(3)}>
                        Atrás
                      </Button>
                      <Button
                        onClick={handleEnviarSolicitud}
                        disabled={!puedeAvanzarPaso4 || solicitarCita.isPending}
                        className="bg-[#79438f] hover:bg-[#6a3a7a]"
                      >
                        {solicitarCita.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
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

        {/* Botón de WhatsApp */}
        {configFarmacia?.farmaciaWhatsapp && (
          <div className="mt-6 text-center">
            <Button
              onClick={handleWhatsApp}
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
