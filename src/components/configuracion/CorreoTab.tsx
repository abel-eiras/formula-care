/**
 * Correo de la farmacia: cuenta desde la que la app envía confirmaciones,
 * recordatorios, informes y felicitaciones, y botón de correo de prueba con
 * diagnóstico paso a paso (conexión, usuario y contraseña, envío).
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Eye, EyeOff, Mail, Save, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  useActualizarConfigCorreo,
  useConfigCorreo,
  useProbarCorreo,
  type DatosConfigCorreo,
  type ResultadoPruebaCorreo,
} from '@/hooks/useCorreo';

/** Proveedores habituales: rellenan servidor y puerto para no tener que buscarlos */
const PROVEEDORES = {
  gmail: { nombre: 'Gmail', host: 'smtp.gmail.com', puerto: 465, seguro: true },
  microsoft: { nombre: 'Outlook / Microsoft 365', host: 'smtp.office365.com', puerto: 587, seguro: false },
  otro: { nombre: 'Otro proveedor', host: '', puerto: 587, seguro: false },
} as const;

type Proveedor = keyof typeof PROVEEDORES;

function detectarProveedor(host: string): Proveedor {
  if (host === PROVEEDORES.gmail.host) return 'gmail';
  if (host === PROVEEDORES.microsoft.host) return 'microsoft';
  return 'otro';
}

const FORMULARIO_VACIO: DatosConfigCorreo = {
  emailProvider: 'smtp',
  emailRemitente: '',
  emailNombreRemitente: '',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpAcceptSelfSigned: false,
  smtpUser: '',
};

export function CorreoTab() {
  const { data: config, isLoading } = useConfigCorreo();
  const actualizar = useActualizarConfigCorreo();
  const probar = useProbarCorreo();
  const { usuario } = useAuthContext();

  const [formulario, setFormulario] = useState<DatosConfigCorreo>(FORMULARIO_VACIO);
  const [proveedor, setProveedor] = useState<Proveedor>('otro');
  const [contrasena, setContrasena] = useState('');
  const [claveResend, setClaveResend] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [destinatarioPrueba, setDestinatarioPrueba] = useState('');
  const [resultadoPrueba, setResultadoPrueba] = useState<ResultadoPruebaCorreo | null>(null);

  useEffect(() => {
    if (!config) return;
    const { smtpPassGuardada: _p, resendApiKeyGuardada: _r, ...datos } = config;
    setFormulario(datos);
    setProveedor(config.smtpHost ? detectarProveedor(config.smtpHost) : 'gmail');
  }, [config]);

  useEffect(() => {
    if (usuario?.email && !destinatarioPrueba) setDestinatarioPrueba(usuario.email);
  }, [usuario?.email, destinatarioPrueba]);

  const cambiar = <K extends keyof DatosConfigCorreo>(campo: K, valor: DatosConfigCorreo[K]) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

  const elegirProveedor = (nuevo: Proveedor) => {
    setProveedor(nuevo);
    const { host, puerto, seguro } = PROVEEDORES[nuevo];
    setFormulario((actual) => ({
      ...actual,
      smtpHost: nuevo === 'otro' ? actual.smtpHost : host,
      smtpPort: puerto,
      smtpSecure: seguro,
    }));
  };

  const guardar = async () => {
    try {
      // En Gmail y Microsoft el usuario es la propia dirección de correo
      const usuarioSmtp = formulario.smtpUser || (proveedor !== 'otro' ? formulario.emailRemitente : '');
      await actualizar.mutateAsync({
        ...formulario,
        smtpUser: usuarioSmtp,
        ...(contrasena ? { smtpPass: contrasena } : {}),
        ...(claveResend ? { resendApiKey: claveResend } : {}),
      });
      setContrasena('');
      setClaveResend('');
      setResultadoPrueba(null);
      toast.success('Configuración de correo guardada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuración de correo');
    }
  };

  const enviarPrueba = async () => {
    setResultadoPrueba(null);
    try {
      const resultado = await probar.mutateAsync(destinatarioPrueba.trim());
      setResultadoPrueba(resultado);
      if (resultado.enviado) toast.success(`Correo de prueba enviado a ${destinatarioPrueba}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar el correo de prueba');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando configuración de correo…</p>;
  }

  const esSmtp = formulario.emailProvider === 'smtp';
  const hayCambiosSinGuardar = !!contrasena || !!claveResend;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Correo de la farmacia
          </CardTitle>
          <CardDescription>
            La cuenta desde la que se envían las confirmaciones y recordatorios de citas, los informes y las
            felicitaciones. Sin esto configurado, la app no puede enviar ningún correo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="correo-remitente">Dirección de correo</Label>
              <Input
                id="correo-remitente"
                type="email"
                placeholder="farmacia@ejemplo.es"
                value={formulario.emailRemitente}
                onChange={(e) => cambiar('emailRemitente', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correo-nombre">Nombre que verá el paciente</Label>
              <Input
                id="correo-nombre"
                placeholder="Farmacia …"
                value={formulario.emailNombreRemitente}
                onChange={(e) => cambiar('emailNombreRemitente', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cómo se envía</Label>
            <Select
              value={formulario.emailProvider}
              onValueChange={(valor) => cambiar('emailProvider', valor as DatosConfigCorreo['emailProvider'])}
            >
              <SelectTrigger className="sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">Con mi cuenta de correo</SelectItem>
                <SelectItem value="resend">Con Resend (servicio externo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {esSmtp ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Proveedor de correo</Label>
                <Select value={proveedor} onValueChange={(valor) => elegirProveedor(valor as Proveedor)}>
                  <SelectTrigger className="sm:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVEEDORES).map(([clave, { nombre }]) => (
                      <SelectItem key={clave} value={clave}>
                        {nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {proveedor === 'gmail' && (
                  <p className="text-xs text-muted-foreground">
                    Gmail no admite la contraseña normal de la cuenta: crea una <strong>contraseña de aplicación</strong> en
                    tu cuenta de Google (Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones) y pégala abajo.
                  </p>
                )}
                {proveedor === 'otro' && (
                  <p className="text-xs text-muted-foreground">
                    Tu proveedor de correo o quien te gestiona el dominio te puede dar estos datos (a veces aparecen como
                    «servidor de correo saliente» o «SMTP»).
                  </p>
                )}
              </div>

              {proveedor === 'otro' && (
                <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                  <div className="space-y-2">
                    <Label htmlFor="correo-host">Servidor de correo saliente</Label>
                    <Input
                      id="correo-host"
                      placeholder="smtp.ejemplo.es"
                      value={formulario.smtpHost}
                      onChange={(e) => cambiar('smtpHost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correo-puerto">Puerto</Label>
                    <Input
                      id="correo-puerto"
                      type="number"
                      value={formulario.smtpPort}
                      onChange={(e) => cambiar('smtpPort', Number(e.target.value) || 587)}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="correo-usuario">Usuario</Label>
                  <Input
                    id="correo-usuario"
                    placeholder={formulario.emailRemitente || 'Normalmente, la dirección de correo'}
                    value={formulario.smtpUser}
                    onChange={(e) => cambiar('smtpUser', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo-contrasena">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="correo-contrasena"
                      type={verContrasena ? 'text' : 'password'}
                      placeholder={config?.smtpPassGuardada ? '•••••••• (guardada; escribe para cambiarla)' : ''}
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setVerContrasena((v) => !v)}
                      aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {verContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {proveedor === 'otro' && (
                <div className="space-y-3 rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="correo-ssl">Conexión segura desde el inicio (SSL)</Label>
                      <p className="text-xs text-muted-foreground">Actívalo si el puerto es 465; déjalo apagado con 587.</p>
                    </div>
                    <Switch
                      id="correo-ssl"
                      checked={formulario.smtpSecure}
                      onCheckedChange={(valor) => cambiar('smtpSecure', valor)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="correo-autofirmado">Aceptar certificado autofirmado</Label>
                      <p className="text-xs text-muted-foreground">
                        Solo si la prueba avisa de un problema de certificado con tu servidor.
                      </p>
                    </div>
                    <Switch
                      id="correo-autofirmado"
                      checked={formulario.smtpAcceptSelfSigned}
                      onCheckedChange={(valor) => cambiar('smtpAcceptSelfSigned', valor)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="correo-resend">Clave API de Resend</Label>
              <Input
                id="correo-resend"
                type="password"
                placeholder={config?.resendApiKeyGuardada ? '•••••••• (guardada; escribe para cambiarla)' : 're_…'}
                value={claveResend}
                onChange={(e) => setClaveResend(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Resend es un servicio externo de envío de correo. La dirección de correo de arriba debe pertenecer a un
                dominio verificado en tu cuenta de Resend.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={guardar} disabled={actualizar.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {actualizar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Probar el envío
          </CardTitle>
          <CardDescription>
            Envía un correo de prueba con la configuración guardada. Si falla, verás en qué paso y qué revisar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="Dirección donde recibir la prueba"
              value={destinatarioPrueba}
              onChange={(e) => setDestinatarioPrueba(e.target.value)}
              className="sm:max-w-sm"
            />
            <Button
              variant="outline"
              onClick={enviarPrueba}
              disabled={probar.isPending || !destinatarioPrueba.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {probar.isPending ? 'Enviando…' : 'Enviar correo de prueba'}
            </Button>
          </div>
          {hayCambiosSinGuardar && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Guarda antes de probar: la prueba usa la configuración guardada.
            </p>
          )}

          {resultadoPrueba && (
            <ul className="space-y-2">
              {resultadoPrueba.pasos.map((paso) => (
                <li key={paso.paso} className="flex gap-2 text-sm">
                  {paso.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className={paso.ok ? '' : 'font-medium text-destructive'}>{paso.paso}</p>
                    {paso.mensaje && <p className="text-muted-foreground">{paso.mensaje}</p>}
                    {paso.sugerencia && <p className="text-muted-foreground">{paso.sugerencia}</p>}
                  </div>
                </li>
              ))}
              {resultadoPrueba.enviado && (
                <li className="text-sm text-muted-foreground">
                  Revisa la bandeja de entrada (y la carpeta de spam) de {destinatarioPrueba}.
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
