import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Settings, Building2, FlaskConical, Calendar as CalendarIcon, Plus, Trash2, GripVertical, Eye, EyeOff, Pencil, Shield, FileText, AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useConfiguracion, useActualizarFarmacia, useActualizarParametrosReferencia, useActualizarValoracionBio, useActualizarParametrosBioConfig, useConfiguracionCalendario, useActualizarConfiguracionCalendario, useConfiguracionRgpd, useActualizarRgpd } from "@/hooks/useConfiguracion";
import { useEventos, useCrearEvento, useActualizarEvento, useEliminarEvento } from "@/hooks/useEventos";
import { usePlantillasEmail, useVariablesPlantilla, useActualizarPlantilla, useRestaurarPlantilla } from "@/hooks/usePlantillasEmail";
import { EditorPlantillaEmail } from "@/components/configuracion/EditorPlantillaEmail";
import type { Evento, ParametroBioConfig, ConfiguracionRgpd, PlantillaEmail } from "@/types";
import { cn } from "@/lib/utils";
import type { ParametroReferencia } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Parámetros por defecto del sistema
const PARAMETROS_DEFAULT: ParametroBioConfig[] = [
  // Grupo: Básicos
  { id: "glucemia", label: "Glucemia", unit: "mg/dL", grupo: "basicos", activo: true, orden: 1 },
  { id: "cholesterol", label: "Colesterol Total", unit: "mg/dL", grupo: "basicos", activo: true, orden: 2 },
  { id: "cholesterolHDL", label: "Colesterol HDL", unit: "mg/dL", grupo: "basicos", activo: true, orden: 3 },
  { id: "cholesterolLDL", label: "Colesterol LDL", unit: "mg/dL", grupo: "basicos", activo: true, orden: 4 },
  { id: "triglycerides", label: "Triglicéridos", unit: "mg/dL", grupo: "basicos", activo: true, orden: 5 },
  // Grupo: Avanzados
  { id: "hemoglobinaGlucosilada", label: "Hemoglobina Glucosilada (HbA1c)", unit: "%", grupo: "avanzados", activo: true, orden: 1 },
  { id: "proteinaCReactiva", label: "Proteína C Reactiva (PCR)", unit: "mg/L", grupo: "avanzados", activo: true, orden: 2 },
  { id: "vitaminaD", label: "Vitamina D", unit: "ng/mL", grupo: "avanzados", activo: true, orden: 3 },
  { id: "ferritina", label: "Ferritina", unit: "ng/mL", grupo: "avanzados", activo: true, orden: 4 },
  // Grupo: Corporales
  { id: "imc", label: "Índice de Masa Corporal (IMC)", unit: "kg/m²", grupo: "corporales", activo: true, orden: 1 },
];

const GRUPOS_INFO: Record<string, { label: string; color: string }> = {
  basicos: { label: "Parámetros Básicos", color: "text-primary" },
  avanzados: { label: "Parámetros Avanzados", color: "text-secondary" },
  corporales: { label: "Medidas Corporales", color: "text-success" },
};

export default function Configuracion() {
  const { data: config, isLoading } = useConfiguracion();
  const actualizarFarmacia = useActualizarFarmacia();
  const actualizarParametros = useActualizarParametrosReferencia();
  const actualizarValoracion = useActualizarValoracionBio();
  const actualizarParametrosBio = useActualizarParametrosBioConfig();

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

  // Estado para configuración de parámetros bioquímicos
  const [parametrosBioConfig, setParametrosBioConfig] = useState<ParametroBioConfig[]>(PARAMETROS_DEFAULT);

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
      // Si hay configuración guardada, usarla; si no, usar los valores por defecto
      if (config.parametrosBioConfig && config.parametrosBioConfig.length > 0) {
        setParametrosBioConfig(config.parametrosBioConfig);
      } else {
        setParametrosBioConfig(PARAMETROS_DEFAULT);
      }
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="farmacia" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Datos de la Farmacia</span>
            <span className="sm:hidden">Farmacia</span>
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Parámetros Bioquímicos</span>
            <span className="sm:hidden">Parámetros</span>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Plantillas Email</span>
            <span className="sm:hidden">Emails</span>
          </TabsTrigger>
          <TabsTrigger value="rgpd" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">RGPD y Legal</span>
            <span className="sm:hidden">RGPD</span>
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
                  <Label htmlFor="farmaciaLogo">Logo de la Farmacia</Label>
                  <div className="flex items-center gap-4">
                    {farmaciaData.farmaciaLogo && (
                      <div className="relative w-24 h-24 border rounded-md overflow-hidden bg-gray-50">
                        <img
                          src={farmaciaData.farmaciaLogo.startsWith('data:') ? farmaciaData.farmaciaLogo : `/microcaya/${farmaciaData.farmaciaLogo}`}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Si falla la carga, ocultar la imagen
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="farmaciaLogo"
                        type="file"
                        accept="image/png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validar que sea PNG
                            if (file.type !== 'image/png') {
                              toast.error('Solo se permiten archivos PNG');
                              return;
                            }
                            // Validar tamaño (máx 2MB)
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('El archivo es demasiado grande. Máximo 2MB');
                              return;
                            }
                            // Convertir a base64
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              setFarmaciaData({ ...farmaciaData, farmaciaLogo: base64String });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formato: PNG. Tamaño máximo: 2MB
                      </p>
                    </div>
                  </div>
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
          <ParametrosBioquimicosTab
            valoracionActiva={valoracionActiva}
            onCambiarValoracion={handleCambiarValoracion}
            parametros={parametros}
            onActualizarParametro={actualizarParametro}
            onGuardarParametros={handleGuardarParametros}
            guardandoParametros={actualizarParametros.isPending}
            parametrosBioConfig={parametrosBioConfig}
            onActualizarParametrosBioConfig={async (nuevoConfig) => {
              try {
                await actualizarParametrosBio.mutateAsync(nuevoConfig);
                setParametrosBioConfig(nuevoConfig);
                toast.success("Configuración de parámetros actualizada");
              } catch (error) {
                console.error("Error:", error);
                toast.error("Error al guardar la configuración");
              }
            }}
            guardandoConfig={actualizarParametrosBio.isPending}
          />
        </TabsContent>

        {/* Tab: Calendario */}
        <TabsContent value="calendario">
          <CalendarioTab />
        </TabsContent>

        {/* Tab: Plantillas Email */}
        <TabsContent value="plantillas">
          <PlantillasEmailTab />
        </TabsContent>

        {/* Tab: RGPD y Legal */}
        <TabsContent value="rgpd">
          <RgpdTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// Componente para el tab de Parámetros Bioquímicos
interface ParametrosBioquimicosTabProps {
  valoracionActiva: boolean;
  onCambiarValoracion: (activa: boolean) => void;
  parametros: Record<string, ParametroReferencia>;
  onActualizarParametro: (id: string, campo: keyof ParametroReferencia, valor: number | undefined) => void;
  onGuardarParametros: () => void;
  guardandoParametros: boolean;
  parametrosBioConfig: ParametroBioConfig[];
  onActualizarParametrosBioConfig: (config: ParametroBioConfig[]) => Promise<void>;
  guardandoConfig: boolean;
}

function ParametrosBioquimicosTab({
  valoracionActiva,
  onCambiarValoracion,
  parametros,
  onActualizarParametro,
  onGuardarParametros,
  guardandoParametros,
  parametrosBioConfig,
  onActualizarParametrosBioConfig,
  guardandoConfig,
}: ParametrosBioquimicosTabProps) {
  const [nuevoParametro, setNuevoParametro] = useState<Partial<ParametroBioConfig>>({
    label: "",
    unit: "",
    grupo: "basicos",
  });
  const [dialogAbierto, setDialogAbierto] = useState(false);
  
  // Estado para edición
  const [parametroEditando, setParametroEditando] = useState<ParametroBioConfig | null>(null);
  const [dialogEdicionAbierto, setDialogEdicionAbierto] = useState(false);

  // Agrupar parámetros por grupo
  const parametrosPorGrupo = parametrosBioConfig.reduce((acc, param) => {
    if (!acc[param.grupo]) acc[param.grupo] = [];
    acc[param.grupo].push(param);
    return acc;
  }, {} as Record<string, ParametroBioConfig[]>);

  // Ordenar parámetros dentro de cada grupo
  Object.keys(parametrosPorGrupo).forEach((grupo) => {
    parametrosPorGrupo[grupo].sort((a, b) => a.orden - b.orden);
  });

  const handleToggleActivo = (id: string) => {
    const nuevaConfig = parametrosBioConfig.map((p) =>
      p.id === id ? { ...p, activo: !p.activo } : p
    );
    onActualizarParametrosBioConfig(nuevaConfig);
  };

  const handleCrearParametro = () => {
    if (!nuevoParametro.label || !nuevoParametro.unit || !nuevoParametro.grupo) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    // Generar ID único
    const id = `custom_${Date.now()}`;
    
    // Encontrar el mayor orden en el grupo
    const parametrosGrupo = parametrosBioConfig.filter((p) => p.grupo === nuevoParametro.grupo);
    const maxOrden = parametrosGrupo.length > 0 ? Math.max(...parametrosGrupo.map((p) => p.orden)) : 0;

    const nuevo: ParametroBioConfig = {
      id,
      label: nuevoParametro.label,
      unit: nuevoParametro.unit,
      grupo: nuevoParametro.grupo as ParametroBioConfig["grupo"],
      activo: true,
      orden: maxOrden + 1,
      esPersonalizado: true,
    };

    onActualizarParametrosBioConfig([...parametrosBioConfig, nuevo]);
    setNuevoParametro({ label: "", unit: "", grupo: "basicos" });
    setDialogAbierto(false);
    toast.success("Parámetro creado correctamente");
  };

  const handleEliminarParametro = (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este parámetro?")) {
      return;
    }
    const nuevaConfig = parametrosBioConfig.filter((p) => p.id !== id);
    onActualizarParametrosBioConfig(nuevaConfig);
    toast.success("Parámetro eliminado");
  };

  const handleAbrirEdicion = (param: ParametroBioConfig) => {
    setParametroEditando({ ...param });
    setDialogEdicionAbierto(true);
  };

  const handleGuardarEdicion = () => {
    if (!parametroEditando) return;
    
    if (!parametroEditando.label || !parametroEditando.unit) {
      toast.error("El nombre y la unidad son obligatorios");
      return;
    }

    const nuevaConfig = parametrosBioConfig.map((p) =>
      p.id === parametroEditando.id ? parametroEditando : p
    );
    onActualizarParametrosBioConfig(nuevaConfig);
    setDialogEdicionAbierto(false);
    setParametroEditando(null);
    toast.success("Parámetro actualizado");
  };

  return (
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
              onCheckedChange={onCambiarValoracion}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Parámetros */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parámetros Disponibles</CardTitle>
              <CardDescription>
                Activa o desactiva parámetros según el stock de reactivos. Crea nuevos parámetros personalizados.
              </CardDescription>
            </div>
            <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Parámetro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Parámetro</DialogTitle>
                  <DialogDescription>
                    Añade un nuevo parámetro bioquímico personalizado
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-label">Nombre del Parámetro *</Label>
                    <Input
                      id="nuevo-label"
                      value={nuevoParametro.label || ""}
                      onChange={(e) => setNuevoParametro({ ...nuevoParametro, label: e.target.value })}
                      placeholder="Ej: Ácido Úrico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-unit">Unidad de Medida *</Label>
                    <Input
                      id="nuevo-unit"
                      value={nuevoParametro.unit || ""}
                      onChange={(e) => setNuevoParametro({ ...nuevoParametro, unit: e.target.value })}
                      placeholder="Ej: mg/dL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-grupo">Grupo *</Label>
                    <Select
                      value={nuevoParametro.grupo || "basicos"}
                      onValueChange={(value) => setNuevoParametro({ ...nuevoParametro, grupo: value as ParametroBioConfig["grupo"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GRUPOS_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCrearParametro} disabled={guardandoConfig}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Diálogo de Edición */}
            <Dialog open={dialogEdicionAbierto} onOpenChange={setDialogEdicionAbierto}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Parámetro</DialogTitle>
                  <DialogDescription>
                    Modifica los datos del parámetro bioquímico
                  </DialogDescription>
                </DialogHeader>
                {parametroEditando && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="editar-label">Nombre del Parámetro *</Label>
                      <Input
                        id="editar-label"
                        value={parametroEditando.label}
                        onChange={(e) => setParametroEditando({ ...parametroEditando, label: e.target.value })}
                        placeholder="Ej: Glucemia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-unit">Unidad de Medida *</Label>
                      <Input
                        id="editar-unit"
                        value={parametroEditando.unit}
                        onChange={(e) => setParametroEditando({ ...parametroEditando, unit: e.target.value })}
                        placeholder="Ej: mg/dL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-grupo">Grupo *</Label>
                      <Select
                        value={parametroEditando.grupo}
                        onValueChange={(value) => setParametroEditando({ ...parametroEditando, grupo: value as ParametroBioConfig["grupo"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GRUPOS_INFO).map(([key, info]) => (
                            <SelectItem key={key} value={key}>
                              {info.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogEdicionAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGuardarEdicion} disabled={guardandoConfig}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(GRUPOS_INFO)
              .filter(([grupo]) => {
                // Ocultar grupos vacíos
                const parametrosGrupo = parametrosPorGrupo[grupo] || [];
                return parametrosGrupo.length > 0;
              })
              .map(([grupo, info]) => {
              const parametrosGrupo = parametrosPorGrupo[grupo] || [];
              const activos = parametrosGrupo.filter((p) => p.activo).length;
              
              return (
                <AccordionItem key={grupo} value={grupo} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className={cn("font-semibold", info.color)}>{info.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {activos}/{parametrosGrupo.length} activos
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {
                        parametrosGrupo.map((param) => (
                          <div
                            key={param.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-md border",
                              param.activo ? "bg-background" : "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-medium", !param.activo && "text-muted-foreground")}>
                                    {param.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">({param.unit})</span>
                                  {param.esPersonalizado && (
                                    <Badge variant="outline" className="text-xs">
                                      Personalizado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActivo(param.id)}
                                title={param.activo ? "Desactivar" : "Activar"}
                              >
                                {param.activo ? (
                                  <Eye className="h-4 w-4 text-primary" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAbrirEdicion(param)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEliminarParametro(param.id)}
                                className="text-destructive hover:text-destructive"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Valores de Referencia - Solo para parámetros activos */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>Valores de Referencia</CardTitle>
          <CardDescription>
            Configura los rangos para cada parámetro bioquímico activo. Los valores se clasifican en:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Normal:</strong> Valores correctos (verde)</li>
              <li><strong>Advertencia:</strong> Valores que requieren consejo sanitario (amarillo)</li>
              <li><strong>Crítico:</strong> Valores que requieren control médico (rojo)</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-8">
              {parametrosBioConfig
                .filter((p) => p.activo)
                .map((paramConfig) => {
                  const param = parametros[paramConfig.id] || {
                    normalMin: 0,
                    normalMax: 0,
                  };

                  return (
                    <div key={paramConfig.id} className="border-b pb-6 last:border-0 last:pb-0">
                      <h3 className="text-lg font-semibold mb-4">
                        {paramConfig.label} ({paramConfig.unit})
                        {paramConfig.esPersonalizado && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Personalizado
                          </Badge>
                        )}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Rango Normal */}
                        <div className="space-y-2">
                          <Label className="text-green-600">Rango Normal</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.normalMin || ""}
                              onChange={(e) =>
                                onActualizarParametro(paramConfig.id, "normalMin", parseFloat(e.target.value) || 0)
                              }
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Máx"
                              value={param.normalMax || ""}
                              onChange={(e) =>
                                onActualizarParametro(paramConfig.id, "normalMax", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        </div>

                        {/* Rango Advertencia */}
                        <div className="space-y-2">
                          <Label className="text-yellow-600">Rango Advertencia</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.advertenciaMin || ""}
                              onChange={(e) =>
                                onActualizarParametro(
                                  paramConfig.id,
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
                                onActualizarParametro(
                                  paramConfig.id,
                                  "advertenciaMax",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Rango Advertencia 2 (opcional) */}
                        <div className="space-y-2">
                          <Label className="text-yellow-600">Rango Advertencia 2</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.advertenciaMin2 || ""}
                              onChange={(e) =>
                                onActualizarParametro(
                                  paramConfig.id,
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
                                onActualizarParametro(
                                  paramConfig.id,
                                  "advertenciaMax2",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Rango Crítico */}
                        <div className="space-y-2">
                          <Label className="text-red-600">Rango Crítico</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Mín"
                              value={param.criticoMin || ""}
                              onChange={(e) =>
                                onActualizarParametro(
                                  paramConfig.id,
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
                                onActualizarParametro(
                                  paramConfig.id,
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
                                onActualizarParametro(
                                  paramConfig.id,
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
                                onActualizarParametro(
                                  paramConfig.id,
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
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={onGuardarParametros}
              disabled={guardandoParametros}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {guardandoParametros ? "Guardando..." : "Guardar Valores de Referencia"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para el tab de Calendario
function CalendarioTab() {
  const { data: configCalendario, isLoading: cargandoConfig } = useConfiguracionCalendario();
  const actualizarConfig = useActualizarConfiguracionCalendario();
  const { data: eventos = [], isLoading: cargandoEventos } = useEventos();
  const crearEvento = useCrearEvento();
  const actualizarEvento = useActualizarEvento();
  const eliminarEvento = useEliminarEvento();

  const [duraciones, setDuraciones] = useState({
    dermo: 45,
    bio: 20,
  });

  const [nuevoEvento, setNuevoEvento] = useState({
    nombre: '',
    descripcion: '',
    fechas: [] as string[], // Array de fechas en formato YYYY-MM-DD
    horas: [''] as string[],
    duracion: 60,
    maxAsistentes: 1,
    activo: true,
  });

  const [editandoEvento, setEditandoEvento] = useState<Evento | null>(null);

  useEffect(() => {
    if (configCalendario) {
      setDuraciones({
        dermo: configCalendario.duracionPorTipo?.dermo || 45,
        bio: configCalendario.duracionPorTipo?.bio || 20,
      });
    }
  }, [configCalendario]);

  const handleGuardarDuraciones = async () => {
    try {
      await actualizarConfig.mutateAsync({
        duracionPorTipo: duraciones,
      });
      toast.success('Duraciones actualizadas correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar las duraciones');
    }
  };

  const handleCrearEvento = async () => {
    try {
      // Validar que haya fechas y horas
      const fechasValidas = nuevoEvento.fechas.filter(f => f && f.trim() !== '');
      const horasValidas = nuevoEvento.horas.filter(h => h && h.trim() !== '');

      if (fechasValidas.length === 0) {
        toast.error('Debes añadir al menos una fecha');
        return;
      }

      if (horasValidas.length === 0) {
        toast.error('Debes añadir al menos un horario');
        return;
      }

      await crearEvento.mutateAsync({
        nombre: nuevoEvento.nombre,
        descripcion: nuevoEvento.descripcion || undefined,
        fechas: fechasValidas,
        horas: horasValidas,
        duracion: nuevoEvento.duracion,
        maxAsistentes: nuevoEvento.maxAsistentes,
        activo: nuevoEvento.activo,
      });
      toast.success('Evento creado correctamente');
      setNuevoEvento({
        nombre: '',
        descripcion: '',
        fechas: [],
        horas: [''],
        duracion: 60,
        maxAsistentes: 1,
        activo: true,
      });
    } catch (error) {
      console.error('Error al crear evento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el evento';
      toast.error(errorMessage);
    }
  };

  const handleEliminarEvento = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;
    try {
      await eliminarEvento.mutateAsync(id);
      toast.success('Evento eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      toast.error('Error al eliminar el evento');
    }
  };

  const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

  if (cargandoConfig || cargandoEventos) {
    return <div className="text-center py-8">Cargando configuración del calendario...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Duraciones por tipo de servicio */}
      <Card>
        <CardHeader>
          <CardTitle>Duración de Servicios</CardTitle>
          <CardDescription>
            Configura la duración en minutos para cada tipo de servicio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracionDermo">Dermocosmética (minutos)</Label>
              <Input
                id="duracionDermo"
                type="number"
                min="1"
                value={duraciones.dermo}
                onChange={(e) => setDuraciones({ ...duraciones, dermo: parseInt(e.target.value) || 45 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracionBio">Análisis Bioquímico (minutos)</Label>
              <Input
                id="duracionBio"
                type="number"
                min="1"
                value={duraciones.bio}
                onChange={(e) => setDuraciones({ ...duraciones, bio: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGuardarDuraciones} disabled={actualizarConfig.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Duraciones
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Personalizados</CardTitle>
          <CardDescription>
            Crea y gestiona eventos personalizados que aparecerán en la página de solicitud de citas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulario para nuevo evento */}
          <Accordion type="single" collapsible>
            <AccordionItem value="nuevo-evento">
              <AccordionTrigger>Crear Nuevo Evento</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="eventoNombre">Nombre del Evento *</Label>
                  <Input
                    id="eventoNombre"
                    value={nuevoEvento.nombre}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, nombre: e.target.value })}
                    placeholder="Ej: Taller de automaquillaje"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventoDescripcion">Descripción</Label>
                  <Input
                    id="eventoDescripcion"
                    value={nuevoEvento.descripcion}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
                    placeholder="Descripción opcional del evento"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventoDuracion">Duración (minutos) *</Label>
                    <Input
                      id="eventoDuracion"
                      type="number"
                      min="1"
                      value={nuevoEvento.duracion}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, duracion: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventoMaxAsistentes">Máx. Asistentes *</Label>
                    <Input
                      id="eventoMaxAsistentes"
                      type="number"
                      min="1"
                      value={nuevoEvento.maxAsistentes}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, maxAsistentes: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fechas Disponibles (formato: DD-MM-AAAA) *</Label>
                  <div className="space-y-3">
                    {nuevoEvento.fechas.map((fecha, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !fecha && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fecha ? (
                                  format(new Date(fecha + 'T00:00:00'), "dd-MM-yyyy", { locale: es })
                                ) : (
                                  <span>Selecciona una fecha</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={fecha ? new Date(fecha + 'T00:00:00') : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const nuevasFechas = [...nuevoEvento.fechas];
                                    nuevasFechas[index] = format(date, 'yyyy-MM-dd');
                                    setNuevoEvento({ ...nuevoEvento, fechas: nuevasFechas });
                                  }
                                }}
                                locale={es}
                                weekStartsOn={1} // Lunes
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setNuevoEvento({
                              ...nuevoEvento,
                              fechas: nuevoEvento.fechas.filter((_, i) => i !== index),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNuevoEvento({ ...nuevoEvento, fechas: [...nuevoEvento.fechas, ''] })}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir Fecha
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puedes añadir múltiples fechas para eventos de varios días, semanas completas o días específicos del mes.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Horarios Disponibles (formato: HH:mm-HH:mm) *</Label>
                  {nuevoEvento.horas.map((hora, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={hora}
                        onChange={(e) => {
                          const nuevasHoras = [...nuevoEvento.horas];
                          nuevasHoras[index] = e.target.value;
                          setNuevoEvento({ ...nuevoEvento, horas: nuevasHoras });
                        }}
                        placeholder="09:00-14:00"
                      />
                      {index === nuevoEvento.horas.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setNuevoEvento({ ...nuevoEvento, horas: [...nuevoEvento.horas, ''] })}
                        >
                          +
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleCrearEvento} 
                  disabled={
                    crearEvento.isPending || 
                    !nuevoEvento.nombre || 
                    nuevoEvento.fechas.length === 0 || 
                    nuevoEvento.fechas.some(f => !f || f.trim() === '') ||
                    nuevoEvento.horas.filter(h => h && h.trim() !== '').length === 0
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  Crear Evento
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Lista de eventos existentes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Eventos Existentes</h3>
            {eventos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay eventos creados aún</p>
            ) : (
              <div className="space-y-3">
                {eventos.map((evento) => (
                  <Card key={evento.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{evento.nombre}</h4>
                          {evento.activo ? (
                            <Badge variant="default" className="bg-green-500">Activo</Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </div>
                        {evento.descripcion && (
                          <p className="text-sm text-muted-foreground mb-2">{evento.descripcion}</p>
                        )}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Duración: {evento.duracion} minutos</p>
                          <p>Máx. asistentes: {evento.maxAsistentes}</p>
                          <p>Fechas: {evento.fechas.length > 0 
                            ? evento.fechas.map(f => {
                                try {
                                  return format(new Date(f + 'T00:00:00'), 'dd-MM-yyyy', { locale: es });
                                } catch {
                                  return f;
                                }
                              }).join(', ')
                            : 'Sin fechas'}</p>
                          <p>Horarios: {evento.horas.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditandoEvento(evento)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEliminarEvento(evento.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Plantillas de textos legales por defecto
const PLANTILLA_AVISO_LEGAL = `AVISO LEGAL

1. DATOS IDENTIFICATIVOS

En cumplimiento con el deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico, a continuación se reflejan los siguientes datos:

[NOMBRE_EMPRESA] con CIF [CIF] y domicilio a efectos de notificaciones en [DIRECCION].

2. USUARIOS

El acceso y/o uso de este portal atribuye la condición de USUARIO, que acepta, desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas.

3. USO DEL PORTAL

El portal proporciona el acceso a información, servicios y datos (en adelante, "los contenidos") propiedad de [NOMBRE_EMPRESA]. El USUARIO asume la responsabilidad del uso del portal.

4. PROTECCIÓN DE DATOS

[NOMBRE_EMPRESA] cumple con las directrices de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales y del Reglamento (UE) 2016/679 del Parlamento Europeo.

5. PROPIEDAD INTELECTUAL E INDUSTRIAL

[NOMBRE_EMPRESA] es titular de todos los derechos de propiedad intelectual e industrial de su página web, así como de los elementos contenidos en la misma.

6. LEGISLACIÓN APLICABLE Y JURISDICCIÓN

Para la resolución de todas las controversias o cuestiones relacionadas con el presente sitio web o de las actividades en él desarrolladas, será de aplicación la legislación española.`;

const PLANTILLA_POLITICA_PRIVACIDAD = `POLÍTICA DE PRIVACIDAD

1. RESPONSABLE DEL TRATAMIENTO

Identidad: [NOMBRE_EMPRESA]
CIF: [CIF]
Dirección: [DIRECCION]
Email de contacto: [EMAIL]

2. FINALIDADES DEL TRATAMIENTO

Los datos personales serán tratados con las siguientes finalidades:
- Gestión de la relación con el paciente
- Prestación de servicios sanitarios de farmacia
- Elaboración de análisis y seguimientos de salud
- Envío de recordatorios de citas y revisiones

3. LEGITIMACIÓN

La base legal para el tratamiento de sus datos es:
- El consentimiento del interesado
- La ejecución de un contrato de prestación de servicios
- El cumplimiento de obligaciones legales (normativa sanitaria)

4. CATEGORÍAS DE DATOS

Tratamos las siguientes categorías de datos:
- Datos identificativos (nombre, teléfono, email)
- Datos de salud (análisis bioquímicos, valoraciones dermatológicas)
- Datos de historial de visitas y tratamientos

5. DESTINATARIOS

Los datos no se cederán a terceros salvo obligación legal.

6. DERECHOS DEL INTERESADO

Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición enviando un email a [EMAIL].

También puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).

7. PERÍODO DE CONSERVACIÓN

Los datos se conservarán durante [RETENCION] años desde la última visita, o el tiempo necesario para cumplir obligaciones legales.`;

const PLANTILLA_POLITICA_COOKIES = `POLÍTICA DE COOKIES

1. ¿QUÉ SON LAS COOKIES?

Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo cuando los visita.

2. ¿QUÉ COOKIES UTILIZAMOS?

Cookies técnicas (necesarias):
- Cookies de sesión para mantener su estado de autenticación
- Cookies de preferencias de usuario

Cookies analíticas (opcionales):
- Solo se activan con su consentimiento
- Nos ayudan a entender cómo se usa la aplicación

3. ¿CÓMO GESTIONAR LAS COOKIES?

Puede configurar su navegador para rechazar cookies. Sin embargo, algunas funcionalidades pueden no estar disponibles.

4. CONSENTIMIENTO

Al acceder a las páginas públicas, le solicitamos su consentimiento para las cookies no esenciales.

5. ACTUALIZACIÓN DE ESTA POLÍTICA

Esta política puede actualizarse. Le recomendamos revisarla periódicamente.`;

const PLANTILLA_CONSENTIMIENTO = `CONSENTIMIENTO INFORMADO PARA EL TRATAMIENTO DE DATOS DE SALUD

Yo, el/la abajo firmante, AUTORIZO expresamente a [NOMBRE_EMPRESA] a:

1. Recoger y almacenar mis datos personales (nombre, teléfono, email) y datos de salud (resultados de análisis, valoraciones dermatológicas, historial de visitas).

2. Utilizar estos datos para:
   - Realizar análisis bioquímicos y valoraciones dermatológicas
   - Elaborar informes de evolución de mi salud
   - Enviarme recordatorios de citas y revisiones por email o teléfono
   - Proporcionarme recomendaciones personalizadas

3. Conservar estos datos durante un período de [RETENCION] años.

He sido informado/a de que:
- Puedo revocar este consentimiento en cualquier momento
- Puedo ejercer mis derechos ARCO-POL contactando con [EMAIL]
- Mis datos no serán cedidos a terceros salvo obligación legal
- Puedo solicitar la portabilidad de mis datos

Fecha: _________________

Firma del paciente: _________________`;

// Componente para el tab de RGPD y Legal
function RgpdTab() {
  const { data: rgpdData, isLoading } = useConfiguracionRgpd();
  const actualizarRgpd = useActualizarRgpd();

  const [formData, setFormData] = useState<ConfiguracionRgpd>({
    rgpdRazonSocial: '',
    rgpdCif: '',
    rgpdDireccionFiscal: '',
    rgpdEmailContacto: '',
    rgpdResponsable: '',
    rgpdDpo: '',
    textoAvisoLegal: '',
    textoPoliticaPrivacidad: '',
    textoPoliticaCookies: '',
    textoConsentimiento: '',
    consentimientoRequerido: true,
    consentimientoVersion: 'v1.0',
    retencionDatosMeses: 60,
  });

  useEffect(() => {
    if (rgpdData) {
      setFormData({
        rgpdRazonSocial: rgpdData.rgpdRazonSocial || '',
        rgpdCif: rgpdData.rgpdCif || '',
        rgpdDireccionFiscal: rgpdData.rgpdDireccionFiscal || '',
        rgpdEmailContacto: rgpdData.rgpdEmailContacto || '',
        rgpdResponsable: rgpdData.rgpdResponsable || '',
        rgpdDpo: rgpdData.rgpdDpo || '',
        textoAvisoLegal: rgpdData.textoAvisoLegal || '',
        textoPoliticaPrivacidad: rgpdData.textoPoliticaPrivacidad || '',
        textoPoliticaCookies: rgpdData.textoPoliticaCookies || '',
        textoConsentimiento: rgpdData.textoConsentimiento || '',
        consentimientoRequerido: rgpdData.consentimientoRequerido ?? true,
        consentimientoVersion: rgpdData.consentimientoVersion || 'v1.0',
        retencionDatosMeses: rgpdData.retencionDatosMeses || 60,
      });
    }
  }, [rgpdData]);

  const handleGuardar = async () => {
    try {
      await actualizarRgpd.mutateAsync(formData);
      toast.success('Configuración RGPD guardada correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la configuración RGPD');
    }
  };

  const handleCargarPlantilla = (tipo: 'avisoLegal' | 'privacidad' | 'cookies' | 'consentimiento') => {
    const reemplazarVariables = (texto: string) => {
      return texto
        .replace(/\[NOMBRE_EMPRESA\]/g, formData.rgpdRazonSocial || '[NOMBRE_EMPRESA]')
        .replace(/\[CIF\]/g, formData.rgpdCif || '[CIF]')
        .replace(/\[DIRECCION\]/g, formData.rgpdDireccionFiscal || '[DIRECCION]')
        .replace(/\[EMAIL\]/g, formData.rgpdEmailContacto || '[EMAIL]')
        .replace(/\[RETENCION\]/g, String(Math.floor((formData.retencionDatosMeses || 60) / 12)));
    };

    switch (tipo) {
      case 'avisoLegal':
        setFormData({ ...formData, textoAvisoLegal: reemplazarVariables(PLANTILLA_AVISO_LEGAL) });
        toast.success('Plantilla de Aviso Legal cargada');
        break;
      case 'privacidad':
        setFormData({ ...formData, textoPoliticaPrivacidad: reemplazarVariables(PLANTILLA_POLITICA_PRIVACIDAD) });
        toast.success('Plantilla de Política de Privacidad cargada');
        break;
      case 'cookies':
        setFormData({ ...formData, textoPoliticaCookies: reemplazarVariables(PLANTILLA_POLITICA_COOKIES) });
        toast.success('Plantilla de Política de Cookies cargada');
        break;
      case 'consentimiento':
        setFormData({ ...formData, textoConsentimiento: reemplazarVariables(PLANTILLA_CONSENTIMIENTO) });
        toast.success('Plantilla de Consentimiento cargada');
        break;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando configuración RGPD...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Aviso informativo */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Información importante</p>
              <p>
                Los textos legales y el banner de cookies solo se mostrarán en las páginas públicas 
                (solicitud de citas, login). El panel interno de la farmacia no requiere estos avisos 
                ya que es de uso exclusivo del personal autorizado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del Responsable */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos del Responsable del Tratamiento
          </CardTitle>
          <CardDescription>
            Información de la empresa que aparecerá en los textos legales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rgpdRazonSocial">Razón Social *</Label>
              <Input
                id="rgpdRazonSocial"
                value={formData.rgpdRazonSocial || ''}
                onChange={(e) => setFormData({ ...formData, rgpdRazonSocial: e.target.value })}
                placeholder="Ej: Farmacia Pontevea S.L."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rgpdCif">CIF/NIF *</Label>
              <Input
                id="rgpdCif"
                value={formData.rgpdCif || ''}
                onChange={(e) => setFormData({ ...formData, rgpdCif: e.target.value })}
                placeholder="Ej: B12345678"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="rgpdDireccionFiscal">Dirección Fiscal *</Label>
              <Input
                id="rgpdDireccionFiscal"
                value={formData.rgpdDireccionFiscal || ''}
                onChange={(e) => setFormData({ ...formData, rgpdDireccionFiscal: e.target.value })}
                placeholder="Ej: Avda. Ignacio Varela 16, 15883 Teo, A Coruña"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rgpdEmailContacto">Email de Contacto RGPD *</Label>
              <Input
                id="rgpdEmailContacto"
                type="email"
                value={formData.rgpdEmailContacto || ''}
                onChange={(e) => setFormData({ ...formData, rgpdEmailContacto: e.target.value })}
                placeholder="Ej: protecciondatos@farmacia.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rgpdResponsable">Responsable del Tratamiento *</Label>
              <Input
                id="rgpdResponsable"
                value={formData.rgpdResponsable || ''}
                onChange={(e) => setFormData({ ...formData, rgpdResponsable: e.target.value })}
                placeholder="Nombre del titular o responsable"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="rgpdDpo">Delegado de Protección de Datos (DPO)</Label>
              <Input
                id="rgpdDpo"
                value={formData.rgpdDpo || ''}
                onChange={(e) => setFormData({ ...formData, rgpdDpo: e.target.value })}
                placeholder="Opcional - Solo si dispone de DPO"
              />
              <p className="text-xs text-muted-foreground">
                El DPO es obligatorio para centros sanitarios que traten datos de salud a gran escala
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Consentimiento */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuración de Consentimiento
          </CardTitle>
          <CardDescription>
            Opciones para la gestión del consentimiento de pacientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="consentimientoRequerido" className="text-base">
                Requerir consentimiento al crear paciente
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Muestra un checkbox de confirmación en el formulario interno
              </p>
            </div>
            <Switch
              id="consentimientoRequerido"
              checked={formData.consentimientoRequerido}
              onCheckedChange={(checked) => setFormData({ ...formData, consentimientoRequerido: checked })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consentimientoVersion">Versión del Consentimiento</Label>
              <Input
                id="consentimientoVersion"
                value={formData.consentimientoVersion || ''}
                onChange={(e) => setFormData({ ...formData, consentimientoVersion: e.target.value })}
                placeholder="Ej: v1.0 - Enero 2026"
              />
              <p className="text-xs text-muted-foreground">
                Actualiza la versión cuando modifiques el texto del consentimiento
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retencionDatosMeses">Período de Retención (meses)</Label>
              <Input
                id="retencionDatosMeses"
                type="number"
                min="12"
                value={formData.retencionDatosMeses || 60}
                onChange={(e) => setFormData({ ...formData, retencionDatosMeses: parseInt(e.target.value) || 60 })}
              />
              <p className="text-xs text-muted-foreground">
                {formData.retencionDatosMeses ? `${Math.floor(formData.retencionDatosMeses / 12)} años` : '5 años'} - 
                La normativa sanitaria recomienda mínimo 5 años
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Textos Legales */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Textos Legales
          </CardTitle>
          <CardDescription>
            Configura los textos que se mostrarán en las páginas públicas. 
            Puedes usar las plantillas como base y personalizarlas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {/* Aviso Legal */}
            <AccordionItem value="aviso-legal" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Aviso Legal</span>
                  {formData.textoAvisoLegal && (
                    <Badge variant="secondary" className="text-xs">Configurado</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCargarPlantilla('avisoLegal')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cargar Plantilla
                  </Button>
                </div>
                <Textarea
                  value={formData.textoAvisoLegal || ''}
                  onChange={(e) => setFormData({ ...formData, textoAvisoLegal: e.target.value })}
                  placeholder="Introduce el texto del Aviso Legal..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Política de Privacidad */}
            <AccordionItem value="politica-privacidad" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Política de Privacidad</span>
                  {formData.textoPoliticaPrivacidad && (
                    <Badge variant="secondary" className="text-xs">Configurado</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCargarPlantilla('privacidad')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cargar Plantilla
                  </Button>
                </div>
                <Textarea
                  value={formData.textoPoliticaPrivacidad || ''}
                  onChange={(e) => setFormData({ ...formData, textoPoliticaPrivacidad: e.target.value })}
                  placeholder="Introduce el texto de la Política de Privacidad..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Política de Cookies */}
            <AccordionItem value="politica-cookies" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Política de Cookies</span>
                  {formData.textoPoliticaCookies && (
                    <Badge variant="secondary" className="text-xs">Configurado</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCargarPlantilla('cookies')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cargar Plantilla
                  </Button>
                </div>
                <Textarea
                  value={formData.textoPoliticaCookies || ''}
                  onChange={(e) => setFormData({ ...formData, textoPoliticaCookies: e.target.value })}
                  placeholder="Introduce el texto de la Política de Cookies..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Consentimiento Informado */}
            <AccordionItem value="consentimiento" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Consentimiento Informado</span>
                  {formData.textoConsentimiento && (
                    <Badge variant="secondary" className="text-xs">Configurado</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCargarPlantilla('consentimiento')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cargar Plantilla
                  </Button>
                </div>
                <Textarea
                  value={formData.textoConsentimiento || ''}
                  onChange={(e) => setFormData({ ...formData, textoConsentimiento: e.target.value })}
                  placeholder="Introduce el texto del Consentimiento Informado..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto se mostrará en la página de solicitud de citas y puede imprimirse para firma física.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleGuardar}
          disabled={actualizarRgpd.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {actualizarRgpd.isPending ? 'Guardando...' : 'Guardar Configuración RGPD'}
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// Componente para el tab de Plantillas de Email
// ==========================================
function PlantillasEmailTab() {
  const { data: config } = useConfiguracion(); // Para el preview del editor
  const { data: plantillas, isLoading } = usePlantillasEmail();
  const { data: variables = [] } = useVariablesPlantilla();
  const actualizarPlantilla = useActualizarPlantilla();
  const restaurarPlantilla = useRestaurarPlantilla();
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string | null>(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Encontrar la plantilla actualmente seleccionada
  const plantillaActual = plantillas?.find(p => p.tipo === plantillaSeleccionada);

  // Seleccionar la primera plantilla por defecto
  useEffect(() => {
    if (plantillas && plantillas.length > 0 && !plantillaSeleccionada) {
      setPlantillaSeleccionada(plantillas[0].tipo);
    }
  }, [plantillas, plantillaSeleccionada]);

  const handleSave = async (datos: Partial<PlantillaEmail>) => {
    if (!plantillaSeleccionada) return;
    await actualizarPlantilla.mutateAsync({ tipo: plantillaSeleccionada, datos });
  };

  const handleRestore = async () => {
    if (!plantillaSeleccionada) return;
    await restaurarPlantilla.mutateAsync(plantillaSeleccionada);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando plantillas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guía de configuración de email para producción */}
      <Card className="shadow-sm border-border/50 border-amber-200 bg-amber-50/30">
        <CardHeader className="cursor-pointer" onClick={() => setMostrarGuia(!mostrarGuia)}>
          <CardTitle className="flex items-center justify-between text-amber-800">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del Servidor de Email
            </div>
            <Button variant="ghost" size="sm" className="text-amber-700">
              {mostrarGuia ? 'Ocultar' : 'Ver guía'}
            </Button>
          </CardTitle>
          <CardDescription className="text-amber-700">
            Los emails se envían a través de un servidor SMTP o Resend. Haz clic para ver cómo configurarlo.
          </CardDescription>
        </CardHeader>
        {mostrarGuia && (
          <CardContent className="space-y-4 text-sm">
            <div className="p-4 bg-white rounded-lg border space-y-4">
              <h4 className="font-semibold text-foreground">Opción 1: SMTP (Gmail, Outlook, servidor propio)</h4>
              <p className="text-muted-foreground">
                Configura las siguientes variables de entorno en tu servidor:
              </p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`# Archivo .env en la carpeta backend/

# Proveedor (smtp o resend)
EMAIL_PROVIDER=smtp

# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM=tu-email@gmail.com`}
              </pre>
              <div className="p-3 bg-blue-50 rounded border border-blue-200 text-blue-800">
                <strong>Gmail:</strong> Debes crear una "Contraseña de aplicación" en{' '}
                <a 
                  href="https://myaccount.google.com/apppasswords" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                >
                  myaccount.google.com/apppasswords
                </a>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border space-y-4">
              <h4 className="font-semibold text-foreground">Opción 2: Resend (Recomendado para producción)</h4>
              <p className="text-muted-foreground">
                Resend es un servicio moderno y fiable para envío de emails transaccionales.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Crea una cuenta en <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">resend.com</a></li>
                <li>Verifica tu dominio (o usa el dominio de pruebas)</li>
                <li>Genera una API Key en el panel de Resend</li>
                <li>Configura las variables de entorno:</li>
              </ol>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`# Archivo .env en la carpeta backend/

EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Email remitente (debe estar verificado en Resend)
SMTP_FROM=citas@tu-dominio.com`}
              </pre>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Estado actual (Desarrollo)</h4>
              <p className="text-green-700 text-sm">
                En modo desarrollo, los emails se envían a{' '}
                <a href="https://ethereal.email" target="_blank" rel="noopener noreferrer" className="underline">
                  Ethereal Email
                </a>{' '}
                (servicio de pruebas). Los emails no llegan a destinatarios reales, pero puedes ver una 
                previsualización en la consola del servidor.
              </p>
            </div>

            <div className="p-3 bg-purple-50 rounded border border-purple-200 text-purple-800">
              <strong>Nota:</strong> Después de configurar las variables de entorno, reinicia el servidor 
              backend para que los cambios surtan efecto.
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Plantillas de Email
          </CardTitle>
          <CardDescription>
            Personaliza los emails que se envían a los pacientes. 
            Puedes usar variables como {"{{nombrePaciente}}"} que se reemplazarán con los datos reales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Selector de plantilla */}
          <div className="mb-6">
            <Label>Seleccionar plantilla</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {plantillas?.map((p) => (
                <Button
                  key={p.tipo}
                  variant={plantillaSeleccionada === p.tipo ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlantillaSeleccionada(p.tipo)}
                >
                  {p.nombre}
                  {!p.activa && (
                    <Badge variant="secondary" className="ml-2 text-xs">Inactiva</Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Editor de plantilla */}
          {plantillaActual && (
            <EditorPlantillaEmail
              plantilla={plantillaActual}
              variables={variables}
              onSave={handleSave}
              onRestore={handleRestore}
              isLoading={actualizarPlantilla.isPending || restaurarPlantilla.isPending}
              config={config}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
