import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileText, Lightbulb, Plus, Printer, Salad, TrendingUp, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogoNuevoPaciente } from "@/components/pacientes/DialogoNuevoPaciente";
import { EvolucionNutricion } from "@/components/nutricion/EvolucionNutricion";
import { FormularioPrograma } from "@/components/nutricion/FormularioPrograma";
import { PanelSugerencias } from "@/components/nutricion/PanelSugerencias";
import { RegistroAlimentacion } from "@/components/nutricion/RegistroAlimentacion";
import { formatearDiferencia, formatearFecha } from "@/lib/nutricion/formulario";
import { usePacientes } from "@/hooks/usePacientes";
import { useProgramaNutricion, useProgramasNutricion } from "@/hooks/useNutricion";
import { ESTADOS_PROGRAMA, etiqueta, FARMACOS_GLP1 } from "@/lib/nutricion/catalogos";
import { ordenarVisitas, visitaReferencia } from "@/lib/nutricion/metricas";
import { generarSugerencias } from "@/lib/nutricion/sugerencias";
import type { ProgramaNutricionDetalle } from "@/types";
import { textoEdad } from "@/lib/edad";
import { imprimirRuta } from "@/lib/imprimir";

const COLOR_ESTADO: Record<string, string> = {
  activo: "bg-success-soft text-success border-success/20",
  pausado: "bg-warning-soft text-warning border-warning/20",
  finalizado: "bg-muted text-muted-foreground",
};

/** Listado de visitas del programa con acceso a cada una */
function ListaVisitas({ programa }: { programa: ProgramaNutricionDetalle }) {
  const visitas = useMemo(() => ordenarVisitas(programa.visitas).reverse(), [programa.visitas]);
  const pesoInicial = visitaReferencia(programa.visitas)?.peso;
  const total = visitas.length;

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Visitas</CardTitle>
        <Button asChild className="gap-2">
          <Link to={`/servicios/nutricion/visita?programaId=${programa.id}`}>
            <Plus className="h-4 w-4" />
            {total === 0 ? "Visita inicial" : "Nueva visita de seguimiento"}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Registra la visita inicial con las medidas, hábitos y tratamiento de partida.
          </p>
        ) : (
          <div className="divide-y">
            {visitas.map((v, i) => {
              const diferencia = pesoInicial != null && v.peso != null ? Math.round((v.peso - pesoInicial) * 10) / 10 : null;
              return (
                <div key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Sesión {total - i}</span>
                      <Badge variant={v.tipo === "inicial" ? "default" : "secondary"}>
                        {v.tipo === "inicial" ? "Inicial" : "Seguimiento"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{formatearFecha(v.fecha)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[
                        v.peso != null && `Peso ${v.peso} kg${diferencia ? ` (${formatearDiferencia(diferencia, "kg")})` : ""}`,
                        v.imc != null && `IMC ${v.imc}`,
                        v.glp1Activo && `GLP-1: ${etiqueta(FARMACOS_GLP1, v.glp1Farmaco) || "sí"}${v.glp1Dosis ? ` ${v.glp1Dosis}` : ""}`,
                        v.adherencia != null && `Adherencia ${v.adherencia}/10`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sin medidas registradas"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => imprimirRuta(`/servicios/nutricion/print?visitaId=${v.id}`)}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/servicios/nutricion/visita?programaId=${programa.id}&id=${v.id}`}>Abrir</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Contenido de un programa: pestañas de visitas, evolución, registro, sugerencias y datos */
function DetallePrograma({ programaId, pacienteId }: { programaId: string; pacienteId: string }) {
  const { data: programa, isLoading } = useProgramaNutricion(programaId);

  const sugerencias = useMemo(
    () =>
      programa ? generarSugerencias({ programa, visitas: programa.visitas, registros: programa.registros }) : [],
    [programa]
  );

  if (isLoading || !programa) return <LoadingSpinner />;

  return (
    <Tabs defaultValue="visitas" className="space-y-6">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="visitas" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Visitas ({programa.visitas.length})
        </TabsTrigger>
        <TabsTrigger value="evolucion" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Evolución
        </TabsTrigger>
        <TabsTrigger value="registro" className="gap-2">
          <Utensils className="h-4 w-4" />
          Registro de alimentación ({programa.registros.length})
        </TabsTrigger>
        <TabsTrigger value="sugerencias" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Sugerencias ({sugerencias.length})
        </TabsTrigger>
        <TabsTrigger value="datos" className="gap-2">
          <FileText className="h-4 w-4" />
          Datos del programa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="visitas">
        <ListaVisitas programa={programa} />
      </TabsContent>
      <TabsContent value="evolucion">
        <EvolucionNutricion programa={programa} visitas={programa.visitas} />
      </TabsContent>
      <TabsContent value="registro">
        <RegistroAlimentacion programaId={programa.id} registros={programa.registros} />
      </TabsContent>
      <TabsContent value="sugerencias">
        <PanelSugerencias sugerencias={sugerencias} />
        <p className="text-xs text-muted-foreground mt-2">
          Calculadas sobre la última visita y todo el registro de alimentación. Para añadirlas a las recomendaciones del
          paciente, abre la visita.
        </p>
      </TabsContent>
      <TabsContent value="datos">
        {/* La key recarga el formulario si cambian los datos guardados */}
        <FormularioPrograma key={programa.updatedAt} pacienteId={pacienteId} programa={programa} />
      </TabsContent>
    </Tabs>
  );
}

/**
 * Servicio de nutrición (con seguimiento GLP-1 opcional).
 * URL: /servicios/nutricion?pacienteId=...&programaId=...
 */
export default function ServicioNutricion() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pacienteId = searchParams.get("pacienteId") ?? "";
  const programaIdParam = searchParams.get("programaId");
  const [creandoPrograma, setCreandoPrograma] = useState(false);

  const { data: pacientes = [] } = usePacientes();
  const { data: programas = [], isLoading } = useProgramasNutricion(pacienteId || undefined);

  const paciente = pacientes.find((p) => p.id === pacienteId);
  const hayActivo = programas.some((p) => p.estado === "activo");
  // Por defecto se muestra el programa activo o, si no hay, el más reciente
  const programaId =
    programaIdParam ?? programas.find((p) => p.estado === "activo")?.id ?? programas[0]?.id ?? null;
  const programaActual = programas.find((p) => p.id === programaId);

  const cambiarParametros = useCallback(
    (nuevos: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [clave, valor] of Object.entries(nuevos)) {
        if (valor) params.set(clave, valor);
        else params.delete(clave);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const seleccionarPaciente = (id: string) => {
    setCreandoPrograma(false);
    cambiarParametros({ pacienteId: id, programaId: null });
  };

  const mostrarFormularioNuevo = !!pacienteId && !isLoading && (programas.length === 0 || creandoPrograma);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="gap-2 -ml-2">
            <Link to={pacienteId ? `/pacientes/${pacienteId}` : "/"}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Salad className="h-6 w-6 text-primary" />
              Nutrición
            </h1>
            <p className="text-muted-foreground">Seguimiento nutricional, con tratamiento GLP-1 opcional</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => imprimirRuta("/servicios/nutricion/print?tipo=registro")}
        >
          <Printer className="h-4 w-4" />
          Hoja de registro en blanco
        </Button>
      </div>

      {/* Selección de paciente y programa */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="paciente">Paciente *</Label>
              <DialogoNuevoPaciente onPacienteCreado={seleccionarPaciente} />
            </div>
            <Select value={pacienteId} onValueChange={seleccionarPaciente}>
              <SelectTrigger id="paciente">
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - {p.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paciente && (
              <p className="text-sm text-muted-foreground">
                {textoEdad(paciente.birthDate)} · {paciente.sex === "M" ? "Hombre" : paciente.sex === "F" ? "Mujer" : "Otro"}
              </p>
            )}
          </div>

          {programas.length > 0 && !creandoPrograma && (
            <div className="space-y-2">
              <Label htmlFor="programa">Programa</Label>
              <div className="flex gap-2">
                <Select value={programaId ?? ""} onValueChange={(id) => cambiarParametros({ programaId: id })}>
                  <SelectTrigger id="programa">
                    <SelectValue placeholder="Seleccionar programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {programas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        Desde {formatearFecha(p.fechaInicio)} · {etiqueta(ESTADOS_PROGRAMA, p.estado)} · {p.visitas.length} visitas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hayActivo && (
                  <Button variant="outline" className="gap-2 shrink-0" onClick={() => setCreandoPrograma(true)}>
                    <Plus className="h-4 w-4" />
                    Nuevo programa
                  </Button>
                )}
              </div>
              {programaActual && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge className={COLOR_ESTADO[programaActual.estado]}>{etiqueta(ESTADOS_PROGRAMA, programaActual.estado)}</Badge>
                  {programaActual.objetivoPrincipal && <span>Objetivo: {programaActual.objetivoPrincipal}</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!pacienteId && (
        <p className="text-center py-10 text-muted-foreground">Selecciona un paciente para ver o iniciar su programa de nutrición.</p>
      )}

      {pacienteId && isLoading && <LoadingSpinner />}

      {mostrarFormularioNuevo && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Nuevo programa de nutrición</h2>
              <p className="text-sm text-muted-foreground">
                Datos de partida. Las medidas, los hábitos y el tratamiento actual se registran después, en la visita inicial.
              </p>
            </div>
            {creandoPrograma && (
              <Button variant="ghost" onClick={() => setCreandoPrograma(false)}>
                Cancelar
              </Button>
            )}
          </div>
          <FormularioPrograma
            pacienteId={pacienteId}
            onGuardado={(nuevo) => {
              setCreandoPrograma(false);
              cambiarParametros({ programaId: nuevo.id });
            }}
          />
        </div>
      )}

      {pacienteId && programaId && !mostrarFormularioNuevo && (
        <DetallePrograma key={programaId} programaId={programaId} pacienteId={pacienteId} />
      )}
    </div>
  );
}
