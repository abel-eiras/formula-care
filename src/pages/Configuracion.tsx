import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Settings, Building2, FlaskConical, Calendar, RefreshCw, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useConfiguracion, useActualizarFarmacia, useActualizarParametrosReferencia, useActualizarValoracionBio } from "@/hooks/useConfiguracion";
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
  const { data: estado, isLoading: loadingEstado } = useGoogleCalendarEstado();
  const { data: calendarios, refetch: refetchCalendarios } = useCalendarios();
  const { data: estadoSync } = useEstadoSincronizacion();
  const configurarCalendario = useConfigurarCalendario();
  const desconectar = useDesconectarGoogleCalendar();
  const sincronizar = useSincronizarDesdeGoogle();
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState<string>("");

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

  if (loadingEstado) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <p>Cargando estado de Google Calendar...</p>
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
            </div>
            {estado?.connected ? (
              <Button variant="destructive" onClick={handleDesconectar} disabled={desconectar.isPending}>
                Desconectar
              </Button>
            ) : (
              <Button onClick={handleConectar} className="gap-2">
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

        {/* Instrucciones */}
        <div className="p-4 rounded-lg border border-muted bg-muted/30">
          <p className="font-semibold mb-2">Instrucciones:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Haz clic en "Conectar con Google" para autorizar el acceso</li>
            <li>Selecciona tu cuenta de Google y otorga los permisos necesarios</li>
            <li>Selecciona el calendario que quieres usar para las citas</li>
            <li>Las citas creadas en el sistema se sincronizarán automáticamente</li>
            <li>Usa el botón "Sincronizar" para traer cambios desde Google Calendar</li>
          </ol>
          <div className="mt-3 p-3 bg-primary/10 rounded border border-primary/20">
            <p className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Sincronización Bidireccional
            </p>
            <p className="text-xs text-muted-foreground">
              Los cambios en el sistema se reflejan en Google Calendar automáticamente. 
              Los cambios en Google Calendar se pueden traer manualmente con el botón "Sincronizar".
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
