import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Save, Trash2, Salad } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  useActualizarVisitaNutricion,
  useCrearVisitaNutricion,
  useEliminarVisitaNutricion,
} from "@/hooks/useNutricion";
import {
  CALIDAD_SUENO,
  EFECTOS_SECUNDARIOS,
  ESTADO_EJERCICIO,
  EVOLUCION_SUBJETIVA,
  FARMACOS_GLP1,
  FRECUENCIA_PICOTEO,
  CAUSAS_PICOTEO,
  INTENSIDADES,
  NIVEL_ESTRES,
  TIPOS_EJERCICIO,
} from "@/lib/nutricion/catalogos";
import {
  calcularICC,
  calcularIMC,
  clasificarCintura,
  clasificarICC,
  clasificarIMC,
  clasificarTension,
  numeroSesion,
  ordenarVisitas,
  visitaReferencia,
} from "@/lib/nutricion/metricas";
import { generarSugerencias, type Sugerencia } from "@/lib/nutricion/sugerencias";
import { cn } from "@/lib/utils";
import type {
  Calidad,
  DatosVisita,
  EfectoSecundario,
  EstadoEjercicio,
  EvolucionSubjetiva,
  FrecuenciaPicoteo,
  Intensidad,
  NivelEstres,
  ProgramaNutricionDetalle,
  VisitaNutricion,
} from "@/types";
import { BadgeClasificacion, CampoNumero, CampoSiNo, CampoTexto, Escala0a10, OpcionesMultiples, OpcionesUnicas, SeccionFormulario } from "./campos";
import { aEntero, aNumero, aTexto, deNumero, formatearDiferencia, formatearFecha, hoyISO } from "@/lib/nutricion/formulario";
import { PanelSugerencias } from "./PanelSugerencias";
import { imprimirRuta } from "@/lib/imprimir";
import { BotonesInforme } from "@/components/informes/BotonesInforme";
import { nombreInforme } from "@/lib/informePdf";

// ==========================================
// ESTADO DEL FORMULARIO
// ==========================================

/**
 * Estado inicial. En una visita nueva se copian de la anterior los datos que
 * rara vez cambian (altura, medicación, tratamiento GLP-1, pauta) para no
 * volver a teclearlos; las medidas y hábitos se dejan vacíos a propósito.
 */
function estadoInicial(visita: VisitaNutricion | undefined, previa: VisitaNutricion | undefined, farmaceutico: string) {
  const base = visita ?? previa;
  return {
    fecha: visita?.fecha.slice(0, 10) ?? hoyISO(),
    evolucionSubjetiva: (visita?.evolucionSubjetiva ?? null) as EvolucionSubjetiva | null,
    adherencia: visita?.adherencia ?? null,
    motivacion: visita?.motivacion ?? null,
    medicacionHabitual: base?.medicacionHabitual ?? "",
    suplementacion: base?.suplementacion ?? "",
    glp1Activo: base?.glp1Activo ?? false,
    glp1Farmaco: base?.glp1Farmaco ?? "",
    glp1Dosis: base?.glp1Dosis ?? "",
    glp1FechaInicio: base?.glp1FechaInicio?.slice(0, 10) ?? "",
    glp1DosisOlvidadas: deNumero(visita?.glp1DosisOlvidadas),
    efectosSecundarios: visita?.efectosSecundarios ?? [],
    toleranciaObservaciones: visita?.toleranciaObservaciones ?? "",
    cambioDieteticoIniciado: visita?.cambioDieteticoIniciado ?? null,
    pautaDietetica: base?.pautaDietetica ?? "",
    comidasDia: deNumero(visita?.comidasDia),
    racionesProteinaDia: deNumero(visita?.racionesProteinaDia),
    racionesFrutaVerduraDia: deNumero(visita?.racionesFrutaVerduraDia),
    picoteo: visita?.picoteo ?? null,
    picoteoFrecuencia: (visita?.picoteoFrecuencia ?? null) as FrecuenciaPicoteo | null,
    picoteoCausas: visita?.picoteoCausas ?? [],
    aguaLitros: deNumero(visita?.aguaLitros),
    suenoHoras: deNumero(visita?.suenoHoras),
    suenoCalidad: (visita?.suenoCalidad ?? null) as Calidad | null,
    estres: (visita?.estres ?? null) as NivelEstres | null,
    ejercicio: (visita?.ejercicio ?? null) as EstadoEjercicio | null,
    ejercicioTipos: visita?.ejercicioTipos ?? [],
    ejercicioDiasSemana: deNumero(visita?.ejercicioDiasSemana),
    ejercicioMinutosSesion: deNumero(visita?.ejercicioMinutosSesion),
    ejercicioDetalle: visita?.ejercicioDetalle ?? "",
    peso: deNumero(visita?.peso),
    altura: deNumero(base?.altura),
    cintura: deNumero(visita?.cintura),
    cadera: deNumero(visita?.cadera),
    porcentajeGrasa: deNumero(visita?.porcentajeGrasa),
    masaGrasa: deNumero(visita?.masaGrasa),
    masaMagra: deNumero(visita?.masaMagra),
    systolic: deNumero(visita?.systolic),
    diastolic: deNumero(visita?.diastolic),
    pulsaciones: deNumero(visita?.pulsaciones),
    dificultades: visita?.dificultades ?? "",
    observaciones: visita?.observaciones ?? "",
    objetivosProximaSesion: visita?.objetivosProximaSesion ?? "",
    recomendaciones: visita?.recomendaciones ?? "",
    proximaRevision: visita?.proximaRevision?.slice(0, 10) ?? "",
    farmaceutico: visita?.farmaceutico ?? farmaceutico,
  };
}

type EstadoFormulario = ReturnType<typeof estadoInicial>;

/** Convierte el estado del formulario en los datos que espera la API */
function aDatosVisita(form: EstadoFormulario, programaId: string): DatosVisita {
  const ejercita = form.ejercicio !== "no";
  return {
    programaId,
    fecha: form.fecha,
    evolucionSubjetiva: form.evolucionSubjetiva,
    adherencia: form.adherencia,
    motivacion: form.motivacion,
    medicacionHabitual: aTexto(form.medicacionHabitual),
    suplementacion: aTexto(form.suplementacion),
    glp1Activo: form.glp1Activo,
    // Si no hay GLP-1 activo no se guardan restos de datos del tratamiento
    glp1Farmaco: form.glp1Activo ? aTexto(form.glp1Farmaco) : null,
    glp1Dosis: form.glp1Activo ? aTexto(form.glp1Dosis) : null,
    glp1FechaInicio: form.glp1Activo ? aTexto(form.glp1FechaInicio) : null,
    glp1DosisOlvidadas: form.glp1Activo ? aEntero(form.glp1DosisOlvidadas) : null,
    efectosSecundarios: form.efectosSecundarios,
    toleranciaObservaciones: aTexto(form.toleranciaObservaciones),
    cambioDieteticoIniciado: form.cambioDieteticoIniciado,
    pautaDietetica: aTexto(form.pautaDietetica),
    comidasDia: aEntero(form.comidasDia),
    racionesProteinaDia: aEntero(form.racionesProteinaDia),
    racionesFrutaVerduraDia: aEntero(form.racionesFrutaVerduraDia),
    picoteo: form.picoteo,
    picoteoFrecuencia: form.picoteo ? form.picoteoFrecuencia : null,
    picoteoCausas: form.picoteo ? form.picoteoCausas : [],
    aguaLitros: aNumero(form.aguaLitros),
    suenoHoras: aNumero(form.suenoHoras),
    suenoCalidad: form.suenoCalidad,
    estres: form.estres,
    ejercicio: form.ejercicio,
    ejercicioTipos: ejercita ? form.ejercicioTipos : [],
    ejercicioDiasSemana: ejercita ? aEntero(form.ejercicioDiasSemana) : null,
    ejercicioMinutosSesion: ejercita ? aEntero(form.ejercicioMinutosSesion) : null,
    ejercicioDetalle: ejercita ? aTexto(form.ejercicioDetalle) : null,
    peso: aNumero(form.peso),
    altura: aNumero(form.altura),
    cintura: aNumero(form.cintura),
    cadera: aNumero(form.cadera),
    porcentajeGrasa: aNumero(form.porcentajeGrasa),
    masaGrasa: aNumero(form.masaGrasa),
    masaMagra: aNumero(form.masaMagra),
    systolic: aEntero(form.systolic),
    diastolic: aEntero(form.diastolic),
    pulsaciones: aEntero(form.pulsaciones),
    dificultades: aTexto(form.dificultades),
    observaciones: aTexto(form.observaciones),
    objetivosProximaSesion: aTexto(form.objetivosProximaSesion),
    recomendaciones: aTexto(form.recomendaciones),
    proximaRevision: aTexto(form.proximaRevision),
    farmaceutico: aTexto(form.farmaceutico),
  };
}

// ==========================================
// SUBCOMPONENTES
// ==========================================

/** Efectos secundarios: se marcan y se les asigna intensidad */
function SelectorEfectos({
  value,
  onChange,
}: {
  value: EfectoSecundario[];
  onChange: (valor: EfectoSecundario[]) => void;
}) {
  const intensidadDe = (id: string) => value.find((e) => e.id === id)?.intensidad;
  const alternar = (id: string) =>
    onChange(intensidadDe(id) ? value.filter((e) => e.id !== id) : [...value, { id, intensidad: "leve" }]);
  const cambiarIntensidad = (id: string, intensidad: Intensidad) =>
    onChange(value.map((e) => (e.id === id ? { ...e, intensidad } : e)));

  return (
    <div className="space-y-2">
      <Label>Efectos secundarios</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EFECTOS_SECUNDARIOS.map((efecto) => {
          const intensidad = intensidadDe(efecto.id);
          return (
            <div
              key={efecto.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
                intensidad && "border-primary bg-primary/5"
              )}
            >
              <button type="button" aria-pressed={!!intensidad} className="text-sm text-left flex-1" onClick={() => alternar(efecto.id)}>
                {efecto.label}
              </button>
              {intensidad && (
                <div className="flex gap-1">
                  {INTENSIDADES.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => cambiarIntensidad(efecto.id, i.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs border",
                        intensidad === i.id
                          ? i.id === "leve"
                            ? "bg-success text-white border-success"
                            : i.id === "moderada"
                              ? "bg-warning text-white border-warning"
                              : "bg-destructive text-destructive-foreground border-destructive"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// FORMULARIO
// ==========================================

interface FormularioVisitaProps {
  programa: ProgramaNutricionDetalle;
  visita?: VisitaNutricion;
  /** Sexo del paciente con la codificación de la app ("M", "F", "O") */
  sexoPaciente?: string;
  nombrePaciente?: string;
  /** Para enviarle el informe de la visita por email */
  emailPaciente?: string | null;
}

export function FormularioVisita({ programa, visita, sexoPaciente, nombrePaciente, emailPaciente }: FormularioVisitaProps) {
  const navigate = useNavigate();
  const { usuario } = useAuthContext();
  const crear = useCrearVisitaNutricion();
  const actualizar = useActualizarVisitaNutricion();
  const eliminar = useEliminarVisitaNutricion();

  const visitasOrdenadas = useMemo(() => ordenarVisitas(programa.visitas), [programa.visitas]);
  const esInicial = visita ? visita.tipo === "inicial" : programa.visitas.length === 0;
  const referencia = esInicial ? undefined : visitaReferencia(programa.visitas);
  const previa = useMemo(() => {
    if (!visita) return visitasOrdenadas[visitasOrdenadas.length - 1];
    const indice = visitasOrdenadas.findIndex((v) => v.id === visita.id);
    return indice > 0 ? visitasOrdenadas[indice - 1] : undefined;
  }, [visita, visitasOrdenadas]);
  const sesion = visita ? numeroSesion(programa.visitas, visita.id) : programa.visitas.length + 1;

  const [form, setForm] = useState<EstadoFormulario>(() => estadoInicial(visita, previa, usuario?.nombre ?? ""));
  const [anadidas, setAnadidas] = useState<Set<string>>(() => new Set());

  const cambiar = useCallback(
    <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) => setForm((prev) => ({ ...prev, [campo]: valor })),
    []
  );

  // Índices en vivo
  const imc = calcularIMC(aNumero(form.peso), aNumero(form.altura));
  const icc = calcularICC(aNumero(form.cintura), aNumero(form.cadera));
  const cintura = aNumero(form.cintura);
  const tas = aEntero(form.systolic);
  const tad = aEntero(form.diastolic);

  // Sugerencias en vivo: la visita en edición sustituye a la guardada
  const sugerencias = useMemo(() => {
    const borrador: VisitaNutricion = {
      ...aDatosVisita(form, programa.id),
      id: visita?.id ?? "__borrador",
      tipo: esInicial ? "inicial" : "seguimiento",
      imc,
      icc,
    };
    const visitas = [...programa.visitas.filter((v) => v.id !== borrador.id), borrador];
    return generarSugerencias({ programa, visitas, registros: programa.registros, visitaId: borrador.id });
  }, [form, programa, visita?.id, esInicial, imc, icc]);

  const anadirSugerencia = useCallback((s: Sugerencia) => {
    setForm((prev) => ({
      ...prev,
      recomendaciones: prev.recomendaciones.trim() ? `${prev.recomendaciones.trim()}\n• ${s.texto}` : `• ${s.texto}`,
    }));
    setAnadidas((prev) => new Set(prev).add(s.id));
  }, []);

  /** Texto de ayuda con la diferencia respecto a la visita inicial */
  const comparar = (campo: "peso" | "cintura" | "cadera" | "masaGrasa" | "masaMagra" | "porcentajeGrasa", unidad: string) => {
    const inicial = referencia?.[campo];
    const actual = aNumero(form[campo]);
    if (inicial == null) return undefined;
    if (actual == null) return `Inicial: ${inicial} ${unidad}`;
    const diferencia = Math.round((actual - inicial) * 10) / 10;
    const porcentaje = campo === "peso" ? ` (${formatearDiferencia(Math.round((diferencia / inicial) * 1000) / 10, "%")})` : "";
    return `Inicial: ${inicial} ${unidad} · ${formatearDiferencia(diferencia, unidad)}${porcentaje}`;
  };

  const farmacoSeleccionado = FARMACOS_GLP1.find((f) => f.id === form.glp1Farmaco);
  const volverA = `/servicios/nutricion?pacienteId=${programa.pacienteId}&programaId=${programa.id}`;
  const guardando = crear.isPending || actualizar.isPending;

  const guardar = async () => {
    if (!form.fecha) {
      toast.error("Indica la fecha de la visita");
      return;
    }
    try {
      const datos = aDatosVisita(form, programa.id);
      if (visita) {
        await actualizar.mutateAsync({ id: visita.id, ...datos });
        toast.success("Visita actualizada");
      } else {
        const nueva = await crear.mutateAsync(datos);
        toast.success("Visita guardada");
        navigate(`/servicios/nutricion/visita?programaId=${programa.id}&id=${nueva.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar la visita");
    }
  };

  const borrar = async () => {
    if (!visita) return;
    try {
      await eliminar.mutateAsync(visita.id);
      toast.success("Visita eliminada");
      navigate(volverA);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar la visita");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="gap-2 -ml-2">
            <Link to={volverA}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Salad className="h-6 w-6 text-primary" />
              {esInicial ? "Visita inicial" : `Seguimiento · sesión ${sesion}`}
            </h1>
            <p className="text-muted-foreground">
              {nombrePaciente}
              {programa.visitas.length > 0 && !esInicial && referencia && (
                <> · inicio el {formatearFecha(referencia.fecha)}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visita && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 text-destructive" disabled={eliminar.isPending}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta visita?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se borrarán sus medidas y valoraciones. Si es la visita inicial, la siguiente pasará a ser la referencia
                      de la evolución.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={borrar}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => imprimirRuta(`/servicios/nutricion/print?visitaId=${visita.id}`)}
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <BotonesInforme
                ruta={`/servicios/nutricion/print?visitaId=${visita.id}`}
                pacienteId={programa.pacienteId}
                emailPaciente={emailPaciente}
                titulo="Informe de tu visita de nutrición"
                nombreFichero={nombreInforme("nutricion", nombrePaciente, visita.fecha)}
              />
            </>
          )}
          <Button size="lg" className="gap-2 shadow-md" onClick={guardar} disabled={guardando}>
            <Save className="h-5 w-5" />
            {guardando ? "Guardando..." : visita ? "Actualizar" : "Guardar visita"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {/* 1. Visita y evolución */}
          <SeccionFormulario titulo={esInicial ? "Datos de la visita y motivación" : "Evolución general"}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input id="fecha" type="date" value={form.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
              </div>
              <CampoTexto id="farmaceutico" label="Farmacéutico" value={form.farmaceutico} onChange={(v) => cambiar("farmaceutico", v)} />
            </div>
            {!esInicial && (
              <OpcionesUnicas
                label="Evolución percibida por el paciente desde la última visita"
                opciones={EVOLUCION_SUBJETIVA}
                value={form.evolucionSubjetiva}
                onChange={(v) => cambiar("evolucionSubjetiva", v)}
              />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Escala0a10 label="Motivación" value={form.motivacion} onChange={(v) => cambiar("motivacion", v)} extremos={["Ninguna", "Máxima"]} />
              {!esInicial && (
                <Escala0a10
                  label="Adherencia percibida al plan"
                  value={form.adherencia}
                  onChange={(v) => cambiar("adherencia", v)}
                  extremos={["Nada", "Total"]}
                />
              )}
            </div>
          </SeccionFormulario>

          {/* 2. Medidas */}
          <SeccionFormulario titulo="Antropometría, bioimpedancia y tensión">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CampoNumero id="peso" label="Peso" unidad="kg" value={form.peso} onChange={(v) => cambiar("peso", v)} ayuda={comparar("peso", "kg")} />
              <CampoNumero id="altura" label="Altura" unidad="cm" value={form.altura} onChange={(v) => cambiar("altura", v)} />
              <CampoNumero id="cintura" label="Cintura" unidad="cm" value={form.cintura} onChange={(v) => cambiar("cintura", v)} ayuda={comparar("cintura", "cm")} />
              <CampoNumero id="cadera" label="Cadera" unidad="cm" value={form.cadera} onChange={(v) => cambiar("cadera", v)} ayuda={comparar("cadera", "cm")} />
            </div>
            {(imc != null || icc != null || cintura != null) && (
              <div className="flex flex-wrap gap-6 rounded-md bg-muted/50 p-3">
                {imc != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">IMC</p>
                    <div className="font-semibold">
                      {imc} kg/m² <BadgeClasificacion clasificacion={clasificarIMC(imc)} />
                    </div>
                  </div>
                )}
                {icc != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Índice cintura-cadera</p>
                    <div className="font-semibold">
                      {icc} <BadgeClasificacion clasificacion={clasificarICC(icc, sexoPaciente)} />
                    </div>
                  </div>
                )}
                {cintura != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Perímetro de cintura</p>
                    <div className="font-semibold">
                      {cintura} cm <BadgeClasificacion clasificacion={clasificarCintura(cintura, sexoPaciente)} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <CampoNumero id="porcentajeGrasa" label="Grasa corporal" unidad="%" value={form.porcentajeGrasa} onChange={(v) => cambiar("porcentajeGrasa", v)} ayuda={comparar("porcentajeGrasa", "%")} />
              <CampoNumero id="masaGrasa" label="Masa grasa" unidad="kg" value={form.masaGrasa} onChange={(v) => cambiar("masaGrasa", v)} ayuda={comparar("masaGrasa", "kg")} />
              <CampoNumero id="masaMagra" label="Masa libre de grasa" unidad="kg" value={form.masaMagra} onChange={(v) => cambiar("masaMagra", v)} ayuda={comparar("masaMagra", "kg")} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <CampoNumero id="systolic" label="TA sistólica" unidad="mmHg" step="1" value={form.systolic} onChange={(v) => cambiar("systolic", v)} />
              <CampoNumero id="diastolic" label="TA diastólica" unidad="mmHg" step="1" value={form.diastolic} onChange={(v) => cambiar("diastolic", v)} />
              <CampoNumero id="pulsaciones" label="Pulsaciones" unidad="lpm" step="1" value={form.pulsaciones} onChange={(v) => cambiar("pulsaciones", v)} />
              {tas != null && tad != null && (
                <div className="pb-2">
                  <BadgeClasificacion clasificacion={clasificarTension(tas, tad)} />
                </div>
              )}
            </div>
          </SeccionFormulario>

          {/* 3. Medicación y GLP-1 */}
          <SeccionFormulario titulo="Medicación y tratamiento">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoTexto id="medicacionHabitual" label="Medicación habitual" multilinea filas={2} value={form.medicacionHabitual} onChange={(v) => cambiar("medicacionHabitual", v)} />
              <CampoTexto id="suplementacion" label="Suplementación" multilinea filas={2} value={form.suplementacion} onChange={(v) => cambiar("suplementacion", v)} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch id="glp1Activo" checked={form.glp1Activo} onCheckedChange={(v) => cambiar("glp1Activo", v)} />
              <Label htmlFor="glp1Activo">Tratamiento GLP-1 activo</Label>
            </div>
            {form.glp1Activo && (
              <div className="space-y-4 rounded-md border border-dashed p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fármaco</Label>
                    <Select value={form.glp1Farmaco} onValueChange={(v) => cambiar("glp1Farmaco", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar fármaco" />
                      </SelectTrigger>
                      <SelectContent>
                        {FARMACOS_GLP1.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="glp1Dosis">
                      Dosis actual
                      {farmacoSeleccionado?.pauta && (
                        <span className="text-muted-foreground font-normal"> (pauta {farmacoSeleccionado.pauta})</span>
                      )}
                    </Label>
                    <Input id="glp1Dosis" list="dosis-glp1" value={form.glp1Dosis} onChange={(e) => cambiar("glp1Dosis", e.target.value)} />
                    <datalist id="dosis-glp1">
                      {farmacoSeleccionado?.dosis.map((d) => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="glp1FechaInicio">Inicio de la dosis actual</Label>
                    <Input id="glp1FechaInicio" type="date" value={form.glp1FechaInicio} onChange={(e) => cambiar("glp1FechaInicio", e.target.value)} />
                  </div>
                  <CampoNumero id="glp1DosisOlvidadas" label="Dosis olvidadas desde la última visita" step="1" value={form.glp1DosisOlvidadas} onChange={(v) => cambiar("glp1DosisOlvidadas", v)} />
                </div>
              </div>
            )}
            <SelectorEfectos value={form.efectosSecundarios} onChange={(v) => cambiar("efectosSecundarios", v)} />
            <CampoTexto id="toleranciaObservaciones" label="Observaciones sobre la tolerancia" multilinea filas={2} value={form.toleranciaObservaciones} onChange={(v) => cambiar("toleranciaObservaciones", v)} />
          </SeccionFormulario>

          {/* 4. Alimentación */}
          <SeccionFormulario titulo="Alimentación">
            {!esInicial && (
              <CampoSiNo label="¿Ha iniciado el cambio dietético?" value={form.cambioDieteticoIniciado} onChange={(v) => cambiar("cambioDieteticoIniciado", v)} />
            )}
            <CampoTexto
              id="pautaDietetica"
              label={esInicial ? "Pauta dietética propuesta" : "Cómo se está aplicando (estrategia, pauta, menú adaptado...)"}
              multilinea
              value={form.pautaDietetica}
              onChange={(v) => cambiar("pautaDietetica", v)}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CampoNumero id="comidasDia" label="Comidas al día" step="1" value={form.comidasDia} onChange={(v) => cambiar("comidasDia", v)} />
              <CampoNumero id="racionesProteinaDia" label="Raciones de proteína/día" step="1" value={form.racionesProteinaDia} onChange={(v) => cambiar("racionesProteinaDia", v)} />
              <CampoNumero id="racionesFrutaVerduraDia" label="Raciones de fruta y verdura/día" step="1" value={form.racionesFrutaVerduraDia} onChange={(v) => cambiar("racionesFrutaVerduraDia", v)} />
              <CampoNumero id="aguaLitros" label="Agua al día" unidad="L" step="0.1" value={form.aguaLitros} onChange={(v) => cambiar("aguaLitros", v)} />
            </div>
            <CampoSiNo label="¿Picotea entre horas?" value={form.picoteo} onChange={(v) => cambiar("picoteo", v)} />
            {form.picoteo && (
              <div className="space-y-4 rounded-md border border-dashed p-4">
                <OpcionesUnicas label="Frecuencia" opciones={FRECUENCIA_PICOTEO} value={form.picoteoFrecuencia} onChange={(v) => cambiar("picoteoFrecuencia", v)} />
                <OpcionesMultiples label="Causas" opciones={CAUSAS_PICOTEO} value={form.picoteoCausas} onChange={(v) => cambiar("picoteoCausas", v)} />
              </div>
            )}
          </SeccionFormulario>

          {/* 5. Hábitos */}
          <SeccionFormulario titulo="Descanso y estrés">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoNumero id="suenoHoras" label="Horas de sueño" unidad="h" step="0.5" value={form.suenoHoras} onChange={(v) => cambiar("suenoHoras", v)} />
              <OpcionesUnicas label="Calidad del sueño" opciones={CALIDAD_SUENO} value={form.suenoCalidad} onChange={(v) => cambiar("suenoCalidad", v)} />
              <OpcionesUnicas label="Nivel de estrés" opciones={NIVEL_ESTRES} value={form.estres} onChange={(v) => cambiar("estres", v)} />
            </div>
          </SeccionFormulario>

          {/* 6. Actividad física */}
          <SeccionFormulario titulo="Actividad física">
            <OpcionesUnicas
              label={esInicial ? "¿Hace ejercicio?" : "¿Está haciendo el ejercicio pautado?"}
              opciones={ESTADO_EJERCICIO}
              value={form.ejercicio}
              onChange={(v) => cambiar("ejercicio", v)}
            />
            {form.ejercicio !== "no" && (
              <>
                <OpcionesMultiples label="Tipo de ejercicio" opciones={TIPOS_EJERCICIO} value={form.ejercicioTipos} onChange={(v) => cambiar("ejercicioTipos", v)} />
                <div className="grid grid-cols-2 gap-4">
                  <CampoNumero id="ejercicioDiasSemana" label="Días por semana" step="1" value={form.ejercicioDiasSemana} onChange={(v) => cambiar("ejercicioDiasSemana", v)} />
                  <CampoNumero id="ejercicioMinutosSesion" label="Minutos por sesión" step="5" value={form.ejercicioMinutosSesion} onChange={(v) => cambiar("ejercicioMinutosSesion", v)} />
                </div>
                <CampoTexto id="ejercicioDetalle" label="Detalle" value={form.ejercicioDetalle} onChange={(v) => cambiar("ejercicioDetalle", v)} />
              </>
            )}
          </SeccionFormulario>

          {/* 7. Valoración */}
          <SeccionFormulario titulo="Valoración profesional y próximos objetivos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoTexto id="dificultades" label="Dificultades detectadas" multilinea value={form.dificultades} onChange={(v) => cambiar("dificultades", v)} />
              <CampoTexto id="observaciones" label="Observaciones clínicas y ajustes del plan" multilinea value={form.observaciones} onChange={(v) => cambiar("observaciones", v)} />
            </div>
            <CampoTexto id="objetivosProximaSesion" label="Objetivos acordados para la próxima sesión" multilinea value={form.objetivosProximaSesion} onChange={(v) => cambiar("objetivosProximaSesion", v)} />
            <CampoTexto
              id="recomendaciones"
              label="Recomendaciones para el paciente (aparecen en el informe impreso)"
              multilinea
              filas={6}
              value={form.recomendaciones}
              onChange={(v) => cambiar("recomendaciones", v)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proximaRevision">Próxima revisión</Label>
                <Input id="proximaRevision" type="date" value={form.proximaRevision} onChange={(e) => cambiar("proximaRevision", e.target.value)} />
              </div>
            </div>
          </SeccionFormulario>
        </div>

        <div className="xl:sticky xl:top-6 space-y-4">
          {sugerencias.some((s) => s.derivar) && (
            <Badge className="bg-destructive-soft text-destructive border-destructive/20">Hay datos que conviene comunicar al médico</Badge>
          )}
          <PanelSugerencias sugerencias={sugerencias} onAnadir={anadirSugerencia} anadidas={anadidas} />
        </div>
      </div>
    </div>
  );
}
