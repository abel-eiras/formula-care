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
import { ArrowLeft, Save, Settings, Building2, FlaskConical, Calendar as CalendarIcon, Plus, Trash2, GripVertical, Eye, EyeOff, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useConfiguracion, useActualizarFarmacia, useActualizarParametrosReferencia, useActualizarValoracionBio, useActualizarParametrosBioConfig, useConfiguracionCalendario, useActualizarConfiguracionCalendario } from "@/hooks/useConfiguracion";
import { useEventos, useCrearEvento, useActualizarEvento, useEliminarEvento } from "@/hooks/useEventos";
import type { Evento, ParametroBioConfig } from "@/types";
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
  // Grupo: Tensión
  { id: "systolic", label: "Tensión Sistólica", unit: "mmHg", grupo: "tension", activo: true, orden: 1 },
  { id: "diastolic", label: "Tensión Diastólica", unit: "mmHg", grupo: "tension", activo: true, orden: 2 },
  { id: "pulsaciones", label: "Pulsaciones", unit: "lpm", grupo: "tension", activo: true, orden: 3 },
  // Grupo: Corporales
  { id: "imc", label: "Índice de Masa Corporal (IMC)", unit: "kg/m²", grupo: "corporales", activo: true, orden: 1 },
];

const GRUPOS_INFO: Record<string, { label: string; color: string }> = {
  basicos: { label: "Parámetros Básicos", color: "text-primary" },
  avanzados: { label: "Parámetros Avanzados", color: "text-secondary" },
  tension: { label: "Tensión Arterial y Pulsaciones", color: "text-destructive" },
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
        <TabsList>
          <TabsTrigger value="farmacia" className="gap-2">
            <Building2 className="h-4 w-4" />
            Datos de la Farmacia
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Parámetros Bioquímicos
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendario
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
            {Object.entries(GRUPOS_INFO).map(([grupo, info]) => {
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
                      {parametrosGrupo.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No hay parámetros en este grupo
                        </p>
                      ) : (
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
