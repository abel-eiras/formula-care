import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { useEnviarSolicitud, useReserva, type Reserva } from '@/hooks/useBooking';
import type { DatosPersonales } from '@/lib/cifrado';
import { aplicarColorPrimario } from '@/lib/color';
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

type Paso = 'servicio' | 'horario' | 'datos' | 'enviada';

interface OpcionServicio {
  tipo: string;
  nombre: string;
  descripcion: string | null;
  duracion: number;
}

const FORM_VACIO: DatosPersonales = { nombre: '', email: '', telefono: '', fechaNacimiento: '', sexo: 'F', notas: '' };

function fechaLarga(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fechaCorta(fecha: string): { dia: string; numero: string; mes: string } {
  const d = new Date(`${fecha}T12:00:00`);
  return {
    dia: d.toLocaleDateString('es-ES', { weekday: 'short' }),
    numero: String(d.getDate()),
    mes: d.toLocaleDateString('es-ES', { month: 'short' }),
  };
}

/** Servicios y eventos con al menos un hueco libre */
function opcionesDisponibles(reserva: Reserva): OpcionServicio[] {
  const conHuecos = (tipo: string) => Object.keys(reserva.huecos[tipo] ?? {}).length > 0;
  return [
    ...reserva.servicios.map((s) => ({ tipo: s.id, nombre: s.nombre, descripcion: null, duracion: s.duracion })),
    ...reserva.eventos.map((e) => ({ tipo: `evento:${e.id}`, nombre: e.nombre, descripcion: e.descripcion, duracion: e.duracion })),
  ].filter((o) => conHuecos(o.tipo));
}

async function obtenerTokenCaptcha(siteKey: string | null): Promise<string | undefined> {
  const enterprise = window.grecaptcha?.enterprise;
  if (!siteKey || !enterprise) return undefined;
  return new Promise((resolve) => {
    enterprise.ready(() => {
      enterprise.execute(siteKey, { action: 'solicitar_cita' }).then(resolve, () => resolve(undefined));
    });
  });
}

function Cabecera({ farmacia }: { farmacia: Reserva['farmacia'] }) {
  return (
    <div className="text-center mb-8 bg-card rounded-lg shadow-sm p-6 border">
      {farmacia.logo && (
        <div className="mb-4 flex justify-center">
          <img src={farmacia.logo} alt={farmacia.nombre || 'Logo'} className="h-20 object-contain max-w-full" />
        </div>
      )}
      {farmacia.nombre && <h2 className="text-xl font-bold mb-1">{farmacia.nombre}</h2>}
      <div className="text-sm text-muted-foreground">
        {[farmacia.direccion, farmacia.ciudad].filter(Boolean).join(', ')}
        {farmacia.telefono && <span> · Tel. {farmacia.telefono}</span>}
      </div>
    </div>
  );
}

export default function SolicitarCita() {
  const { data: reserva, isLoading, error } = useReserva();
  const enviar = useEnviarSolicitud();
  const [paso, setPaso] = useState<Paso>('servicio');
  const [tipo, setTipo] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [datos, setDatos] = useState<DatosPersonales>(FORM_VACIO);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  // Copia de lo enviado: los huecos se refrescan y el elegido ya no aparece
  const [enviada, setEnviada] = useState<{ servicio: string; fecha: string; hora: string; email: string } | null>(null);

  useEffect(() => {
    if (reserva) aplicarColorPrimario(reserva.farmacia.colorPrimario);
  }, [reserva]);

  // reCAPTCHA solo si la farmacia lo ha configurado en su servidor
  useEffect(() => {
    if (!reserva?.captcha || document.querySelector('script[src*="recaptcha/enterprise"]')) return;
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${reserva.captcha}`;
    script.async = true;
    document.head.appendChild(script);
  }, [reserva?.captcha]);

  const opciones = useMemo(() => (reserva ? opcionesDisponibles(reserva) : []), [reserva]);
  const opcion = opciones.find((o) => o.tipo === tipo);
  const fechas = useMemo(() => (reserva && tipo ? Object.keys(reserva.huecos[tipo] ?? {}).sort() : []), [reserva, tipo]);
  const horas = useMemo(
    () => (reserva && tipo && fecha ? Object.keys(reserva.huecos[tipo]?.[fecha] ?? {}).sort() : []),
    [reserva, tipo, fecha]
  );

  // Mientras se elige horario, si los huecos se refrescan y el elegido desaparece, se vuelve a elegir
  useEffect(() => {
    if (paso !== 'horario') return;
    if (fecha && !fechas.includes(fecha)) setFecha(null);
    if (hora && !horas.includes(hora)) setHora(null);
  }, [paso, fechas, horas, fecha, hora]);

  const cifradoDisponible = typeof globalThis.crypto?.subtle !== 'undefined';
  const datosCompletos =
    datos.nombre.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(datos.email.trim()) &&
    datos.telefono.replace(/\D/g, '').length >= 9 &&
    /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaNacimiento) &&
    aceptaPrivacidad;

  const handleEnviar = async () => {
    if (!reserva || !tipo || !fecha || !hora) return;
    try {
      await enviar.mutateAsync({
        cita: { tipo, fecha, hora },
        datos: { ...datos, nombre: datos.nombre.trim(), email: datos.email.trim(), telefono: datos.telefono.trim(), notas: datos.notas?.trim() || undefined },
        clavePublica: reserva.clavePublica,
        captchaToken: await obtenerTokenCaptcha(reserva.captcha),
      });
      setEnviada({ servicio: opcion?.nombre ?? '', fecha, hora, email: datos.email.trim() });
      setPaso('enviada');
      window.scrollTo(0, 0);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Inténtalo de nuevo';
      toast.error('No se ha podido enviar la solicitud', { description: mensaje });
      // Si el hueco se ha ocupado, volver a elegir horario
      if (/ocupa/i.test(mensaje)) {
        setHora(null);
        setPaso('horario');
      }
    }
  };

  const reiniciar = () => {
    setPaso('servicio');
    setTipo(null);
    setFecha(null);
    setHora(null);
    setDatos(FORM_VACIO);
    setAceptaPrivacidad(false);
    setEnviada(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="min-h-screen py-8 px-4">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Reserva no disponible</h2>
            <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Inténtalo más tarde.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { farmacia } = reserva;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Cabecera farmacia={farmacia} />

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Pedir cita</h1>
          <p className="text-muted-foreground">La farmacia confirmará tu cita por email.</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-8">
            {!cifradoDisponible && (
              <Alert className="mb-6">
                <AlertDescription>
                  Tu navegador no permite enviar datos cifrados desde esta dirección. Abre la página con https://.
                </AlertDescription>
              </Alert>
            )}

            {paso === 'servicio' && (
              <div className="space-y-6">
                <Label className="text-lg font-semibold block">¿Qué necesitas?</Label>
                {opciones.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Ahora mismo no hay horarios libres para pedir cita online.
                      {farmacia.telefono && ` Puedes llamarnos al ${farmacia.telefono}.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {opciones.map((o) => (
                      <button
                        key={o.tipo}
                        type="button"
                        onClick={() => {
                          setTipo(o.tipo);
                          setFecha(null);
                          setHora(null);
                        }}
                        className={cn(
                          'p-5 rounded-lg border-2 text-left transition-all hover:shadow-md',
                          tipo === o.tipo ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                        )}
                      >
                        <div className="font-semibold">{o.nombre}</div>
                        {o.descripcion && <div className="text-sm text-muted-foreground mt-1">{o.descripcion}</div>}
                        <div className="text-xs text-muted-foreground mt-2">{o.duracion} minutos</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setPaso('horario')} disabled={!tipo}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {paso === 'horario' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-semibold block mb-1">Elige día</Label>
                  <p className="text-sm text-muted-foreground">{opcion?.nombre}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {fechas.map((f) => {
                    const c = fechaCorta(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setFecha(f);
                          setHora(null);
                        }}
                        className={cn(
                          'min-w-[4.5rem] rounded-lg border-2 px-3 py-2 text-center transition-all',
                          fecha === f ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                        )}
                        aria-label={fechaLarga(f)}
                      >
                        <div className="text-xs uppercase text-muted-foreground">{c.dia}</div>
                        <div className="text-xl font-semibold">{c.numero}</div>
                        <div className="text-xs text-muted-foreground">{c.mes}</div>
                      </button>
                    );
                  })}
                </div>

                {fecha && (
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold block">Elige hora · {fechaLarga(fecha)}</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {horas.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHora(h)}
                          className={cn(
                            'p-3 rounded-lg border-2 transition-all',
                            hora === h ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-muted-foreground/40'
                          )}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setPaso('servicio')}>
                    Atrás
                  </Button>
                  <Button onClick={() => setPaso('datos')} disabled={!fecha || !hora}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {paso === 'datos' && fecha && hora && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleEnviar();
                }}
              >
                <Label className="text-lg font-semibold block">Tus datos</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nombre">Nombre y apellidos *</Label>
                    <Input id="nombre" autoComplete="name" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" autoComplete="email" value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input id="telefono" type="tel" autoComplete="tel" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nacimiento">Fecha de nacimiento *</Label>
                    <Input
                      id="nacimiento"
                      type="date"
                      autoComplete="bday"
                      max={new Date().toISOString().slice(0, 10)}
                      value={datos.fechaNacimiento}
                      onChange={(e) => setDatos({ ...datos, fechaNacimiento: e.target.value })}
                    />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium mb-2">Sexo *</legend>
                    <div className="flex gap-2">
                      {(
                        [
                          ['F', 'Mujer'],
                          ['M', 'Hombre'],
                          ['O', 'Otro'],
                        ] as const
                      ).map(([valor, texto]) => (
                        <label
                          key={valor}
                          className={cn(
                            'flex-1 cursor-pointer rounded-md border-2 px-3 py-2 text-center text-sm',
                            datos.sexo === valor ? 'border-primary bg-primary/5 font-medium' : 'border-border'
                          )}
                        >
                          <input
                            type="radio"
                            name="sexo"
                            value={valor}
                            className="sr-only"
                            checked={datos.sexo === valor}
                            onChange={() => setDatos({ ...datos, sexo: valor })}
                          />
                          {texto}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notas">Comentarios (opcional)</Label>
                    <Textarea id="notas" rows={3} value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} />
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
                  <Checkbox id="privacidad" checked={aceptaPrivacidad} onCheckedChange={(c) => setAceptaPrivacidad(c === true)} className="mt-0.5" />
                  <Label htmlFor="privacidad" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    He leído y acepto la{' '}
                    {reserva.hayTextosLegales.privacidad ? (
                      <Link to="/legal/privacidad" target="_blank" className="font-medium text-primary hover:underline">
                        política de privacidad
                      </Link>
                    ) : (
                      'política de privacidad'
                    )}{' '}
                    y el tratamiento de mis datos para gestionar esta cita. *
                  </Label>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-1">
                  <p>
                    <strong>{opcion?.nombre}</strong> · {fechaLarga(fecha)} a las {hora}
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> Tus datos se cifran en este navegador: solo la farmacia puede leerlos.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setPaso('horario')}>
                    Atrás
                  </Button>
                  <Button type="submit" disabled={!datosCompletos || !cifradoDisponible || enviar.isPending}>
                    {enviar.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…
                      </>
                    ) : (
                      'Enviar solicitud'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {paso === 'enviada' && enviada && (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Solicitud enviada</h2>
                <p className="text-muted-foreground">
                  Has pedido <strong>{enviada.servicio}</strong> el {fechaLarga(enviada.fecha)} a las {enviada.hora}. La farmacia la
                  revisará y te escribirá a <strong>{enviada.email}</strong> para confirmarla.
                </p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Hasta recibir el email, la cita no está confirmada.
                </p>
                <Button variant="outline" onClick={reiniciar}>
                  Pedir otra cita
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          {farmacia.whatsapp && (
            <a
              href={`https://wa.me/${farmacia.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp
            </a>
          )}
          <div className="flex gap-4">
            {reserva.hayTextosLegales.avisoLegal && <Link to="/legal/aviso-legal" className="hover:underline">Aviso legal</Link>}
            {reserva.hayTextosLegales.privacidad && <Link to="/legal/privacidad" className="hover:underline">Privacidad</Link>}
            {reserva.hayTextosLegales.cookies && <Link to="/legal/cookies" className="hover:underline">Cookies</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
