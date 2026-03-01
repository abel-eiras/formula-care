/**
 * Configuración SMTP/email de la plataforma (superadmin)
 * Por defecto todas las farmacias usan esta configuración
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfiguracionPlataforma, useActualizarConfiguracionPlataforma, useEnviarPruebaEmail } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Mail, Loader2, Save, AlertTriangle, Send, CheckCircle2, XCircle } from 'lucide-react';
import type { ActualizarConfiguracionPlataformaData, ResultadoEnvioPruebaEmail } from '@/types';

const defaultForm: ActualizarConfiguracionPlataformaData = {
  emailProvider: 'smtp',
  smtpHost: null,
  smtpPort: 587,
  smtpSecure: false,
  smtpAcceptSelfSigned: false,
  smtpUser: null,
  smtpPass: null,
  smtpFrom: null,
  resendApiKey: null,
  emailNombreRemitente: null,
};

export default function ConfiguracionEmail() {
  const { data: config, isLoading, error } = useConfiguracionPlataforma();
  const actualizarMutation = useActualizarConfiguracionPlataforma();
  const enviarPruebaMutation = useEnviarPruebaEmail();
  const [form, setForm] = useState<ActualizarConfiguracionPlataformaData>(defaultForm);
  const [passwordOverride, setPasswordOverride] = useState('');
  const [resendApiKeyOverride, setResendApiKeyOverride] = useState('');
  const [emailPrueba, setEmailPrueba] = useState('');
  const [lastDiagnostico, setLastDiagnostico] = useState<ResultadoEnvioPruebaEmail | null>(null);
  const hasResendKeyStored = config?.resendApiKey != null && config.resendApiKey !== '';

  useEffect(() => {
    if (config) {
      setForm({
        emailProvider: config.emailProvider,
        smtpHost: config.smtpHost ?? null,
        smtpPort: config.smtpPort ?? 587,
        smtpSecure: config.smtpSecure ?? false,
        smtpAcceptSelfSigned: config.smtpAcceptSelfSigned ?? false,
        smtpUser: config.smtpUser ?? null,
        smtpFrom: config.smtpFrom ?? null,
        resendApiKey: config.resendApiKey === '********' ? undefined : (config.resendApiKey ?? null),
        emailNombreRemitente: config.emailNombreRemitente ?? null,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ActualizarConfiguracionPlataformaData = { ...form };
    if (passwordOverride.trim()) payload.smtpPass = passwordOverride;
    if (form.emailProvider === 'resend' && resendApiKeyOverride.trim()) payload.resendApiKey = resendApiKeyOverride;
    try {
      await actualizarMutation.mutateAsync(payload);
      toast.success('Configuración guardada correctamente');
      setPasswordOverride('');
      setResendApiKeyOverride('');
    } catch {
      toast.error('Error al guardar la configuración');
    }
  };

  const handleEnviarPrueba = async () => {
    const email = emailPrueba.trim();
    if (!email) {
      toast.error('Introduce un email de destino');
      return;
    }
    setLastDiagnostico(null);
    try {
      const result = await enviarPruebaMutation.mutateAsync(email);
      setLastDiagnostico(result);
      if (result.enviado) {
        toast.success('Correo de prueba enviado. Revisa la bandeja de entrada (y spam).');
      } else {
        toast.error(result.mensajeError ?? result.mensaje);
      }
    } catch (err) {
      const isTimeout =
        (err instanceof Error && err.name === 'AbortError') ||
        (err instanceof Error && /tiempo|504|timeout/i.test(err.message));
      const mensaje = isTimeout
        ? 'El servidor de correo no respondió a tiempo.'
        : 'No se pudo completar la prueba (error de red o servidor).';
      const sugerencia =
        'Comprueba primero el host y el puerto del servidor SMTP. Si la conexión es correcta, revisa el usuario y la contraseña.';
      toast.error(isTimeout ? 'El servidor tarda demasiado. Comprueba la conexión o inténtalo más tarde.' : mensaje);
      setLastDiagnostico({
        mensaje,
        enviado: false,
        pasos: [{ paso: 'Envío', ok: false, mensaje, sugerencia }],
        mensajeError: mensaje,
        sugerencia,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error al cargar la configuración de email</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración SMTP</h1>
        <p className="text-muted-foreground">
          Configuración de correo por defecto para toda la plataforma. Las farmacias pueden usar esta configuración o definir la suya propia.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Servidor de correo
            </CardTitle>
            <CardDescription>
              Proveedor y credenciales SMTP o Resend. Por defecto todas las farmacias usan estos valores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={form.emailProvider ?? 'smtp'}
                  onValueChange={(v: 'smtp' | 'resend') => setForm({ ...form, emailProvider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP (Gmail, Outlook, etc.)</SelectItem>
                    <SelectItem value="resend">Resend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre del remitente</Label>
                <Input
                  value={form.emailNombreRemitente ?? ''}
                  onChange={(e) => setForm({ ...form, emailNombreRemitente: e.target.value || null })}
                  placeholder="Ej: Sistema de Gestión"
                />
              </div>
            </div>

            {form.emailProvider === 'smtp' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Host SMTP</Label>
                    <Input
                      value={form.smtpHost ?? ''}
                      onChange={(e) => setForm({ ...form, smtpHost: e.target.value || null })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Puerto</Label>
                    <Input
                      type="number"
                      value={form.smtpPort ?? ''}
                      onChange={(e) => setForm({ ...form, smtpPort: e.target.value ? parseInt(e.target.value, 10) : null })}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtpSecure"
                    checked={form.smtpSecure ?? false}
                    onCheckedChange={(v) => setForm({ ...form, smtpSecure: v })}
                  />
                  <Label htmlFor="smtpSecure">Conexión segura (SSL/TLS, puerto 465)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtpAcceptSelfSigned"
                    checked={form.smtpAcceptSelfSigned ?? false}
                    onCheckedChange={(v) => setForm({ ...form, smtpAcceptSelfSigned: v })}
                  />
                  <Label htmlFor="smtpAcceptSelfSigned">Aceptar certificado autofirmado (servidores propios, p. ej. Raiola)</Label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Usuario SMTP</Label>
                    <Input
                      value={form.smtpUser ?? ''}
                      onChange={(e) => setForm({ ...form, smtpUser: e.target.value || null })}
                      placeholder="tu-email@gmail.com"
                      type="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña SMTP</Label>
                    <Input
                      type="password"
                      value={passwordOverride}
                      onChange={(e) => setPasswordOverride(e.target.value)}
                      placeholder="Dejar en blanco para no cambiar"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </>
            )}

            {form.emailProvider === 'resend' && (
              <div className="space-y-2">
                <Label>API Key de Resend</Label>
                <Input
                  type="password"
                  value={resendApiKeyOverride}
                  onChange={(e) => setResendApiKeyOverride(e.target.value)}
                  placeholder={hasResendKeyStored ? 'Configurada (dejar en blanco para no cambiar)' : 're_xxxxxxxx'}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Email remitente (From)</Label>
              <Input
                type="email"
                value={form.smtpFrom ?? ''}
                onChange={(e) => setForm({ ...form, smtpFrom: e.target.value || null })}
                placeholder="noreply@tudominio.com"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={actualizarMutation.isPending}>
                {actualizarMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar correo de prueba
          </CardTitle>
          <CardDescription>
            Introduce un email de destino para comprobar que la configuración SMTP funciona correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="destino@ejemplo.com"
            value={emailPrueba}
            onChange={(e) => setEmailPrueba(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleEnviarPrueba}
            disabled={enviarPruebaMutation.isPending}
          >
            {enviarPruebaMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar correo de prueba
          </Button>
        </CardContent>
      </Card>

      {lastDiagnostico && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico del envío</CardTitle>
            <CardDescription>
              Pasos realizados al enviar el correo de prueba. Si algo ha fallado, el mensaje y la sugerencia indican qué revisar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lastDiagnostico.pasos.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  {p.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="font-medium">{p.paso}</span>
                    {!p.ok && p.mensaje && (
                      <p className="text-destructive text-sm mt-1">{p.mensaje}</p>
                    )}
                    {!p.ok && p.sugerencia && (
                      <p className="text-muted-foreground text-sm mt-1">
                        <strong>Sugerencia:</strong> {p.sugerencia}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
