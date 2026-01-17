import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Save, Settings, Building2, FlaskConical, Calendar, RefreshCw, CheckCircle2, BookOpen, ExternalLink, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useConfiguracion, useActualizarFarmacia, useActualizarParametrosReferencia, useActualizarValoracionBio, useActualizarCredencialesGoogle, useRedirectUri } from "@/hooks/useConfiguracion";
import { useGoogleCalendarEstado, useCalendarios, iniciarOAuth, useConfigurarCalendario, useDesconectarGoogleCalendar, useEstadoSincronizacion, useSincronizarDesdeGoogle } from "@/hooks/useGoogleCalendar";
import type { ParametroReferencia } from "@/types";

// Mapeo de parámetros con sus etiquetas y unidades
const PARAMETROS_INFO: Record<string, { label: string; unit: string }> = {
  glucemia: { label: "Glucemia", unit: "mg/dL" },
  cholesterol: { label: "Colesterol Total", unit: "mg/dL" },
  cholesterolHDL: { label: "Colesterol HDL", unit: "mg/dL" },
  cholesterolLDL: { label: "Colesterol LDL", unit: "mg/dL" },
  triglycerides: { label: "Triglicéridos", unit: "mg/dL" },
  hemoglobinaGlucosilada: { label: "Hemoglobina Glucosilada (HbA1c)", unit: "%" },
  proteinaCReactiva: { label: "Proteína C Reactiva (PCR)", unit: "mg/L" },
  vitaminaD: { label: "Vitamina D", unit: "ng/mL" },
  ferritina: { label: "Ferritina", unit: "ng/mL" },
  systolic: { label: "Tensión Sistólica", unit: "mmHg" },
  diastolic: { label: "Tensión Diastólica", unit: "mmHg" },
  pulsaciones: { label: "Pulsaciones", unit: "lpm" },
  imc: { label: "Índice de Masa Corporal (IMC)", unit: "kg/m²" },
};

export default function Configuracion() {
  const { data: config, isLoading } = useConfiguracion();
  const actualizarFarmacia = useActualizarFarmacia();
  const actualizarParametros = useActualizarParametrosReferencia();
  const actualizarValoracion = useActualizarValoracionBio();

  // Estado para datos de farmacia
  const [farmaciaData, setFarmaciaData] = useState({
    farmaciaNombre: "",
    farmaciaDireccion: "",
    farmaciaCiudad: "",
    farmaciaTelefono: "",
    farmaciaEmail: "",
    farmaciaWeb: "",
    farmaciaWhatsapp: "",
    farmaciaLogo: "",
  });

  // Estado para parámetros de referencia
  const [parametros, setParametros] = useState<Record<string, ParametroReferencia>>({});

  // Estado para valoración bioquímica
  const [valoracionActiva, setValoracionActiva] = useState(true);

  // Cargar datos cuando se obtiene la configuración
  useEffect(() => {
    if (config) {
      setFarmaciaData({
        farmaciaNombre: config.farmaciaNombre || "",
        farmaciaDireccion: config.farmaciaDireccion || "",
        farmaciaCiudad: config.farmaciaCiudad || "",
        farmaciaTelefono: config.farmaciaTelefono || "",
        farmaciaEmail: config.farmaciaEmail || "",
        farmaciaWeb: config.farmaciaWeb || "",
        farmaciaWhatsapp: config.farmaciaWhatsapp || "",
        farmaciaLogo: config.farmaciaLogo || "",
      });
      setParametros(config.parametrosReferencia || {});
      setValoracionActiva(config.valoracionBioActiva ?? true);
    }
  }, [config]);

  const handleGuardarFarmacia = async () => {
    try {
      await actualizarFarmacia.mutateAsync(farmaciaData);
      toast.success("Datos de la farmacia actualizados correctamente");
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar los datos de la farmacia");
    }
  };

  const handleGuardarParametros = async () => {
    try {
      await actualizarParametros.mutateAsync(parametros);
      toast.success("Parámetros de referencia actualizados correctamente");
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar los parámetros de referencia");
    }
  };

  const handleCambiarValoracion = async (activa: boolean) => {
    try {
      await actualizarValoracion.mutateAsync(activa);
      setValoracionActiva(activa);
      toast.success(`Valoración bioquímica ${activa ? "activada" : "desactivada"}`);
    } catch (error) {
      console.error("Error al actualizar:", error);
      toast.error("Error al actualizar la valoración");
    }
  };

  const actualizarParametro = (parametroId: string, campo: keyof ParametroReferencia, valor: number) => {
    setParametros((prev) => ({
      ...prev,
      [parametroId]: {
        ...prev[parametroId],
        [campo]: valor,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuración
          </h1>
          <p className="text-muted-foreground">Gestiona los datos de la farmacia y parámetros de referencia</p>
        </div>
      </div>

      <Tabs defaultValue="farmacia" className="space-y-6">
        <TabsList>
          <TabsTrigger value="farmacia" className="gap-2">
            <Building2 className="h-4 w-4" />
            Datos de la Farmacia
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Parámetros Bioquímicos
          </TabsTrigger>
          <TabsTrigger value="googleCalendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Google Calendar
          </TabsTrigger>
        </TabsList>

        {/* Tab: Datos de la Farmacia */}
        <TabsContent value="farmacia">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Información de la Farmacia</CardTitle>
              <CardDescription>
                Configura los datos que aparecerán en los informes y documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="farmaciaNombre">Nombre de la Farmacia *</Label>
                  <Input
                    id="farmaciaNombre"
                    value={farmaciaData.farmaciaNombre}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaNombre: e.target.value })}
                    placeholder="Farmacia Pontevea"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmaciaTelefono">Teléfono *</Label>
                  <Input
                    id="farmaciaTelefono"
                    value={farmaciaData.farmaciaTelefono}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaTelefono: e.target.value })}
                    placeholder="981 815 708"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="farmaciaDireccion">Dirección *</Label>
                  <Input
                    id="farmaciaDireccion"
                    value={farmaciaData.farmaciaDireccion}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaDireccion: e.target.value })}
                    placeholder="Avda. Ignacio Varela 16, Pontevea"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="farmaciaCiudad">Ciudad y Código Postal *</Label>
                  <Input
                    id="farmaciaCiudad"
                    value={farmaciaData.farmaciaCiudad}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaCiudad: e.target.value })}
                    placeholder="15883 Teo, A Coruña"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmaciaEmail">Email</Label>
                  <Input
                    id="farmaciaEmail"
                    type="email"
                    value={farmaciaData.farmaciaEmail}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaEmail: e.target.value })}
                    placeholder="farmacia@farmaciapontevea.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmaciaWeb">Sitio Web</Label>
                  <Input
                    id="farmaciaWeb"
                    value={farmaciaData.farmaciaWeb}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaWeb: e.target.value })}
                    placeholder="www.farmaciapontevea.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmaciaWhatsapp">WhatsApp</Label>
                  <Input
                    id="farmaciaWhatsapp"
                    value={farmaciaData.farmaciaWhatsapp}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaWhatsapp: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmaciaLogo">Ruta del Logo</Label>
                  <Input
                    id="farmaciaLogo"
                    value={farmaciaData.farmaciaLogo}
                    onChange={(e) => setFarmaciaData({ ...farmaciaData, farmaciaLogo: e.target.value })}
                    placeholder="/logo.png"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleGuardarFarmacia}
                  disabled={actualizarFarmacia.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {actualizarFarmacia.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Parámetros Bioquímicos */}
        <TabsContent value="parametros">
          <div className="space-y-6">
            {/* Toggle para activar/desactivar valoración */}
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="valoracion-activa" className="text-base font-semibold">
                      Activar Valoración Automática
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Muestra advertencias y estados según los rangos configurados
                    </p>
                  </div>
                  <Switch
                    id="valoracion-activa"
                    checked={valoracionActiva}
                    onCheckedChange={handleCambiarValoracion}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuración de parámetros */}
            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle>Valores de Referencia</CardTitle>
                <CardDescription>
                  Configura los rangos para cada parámetro bioquímico. Los valores se clasifican en:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Normal:</strong> Valores correctos (verde)</li>
                    <li><strong>Advertencia:</strong> Valores que requieren consejo sanitario (amarillo)</li>
                    <li><strong>Crítico:</strong> Valores que requieren control médico (rojo)</li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {Object.keys(PARAMETROS_INFO).map((parametroId) => {
                  const info = PARAMETROS_INFO[parametroId];
                  const param = parametros[parametroId] || {
                    normalMin: 0,
                    normalMax: 0,
                  };

                  return (
                    <div key={parametroId} className="border-b pb-6 last:border-0 last:pb-0">
                      <h3 className="text-lg font-semibold mb-4">{info.label} ({info.unit})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Rango Normal */}
                        <div className="space-y-2">
                          <Label className="text-success">Rango Normal</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.normalMin || ""}
                              onChange={(e) =>
                                actualizarParametro(parametroId, "normalMin", parseFloat(e.target.value) || 0)
                              }
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Máx"
                              value={param.normalMax || ""}
                              onChange={(e) =>
                                actualizarParametro(parametroId, "normalMax", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        </div>

                        {/* Rango Advertencia */}
                        <div className="space-y-2">
                          <Label className="text-warning">Rango Advertencia</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.advertenciaMin || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "advertenciaMin",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Máx"
                              value={param.advertenciaMax || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "advertenciaMax",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Rango Advertencia 2 (opcional) */}
                        <div className="space-y-2">
                          <Label className="text-warning">Rango Advertencia 2 (opcional)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.advertenciaMin2 || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "advertenciaMin2",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Máx"
                              value={param.advertenciaMax2 || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "advertenciaMax2",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Rango Crítico */}
                        <div className="space-y-2">
                          <Label className="text-destructive">Rango Crítico</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.criticoMin || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "criticoMin",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Máx"
                              value={param.criticoMax || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "criticoMax",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                          </div>
                          {/* Rango Crítico 2 (opcional) */}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín 2"
                              value={param.criticoMin2 || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "criticoMin2",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Máx 2"
                              value={param.criticoMax2 || ""}
                              onChange={(e) =>
                                actualizarParametro(
                                  parametroId,
                                  "criticoMax2",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleGuardarParametros}
                    disabled={actualizarParametros.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {actualizarParametros.isPending ? "Guardando..." : "Guardar Parámetros"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Google Calendar */}
        <TabsContent value="googleCalendar">
          <GoogleCalendarConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Componente de configuración de Google Calendar
 */
function GoogleCalendarConfig() {
  const { data: config } = useConfiguracion();
  const { data: estado, isLoading: loadingEstado } = useGoogleCalendarEstado();
  const { data: calendarios, refetch: refetchCalendarios } = useCalendarios();
  const { data: estadoSync } = useEstadoSincronizacion();
  const { data: redirectUriSugerido, error: redirectUriError } = useRedirectUri();
  const configurarCalendario = useConfigurarCalendario();
  const desconectar = useDesconectarGoogleCalendar();
  const sincronizar = useSincronizarDesdeGoogle();
  const actualizarCredenciales = useActualizarCredencialesGoogle();
  
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState<string>("");
  const [mostrarCredenciales, setMostrarCredenciales] = useState(false);
  const [credenciales, setCredenciales] = useState({
    googleClientId: "",
    googleClientSecret: "",
    googleRedirectUri: "",
  });

  const handleConectar = async () => {
    try {
      const authUrl = await iniciarOAuth();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error al iniciar OAuth:", error);
      toast.error("Error al conectar con Google Calendar");
    }
  };

  const handleCargarCalendarios = async () => {
    try {
      await refetchCalendarios();
    } catch (error) {
      console.error("Error al cargar calendarios:", error);
      toast.error("Error al cargar calendarios. Verifica que estés conectado.");
    }
  };

  const handleGuardarCalendario = async () => {
    if (!calendarioSeleccionado) {
      toast.error("Selecciona un calendario");
      return;
    }

    try {
      await configurarCalendario.mutateAsync(calendarioSeleccionado);
      toast.success("Calendario configurado correctamente");
    } catch (error) {
      console.error("Error al configurar calendario:", error);
      toast.error("Error al configurar calendario");
    }
  };

  const handleDesconectar = async () => {
    if (!confirm("¿Estás seguro de que quieres desconectar Google Calendar?")) {
      return;
    }

    try {
      await desconectar.mutateAsync();
      toast.success("Google Calendar desconectado correctamente");
    } catch (error) {
      console.error("Error al desconectar:", error);
      toast.error("Error al desconectar Google Calendar");
    }
  };

  const handleSincronizar = async () => {
    try {
      const resultado = await sincronizar.mutateAsync();
      toast.success(
        `Sincronización completada: ${resultado.cambios} cambio(s) detectado(s)`,
        {
          description: resultado.detalles.length > 0 
            ? resultado.detalles.slice(0, 3).join(", ") + (resultado.detalles.length > 3 ? "..." : "")
            : "No se detectaron cambios",
        }
      );
    } catch (error) {
      console.error("Error al sincronizar:", error);
      toast.error("Error al sincronizar con Google Calendar");
    }
  };

  // Cargar credenciales cuando se obtiene la configuración
  useEffect(() => {
    if (config) {
      setCredenciales(prev => ({
        googleClientId: config.googleClientId || prev.googleClientId || "",
        googleClientSecret: prev.googleClientSecret || "", // No mostrar el secreto por seguridad
        googleRedirectUri: config.googleRedirectUri || redirectUriSugerido || prev.googleRedirectUri || "",
      }));
    } else if (redirectUriSugerido && !credenciales.googleRedirectUri) {
      setCredenciales(prev => ({
        ...prev,
        googleRedirectUri: redirectUriSugerido,
      }));
    }
  }, [config, redirectUriSugerido]);

  // Verificar si hay parámetro de éxito en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleCalendar") === "success") {
      toast.success("¡Cuenta de Google conectada correctamente!");
      // Limpiar URL
      window.history.replaceState({}, "", "/configuracion");
      // Cargar calendarios automáticamente
      handleCargarCalendarios();
    } else if (params.get("googleCalendar") === "error") {
      toast.error("Error al conectar con Google Calendar");
      window.history.replaceState({}, "", "/configuracion");
    }
  }, []);

  const handleGuardarCredenciales = async () => {
    if (!credenciales.googleClientId || !credenciales.googleClientSecret) {
      toast.error("Client ID y Client Secret son requeridos");
      return;
    }

    try {
      const resultado = await actualizarCredenciales.mutateAsync({
        googleClientId: credenciales.googleClientId,
        googleClientSecret: credenciales.googleClientSecret,
        googleRedirectUri: credenciales.googleRedirectUri,
      });
      
      toast.success("Credenciales guardadas correctamente");
      if (resultado.redirectUri) {
        setCredenciales(prev => ({ ...prev, googleRedirectUri: resultado.redirectUri }));
      }
      setMostrarCredenciales(false);
    } catch (error) {
      console.error("Error al guardar credenciales:", error);
      toast.error("Error al guardar credenciales");
    }
  };

  if (loadingEstado) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Cargando estado de Google Calendar...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle>Integración con Google Calendar</CardTitle>
        <CardDescription>
          Sincroniza tus citas con Google Calendar. Las citas de dermocosmética aparecerán en azul y las de análisis bioquímico en verde.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuración de credenciales OAuth */}
        {!estado?.connected && (
          <div className="p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Configuración de Credenciales OAuth
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Antes de conectar, necesitas configurar tus credenciales de Google Cloud Console.
                  {!config?.googleClientId && (
                    <span className="block mt-1 font-medium">
                      Haz clic en "Configurar Credenciales" para comenzar.
                    </span>
                  )}
                </p>
                {config?.googleClientId && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    ✓ Credenciales configuradas. Puedes conectarte ahora.
                  </p>
                )}
              </div>
              <Button
                variant={mostrarCredenciales ? "outline" : "default"}
                onClick={() => setMostrarCredenciales(!mostrarCredenciales)}
                className="gap-2"
              >
                {mostrarCredenciales ? "Ocultar" : "Configurar Credenciales"}
              </Button>
            </div>

            {mostrarCredenciales && (
              <div className="mt-4 space-y-4 p-4 bg-white dark:bg-gray-900 rounded border">
                <div className="space-y-2">
                  <Label htmlFor="google-client-id">Client ID de Google *</Label>
                  <Input
                    id="google-client-id"
                    type="text"
                    placeholder="xxxxx.apps.googleusercontent.com"
                    value={credenciales.googleClientId}
                    onChange={(e) =>
                      setCredenciales({ ...credenciales, googleClientId: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtén este valor desde Google Cloud Console &gt; Credenciales
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-client-secret">Client Secret de Google *</Label>
                  <Input
                    id="google-client-secret"
                    type="password"
                    placeholder="GOCSPX-xxxxxxxxxxxxx"
                    value={credenciales.googleClientSecret}
                    onChange={(e) =>
                      setCredenciales({ ...credenciales, googleClientSecret: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtén este valor desde Google Cloud Console &gt; Credenciales
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-redirect-uri">Redirect URI</Label>
                  <Input
                    id="google-redirect-uri"
                    type="text"
                    value={credenciales.googleRedirectUri}
                    onChange={(e) =>
                      setCredenciales({ ...credenciales, googleRedirectUri: e.target.value })
                    }
                    placeholder="Se calculará automáticamente si se deja vacío"
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta URL debe coincidir exactamente con la configurada en Google Cloud Console.
                    Si se deja vacío, se calculará automáticamente.
                  </p>
                  {(redirectUriSugerido || credenciales.googleRedirectUri) && (
                    <div className="p-2 bg-muted rounded text-xs font-mono">
                      URI sugerida: <code className="text-primary">{redirectUriSugerido || credenciales.googleRedirectUri}</code>
                    </div>
                  )}
                  {redirectUriError && (
                    <p className="text-xs text-muted-foreground text-orange-600 dark:text-orange-400">
                      No se pudo obtener la URI automáticamente. Puedes dejarla vacía o ingresarla manualmente.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleGuardarCredenciales}
                  disabled={actualizarCredenciales.isPending || !credenciales.googleClientId || !credenciales.googleClientSecret}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {actualizarCredenciales.isPending ? "Guardando..." : "Guardar Credenciales"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Estado de conexión */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Estado: {estado?.connected ? "Conectado" : "No conectado"}
              </p>
              {estado?.connected && estado.calendarId && (
                <p className="text-sm text-muted-foreground mt-1">
                  Calendario: {estado.calendarId === "primary" ? "Principal" : estado.calendarId}
                </p>
              )}
              {!estado?.connected && config?.googleClientId && (
                <p className="text-sm text-muted-foreground mt-1">
                  Credenciales configuradas. Listo para conectar.
                </p>
              )}
            </div>
            {estado?.connected ? (
              <Button variant="destructive" onClick={handleDesconectar} disabled={desconectar.isPending}>
                Desconectar
              </Button>
            ) : (
              <Button 
                onClick={handleConectar} 
                className="gap-2"
                disabled={!config?.googleClientId}
              >
                <Calendar className="h-4 w-4" />
                Conectar con Google
              </Button>
            )}
          </div>
        </div>

        {/* Configuración de calendario */}
        {estado?.connected && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Calendario</Label>
              <div className="flex gap-2">
                <Select
                  value={calendarioSeleccionado}
                  onValueChange={setCalendarioSeleccionado}
                  disabled={!calendarios || calendarios.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un calendario" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarios?.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.summary} {cal.primary && "(Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleCargarCalendarios}>
                  Actualizar Lista
                </Button>
              </div>
              {calendarios && calendarios.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No se encontraron calendarios. Haz clic en "Actualizar Lista" para cargarlos.
                </p>
              )}
            </div>

            {calendarioSeleccionado && (
              <Button
                onClick={handleGuardarCalendario}
                disabled={configurarCalendario.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {configurarCalendario.isPending ? "Guardando..." : "Guardar Calendario"}
              </Button>
            )}
          </div>
        )}

        {/* Estado de sincronización */}
        {estado?.connected && estadoSync && (
          <div className="p-4 rounded-lg border border-muted bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">Estado de Sincronización</p>
                <p className="text-sm text-muted-foreground">
                  {estadoSync.citasSincronizadas} de {estadoSync.totalCitas} citas sincronizadas ({estadoSync.porcentaje}%)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSincronizar}
                disabled={sincronizar.isPending}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${sincronizar.isPending ? "animate-spin" : ""}`} />
                Sincronizar
              </Button>
            </div>
            {estadoSync.porcentaje < 100 && estadoSync.totalCitas > 0 && (
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${estadoSync.porcentaje}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Información sobre colores */}
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
          <p className="font-semibold mb-2">Colores de las citas:</p>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span>Dermocosmética (Azul)</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span>Análisis Bioquímico (Verde)</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-300"></div>
              <span>Consulta General (Lavanda)</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-400"></div>
              <span>Seguimiento (Amarillo)</span>
            </li>
          </ul>
        </div>

        {/* Tutorial Completo */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tutorial" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">Manual de Configuración Completo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <TutorialGoogleCalendar />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

/**
 * Componente del tutorial completo de Google Calendar
 */
function TutorialGoogleCalendar() {
  return (
    <div className="space-y-6 text-sm">
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📋 Antes de comenzar
        </p>
        <p className="text-blue-800 dark:text-blue-200 text-xs">
          Necesitarás una cuenta de Google y acceso a Google Cloud Console. 
          Este proceso toma aproximadamente 10-15 minutos.
        </p>
      </div>

      {/* Paso 1 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Crear Proyecto en Google Cloud Console</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                Abre tu navegador y ve a{" "}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Google Cloud Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Inicia sesión con tu cuenta de Google (la misma que usarás para el calendario)
              </li>
              <li>
                En la parte superior, haz clic en el selector de proyectos (junto al logo de Google Cloud)
              </li>
              <li>
                Haz clic en <strong>"Nuevo Proyecto"</strong> o selecciona uno existente
              </li>
              <li>
                Si creas uno nuevo:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Nombre: <code className="bg-muted px-1 rounded">Farmacia Pontevea</code></li>
                  <li>Haz clic en <strong>"Crear"</strong></li>
                  <li>Espera unos segundos y selecciona el proyecto recién creado</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Paso 2 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Habilitar Google Calendar API</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                En el menú lateral izquierdo, busca y haz clic en{" "}
                <strong>"APIs y servicios"</strong> o{" "}
                <strong>"APIs & Services"</strong>
              </li>
              <li>
                Haz clic en <strong>"Biblioteca"</strong> o{" "}
                <strong>"Library"</strong>
              </li>
              <li>
                En el buscador, escribe: <code className="bg-muted px-1 rounded">Google Calendar API</code>
              </li>
              <li>
                Haz clic en el resultado <strong>"Google Calendar API"</strong>
              </li>
              <li>
                Haz clic en el botón azul <strong>"Habilitar"</strong> o{" "}
                <strong>"Enable"</strong>
              </li>
              <li>
                Espera unos segundos hasta que aparezca el mensaje de confirmación
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Paso 3 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Configurar Pantalla de Consentimiento OAuth</h3>
            <p className="text-muted-foreground text-xs mb-2">
              Solo necesitas hacer esto la primera vez que configuras OAuth en tu proyecto.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                En el menú lateral, ve a <strong>"APIs y servicios"</strong> →{" "}
                <strong>"Pantalla de consentimiento"</strong> o{" "}
                <strong>"OAuth consent screen"</strong>
              </li>
              <li>
                Selecciona <strong>"Externo"</strong> o{" "}
                <strong>"External"</strong> y haz clic en{" "}
                <strong>"Crear"</strong>
              </li>
              <li>
                Completa el formulario:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    <strong>Nombre de la aplicación:</strong>{" "}
                    <code className="bg-muted px-1 rounded">Farmacia Pontevea Servicios</code>
                  </li>
                  <li>
                    <strong>Email de soporte:</strong> Tu email de contacto
                  </li>
                  <li>
                    <strong>Email del desarrollador:</strong> Tu email (puede ser el mismo)
                  </li>
                </ul>
              </li>
              <li>
                Haz clic en <strong>"Guardar y continuar"</strong> o{" "}
                <strong>"Save and Continue"</strong>
              </li>
              <li>
                En <strong>"Scopes"</strong>, haz clic en{" "}
                <strong>"Guardar y continuar"</strong> (no necesitas agregar scopes manualmente)
              </li>
              <li>
                En <strong>"Usuarios de prueba"</strong>, agrega tu email de Google si es necesario, luego{" "}
                <strong>"Guardar y continuar"</strong>
              </li>
              <li>
                En <strong>"Resumen"</strong>, revisa la información y haz clic en{" "}
                <strong>"Volver al panel"</strong>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Paso 4 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Obtener Redirect URI de la Aplicación</h3>
            <p className="text-muted-foreground text-xs mb-2">
              Primero necesitas saber cuál es la URL de redirección de tu aplicación desplegada.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                En esta misma página (arriba, en la sección naranja), haz clic en{" "}
                <strong>"Configurar Credenciales"</strong>
              </li>
              <li>
                Se desplegará un formulario. En el campo <strong>"Redirect URI"</strong> verás una URL 
                que se calcula automáticamente (o haz clic en "Actualizar" si no aparece)
              </li>
              <li>
                <strong>Copia esa URL completa</strong> - la necesitarás en el siguiente paso
              </li>
              <li>
                La URL será algo como: <code className="bg-muted px-1 rounded">https://tu-dominio.com/api/google-calendar/callback</code>
              </li>
              <li>
                <strong>No cierres esta página</strong> - volverás aquí después de configurar Google Cloud Console
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Paso 5 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            5
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Crear Credenciales OAuth 2.0 en Google Cloud Console</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                En el menú lateral de Google Cloud Console, ve a <strong>"APIs y servicios"</strong> →{" "}
                <strong>"Credenciales"</strong> o{" "}
                <strong>"Credentials"</strong>
              </li>
              <li>
                Haz clic en el botón <strong>"+ Crear credenciales"</strong> o{" "}
                <strong>"+ Create Credentials"</strong>
              </li>
              <li>
                Selecciona <strong>"ID de cliente de OAuth"</strong> o{" "}
                <strong>"OAuth client ID"</strong>
              </li>
              <li>
                Si te pide configurar la pantalla de consentimiento, vuelve al paso 3
              </li>
              <li>
                En <strong>"Tipo de aplicación"</strong>, selecciona{" "}
                <strong>"Aplicación web"</strong> o{" "}
                <strong>"Web application"</strong>
              </li>
              <li>
                Completa el formulario:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    <strong>Nombre:</strong>{" "}
                    <code className="bg-muted px-1 rounded">Farmacia Pontevea Web Client</code>
                  </li>
                  <li>
                    <strong>URI de redirección autorizadas:</strong>
                    <div className="mt-1 space-y-1">
                      <div className="bg-muted p-2 rounded text-xs">
                        <strong>Pega aquí la URL que copiaste en el paso 4</strong>
                        <br />
                        <span className="text-muted-foreground">
                          Debe ser exactamente igual, incluyendo https:// y sin espacios
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ <strong>Importante:</strong> Esta URL debe coincidir EXACTAMENTE con la que viste en la aplicación.
                      Si no coincide, la conexión fallará.
                    </p>
                  </li>
                </ul>
              </li>
              <li>
                Haz clic en <strong>"Crear"</strong> o{" "}
                <strong>"Create"</strong>
              </li>
              <li>
                <strong className="text-foreground">¡IMPORTANTE!</strong> Se abrirá una ventana con tus credenciales:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    <strong>ID de cliente:</strong> Copia este valor completo (lo necesitarás en el siguiente paso)
                  </li>
                  <li>
                    <strong>Secreto de cliente:</strong> Copia este valor completo (lo necesitarás en el siguiente paso)
                  </li>
                </ul>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 mt-2">
                  <p className="text-xs text-yellow-900 dark:text-yellow-100">
                    ⚠️ <strong>Guarda estos valores de forma segura.</strong> El secreto de cliente solo se muestra una vez.
                    Si lo pierdes, tendrás que crear nuevas credenciales.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Paso 6 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            6
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Configurar Credenciales en la Aplicación</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                Vuelve a esta página (si la cerraste) y haz clic en el botón{" "}
                <strong>"Configurar Credenciales"</strong> (arriba, en la sección naranja)
              </li>
              <li>
                Se desplegará un formulario con tres campos:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    <strong>Client ID:</strong> Pega el <strong>ID de cliente</strong> que copiaste del paso 5
                  </li>
                  <li>
                    <strong>Client Secret:</strong> Pega el <strong>Secreto de cliente</strong> que copiaste del paso 5
                  </li>
                  <li>
                    <strong>Redirect URI:</strong> Ya debería estar rellenado automáticamente con la URL correcta.
                    Si no, cópiala del paso 4.
                  </li>
                </ul>
              </li>
              <li>
                Haz clic en <strong>"Guardar Credenciales"</strong>
              </li>
              <li>
                Verás un mensaje de confirmación: <strong>"Credenciales guardadas correctamente"</strong>
              </li>
              <li>
                El formulario se ocultará y verás que ahora puedes hacer clic en{" "}
                <strong>"Conectar con Google"</strong>
              </li>
            </ol>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-3 mt-2">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                💡 <strong>Tip:</strong> La Redirect URI se calcula automáticamente basándose en la URL
                de tu aplicación desplegada. Si cambias de servidor o dominio, actualiza también
                la Redirect URI en Google Cloud Console.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Paso 7 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            7
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base">Conectar con Google Calendar</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                Asegúrate de haber completado los pasos anteriores (especialmente el paso 6)
              </li>
              <li>
                En esta misma página, haz clic en el botón{" "}
                <strong>"Conectar con Google"</strong> (arriba, en la sección de estado)
              </li>
              <li>
                Se abrirá una nueva ventana o pestaña con la autorización de Google
              </li>
              <li>
                Selecciona la cuenta de Google que quieres usar (la misma que tiene el calendario)
              </li>
              <li>
                Revisa los permisos solicitados y haz clic en{" "}
                <strong>"Permitir"</strong> o{" "}
                <strong>"Allow"</strong>
              </li>
              <li>
                Serás redirigido de vuelta a esta página con un mensaje de éxito
              </li>
              <li>
                Haz clic en <strong>"Actualizar Lista"</strong> para cargar tus calendarios
              </li>
              <li>
                Selecciona el calendario que quieres usar (puede ser "Principal" o uno específico)
              </li>
              <li>
                Haz clic en <strong>"Guardar Calendario"</strong>
              </li>
              <li>
                ¡Listo! Las citas ahora se sincronizarán automáticamente con Google Calendar
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          ¿Cómo funciona la sincronización?
        </p>
        <ul className="text-green-800 dark:text-green-200 text-xs space-y-1 list-disc list-inside">
          <li>
            <strong>Del sistema → Google Calendar:</strong> Automática. Cuando creas, editas o eliminas una cita aquí, se actualiza en Google Calendar
          </li>
          <li>
            <strong>De Google Calendar → Sistema:</strong> Manual. Usa el botón "Sincronizar" para traer cambios desde Google Calendar
          </li>
          <li>
            Las citas aparecen con colores diferentes según el tipo (Dermo=Azul, Bio=Verde)
          </li>
        </ul>
      </div>

      {/* Solución de problemas */}
      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <p className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
          🔧 Solución de Problemas Comunes
        </p>
        <div className="space-y-2 text-xs text-orange-800 dark:text-orange-200">
          <div>
            <strong>Error "redirect_uri_mismatch":</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Verifica que la URL en Google Cloud Console sea exactamente igual a la del .env</li>
              <li>No debe haber espacios al inicio o final</li>
              <li>Debe coincidir exactamente (http vs https, localhost vs dominio)</li>
            </ul>
          </div>
          <div>
            <strong>Error "invalid_grant":</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>El token puede haber expirado</li>
              <li>Haz clic en "Desconectar" y vuelve a conectar</li>
            </ul>
          </div>
          <div>
            <strong>Las citas no se sincronizan:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Verifica que Google Calendar esté habilitado (debe aparecer "Conectado")</li>
              <li>Verifica que hayas seleccionado un calendario</li>
              <li>Revisa la consola del backend para ver errores</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enlaces útiles */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="font-semibold mb-2 text-sm">🔗 Enlaces Útiles</p>
        <div className="space-y-1 text-xs">
          <a
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            Google Cloud Console
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            Google Calendar API (directo)
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            Credenciales OAuth (directo)
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
