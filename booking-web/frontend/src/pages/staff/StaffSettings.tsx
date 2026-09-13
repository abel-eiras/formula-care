import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save } from 'lucide-react';
import {
  useActualizarConfiguracionCalendarioStaff,
  useActualizarConfiguracionStaff,
  useConfiguracionCalendarioStaff,
  useConfiguracionStaff,
} from '@/hooks/useStaff';
import { toast } from '@/components/ui/sonner';

export default function StaffSettings() {
  const { data: config, isLoading: cargandoConfig } = useConfiguracionStaff();
  const actualizarConfig = useActualizarConfiguracionStaff();
  const { data: configCal, isLoading: cargandoCal } = useConfiguracionCalendarioStaff();
  const actualizarCal = useActualizarConfiguracionCalendarioStaff();

  const [form, setForm] = useState({
    farmaciaNombre: '',
    farmaciaDireccion: '',
    farmaciaCiudad: '',
    farmaciaTelefono: '',
    farmaciaEmail: '',
    farmaciaWeb: '',
    farmaciaWhatsapp: '',
    textoAvisoLegal: '',
    textoPoliticaPrivacidad: '',
    textoPoliticaCookies: '',
    emailProvider: 'smtp' as 'smtp' | 'resend',
    emailRemitente: '',
    emailNombreRemitente: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    resendApiKey: '',
  });

  const [autoAceptar, setAutoAceptar] = useState(false);
  const [duracionDermo, setDuracionDermo] = useState(45);
  const [duracionBio, setDuracionBio] = useState(20);

  useEffect(() => {
    if (!config) return;
    setForm((f) => ({
      ...f,
      farmaciaNombre: config.farmaciaNombre || '',
      farmaciaDireccion: config.farmaciaDireccion || '',
      farmaciaCiudad: config.farmaciaCiudad || '',
      farmaciaTelefono: config.farmaciaTelefono || '',
      farmaciaEmail: config.farmaciaEmail || '',
      farmaciaWeb: config.farmaciaWeb || '',
      farmaciaWhatsapp: config.farmaciaWhatsapp || '',
      textoAvisoLegal: config.textoAvisoLegal || '',
      textoPoliticaPrivacidad: config.textoPoliticaPrivacidad || '',
      textoPoliticaCookies: config.textoPoliticaCookies || '',
      emailProvider: config.emailProvider || 'smtp',
      emailRemitente: config.emailRemitente || '',
      emailNombreRemitente: config.emailNombreRemitente || '',
      smtpHost: config.smtpHost || '',
      smtpPort: config.smtpPort ? String(config.smtpPort) : '',
      smtpUser: config.smtpUser || '',
      smtpPass: config.smtpPassConfigurada ? '********' : '',
      smtpSecure: config.smtpSecure,
      resendApiKey: config.resendApiKeyConfigurada ? '********' : '',
    }));
  }, [config]);

  useEffect(() => {
    if (!configCal) return;
    setAutoAceptar(configCal.autoAceptar);
    setDuracionDermo(configCal.duracionPorTipo?.dermo ?? 45);
    setDuracionBio(configCal.duracionPorTipo?.bio ?? 20);
  }, [configCal]);

  const guardarBranding = async () => {
    try {
      await actualizarConfig.mutateAsync({
        farmaciaNombre: form.farmaciaNombre,
        farmaciaDireccion: form.farmaciaDireccion,
        farmaciaCiudad: form.farmaciaCiudad,
        farmaciaTelefono: form.farmaciaTelefono,
        farmaciaEmail: form.farmaciaEmail,
        farmaciaWeb: form.farmaciaWeb,
        farmaciaWhatsapp: form.farmaciaWhatsapp,
      });
      toast.success('Datos de la farmacia guardados');
    } catch {
      toast.error('No se pudo guardar');
    }
  };

  const guardarLegal = async () => {
    try {
      await actualizarConfig.mutateAsync({
        textoAvisoLegal: form.textoAvisoLegal,
        textoPoliticaPrivacidad: form.textoPoliticaPrivacidad,
        textoPoliticaCookies: form.textoPoliticaCookies,
      });
      toast.success('Textos legales guardados');
    } catch {
      toast.error('No se pudo guardar');
    }
  };

  const guardarEmail = async () => {
    try {
      await actualizarConfig.mutateAsync({
        emailProvider: form.emailProvider,
        emailRemitente: form.emailRemitente,
        emailNombreRemitente: form.emailNombreRemitente,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort ? Number(form.smtpPort) : undefined,
        smtpUser: form.smtpUser,
        smtpPass: form.smtpPass,
        smtpSecure: form.smtpSecure,
        resendApiKey: form.resendApiKey,
      });
      toast.success('Configuración de email guardada');
    } catch {
      toast.error('No se pudo guardar');
    }
  };

  const guardarCalendario = async () => {
    try {
      await actualizarCal.mutateAsync({
        autoAceptar,
        duracionPorTipo: { ...(configCal?.duracionPorTipo || {}), dermo: duracionDermo, bio: duracionBio },
      });
      toast.success('Configuración de calendario guardada');
    } catch {
      toast.error('No se pudo guardar');
    }
  };

  if (cargandoConfig || cargandoCal) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos de la farmacia</CardTitle>
          <CardDescription>Se muestran en la página pública de reserva y en los emails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.farmaciaNombre} onChange={(e) => setForm({ ...form, farmaciaNombre: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.farmaciaTelefono} onChange={(e) => setForm({ ...form, farmaciaTelefono: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={form.farmaciaDireccion} onChange={(e) => setForm({ ...form, farmaciaDireccion: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input value={form.farmaciaCiudad} onChange={(e) => setForm({ ...form, farmaciaCiudad: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email de contacto</Label>
              <Input value={form.farmaciaEmail} onChange={(e) => setForm({ ...form, farmaciaEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Web</Label>
              <Input value={form.farmaciaWeb} onChange={(e) => setForm({ ...form, farmaciaWeb: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp (solo número, con prefijo país)</Label>
              <Input value={form.farmaciaWhatsapp} onChange={(e) => setForm({ ...form, farmaciaWhatsapp: e.target.value })} placeholder="34600000000" />
            </div>
          </div>
          <Button onClick={guardarBranding} disabled={actualizarConfig.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
          <CardDescription>Duración de cada tipo de servicio y aprobación automática de solicitudes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="autoAceptar" checked={autoAceptar} onCheckedChange={(c) => setAutoAceptar(c === true)} />
            <Label htmlFor="autoAceptar" className="cursor-pointer">
              Auto-aceptar solicitudes (crea la cita y confirma por email sin revisión manual)
            </Label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Duración Dermocosmética (min)</Label>
              <Input type="number" value={duracionDermo} onChange={(e) => setDuracionDermo(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duración Análisis Bioquímico (min)</Label>
              <Input type="number" value={duracionBio} onChange={(e) => setDuracionBio(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Los horarios por día de la semana y las fechas/horas bloqueadas se editan directamente en la base de datos por ahora
            (campo <code>horariosPorTipo</code> de <code>ConfiguracionCalendario</code>); esta pantalla cubre los ajustes más
            frecuentes.
          </p>
          <Button onClick={guardarCalendario} disabled={actualizarCal.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Sin SMTP ni Resend configurados, los emails solo se registran en los logs del servidor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.emailProvider}
                onChange={(e) => setForm({ ...form, emailProvider: e.target.value as 'smtp' | 'resend' })}
              >
                <option value="smtp">SMTP</option>
                <option value="resend">Resend</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del remitente</Label>
              <Input value={form.emailNombreRemitente} onChange={(e) => setForm({ ...form, emailNombreRemitente: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email remitente</Label>
              <Input value={form.emailRemitente} onChange={(e) => setForm({ ...form, emailRemitente: e.target.value })} />
            </div>
          </div>

          {form.emailProvider === 'resend' ? (
            <div className="space-y-1.5">
              <Label>Resend API Key</Label>
              <Input type="password" value={form.resendApiKey} onChange={(e) => setForm({ ...form, resendApiKey: e.target.value })} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Host SMTP</Label>
                <Input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Puerto</Label>
                <Input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Usuario</Label>
                <Input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <Input type="password" value={form.smtpPass} onChange={(e) => setForm({ ...form, smtpPass: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="smtpSecure" checked={form.smtpSecure} onCheckedChange={(c) => setForm({ ...form, smtpSecure: c === true })} />
                <Label htmlFor="smtpSecure" className="cursor-pointer">
                  Conexión segura (TLS/SSL, normalmente puerto 465)
                </Label>
              </div>
            </div>
          )}

          <Button onClick={guardarEmail} disabled={actualizarConfig.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Textos legales</CardTitle>
          <CardDescription>Se muestran en /legal/aviso-legal, /legal/privacidad y /legal/cookies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Aviso legal</Label>
            <Textarea rows={4} value={form.textoAvisoLegal} onChange={(e) => setForm({ ...form, textoAvisoLegal: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Política de privacidad</Label>
            <Textarea rows={4} value={form.textoPoliticaPrivacidad} onChange={(e) => setForm({ ...form, textoPoliticaPrivacidad: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Política de cookies</Label>
            <Textarea rows={4} value={form.textoPoliticaCookies} onChange={(e) => setForm({ ...form, textoPoliticaCookies: e.target.value })} />
          </div>
          <Button onClick={guardarLegal} disabled={actualizarConfig.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
