import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/contexts/AuthContext";
import { useActualizarProgramaNutricion, useCrearProgramaNutricion } from "@/hooks/useNutricion";
import {
  ANTECEDENTES,
  ESTADOS_PROGRAMA,
  FARMACOS_GLP1,
  OPCIONES_ALCOHOL,
  OPCIONES_TABACO,
} from "@/lib/nutricion/catalogos";
import type { DatosPrograma, EstadoPrograma, FrecuenciaAlcohol, ProgramaNutricion, Tabaco } from "@/types";
import { CampoNumero, CampoTexto, OpcionesMultiples, OpcionesUnicas, SeccionFormulario } from "./campos";
import { aNumero, aTexto, deNumero, hoyISO } from "@/lib/nutricion/formulario";

interface FormularioProgramaProps {
  pacienteId: string;
  /** Programa a editar; si no se pasa, se crea uno nuevo */
  programa?: ProgramaNutricion;
  onGuardado?: (programa: ProgramaNutricion) => void;
}

function estadoInicial(programa: ProgramaNutricion | undefined, farmaceutico: string) {
  return {
    fechaInicio: programa?.fechaInicio.slice(0, 10) ?? hoyISO(),
    estado: (programa?.estado ?? "activo") as EstadoPrograma,
    fechaFin: programa?.fechaFin?.slice(0, 10) ?? "",
    motivoConsulta: programa?.motivoConsulta ?? "",
    objetivoPrincipal: programa?.objetivoPrincipal ?? "",
    pesoObjetivo: deNumero(programa?.pesoObjetivo),
    dietasPrevias: programa?.dietasPrevias ?? "",
    antecedentes: programa?.antecedentes ?? [],
    otrosProblemasMedicos: programa?.otrosProblemasMedicos ?? "",
    antecedentesFamiliares: programa?.antecedentesFamiliares ?? "",
    tabaco: (programa?.tabaco ?? null) as Tabaco | null,
    alcohol: (programa?.alcohol ?? null) as FrecuenciaAlcohol | null,
    glp1Previo: programa?.glp1Previo ?? false,
    glp1PrevioFarmaco: programa?.glp1PrevioFarmaco ?? "",
    glp1PrevioMotivoAbandono: programa?.glp1PrevioMotivoAbandono ?? "",
    medicoPrescriptor: programa?.medicoPrescriptor ?? "",
    otroTratamientoPeso: programa?.otroTratamientoPeso ?? "",
    farmaceutico: programa?.farmaceutico ?? farmaceutico,
  };
}

type EstadoFormulario = ReturnType<typeof estadoInicial>;

/**
 * Datos de partida del programa: motivo, objetivo, antecedentes e historia de
 * tratamiento. Es la parte del cuestionario inicial que no cambia entre visitas;
 * las medidas y hábitos se recogen en la visita inicial.
 */
export function FormularioPrograma({ pacienteId, programa, onGuardado }: FormularioProgramaProps) {
  const { usuario } = useAuthContext();
  const [form, setForm] = useState<EstadoFormulario>(() => estadoInicial(programa, usuario?.nombre ?? ""));
  const crear = useCrearProgramaNutricion();
  const actualizar = useActualizarProgramaNutricion();
  const guardando = crear.isPending || actualizar.isPending;

  const cambiar = <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    const datos: DatosPrograma = {
      pacienteId,
      fechaInicio: form.fechaInicio,
      estado: form.estado,
      fechaFin: form.estado === "finalizado" ? aTexto(form.fechaFin) ?? hoyISO() : null,
      motivoConsulta: aTexto(form.motivoConsulta),
      objetivoPrincipal: aTexto(form.objetivoPrincipal),
      pesoObjetivo: aNumero(form.pesoObjetivo),
      dietasPrevias: aTexto(form.dietasPrevias),
      antecedentes: form.antecedentes,
      otrosProblemasMedicos: aTexto(form.otrosProblemasMedicos),
      antecedentesFamiliares: aTexto(form.antecedentesFamiliares),
      tabaco: form.tabaco,
      alcohol: form.alcohol,
      glp1Previo: form.glp1Previo,
      glp1PrevioFarmaco: form.glp1Previo ? aTexto(form.glp1PrevioFarmaco) : null,
      glp1PrevioMotivoAbandono: form.glp1Previo ? aTexto(form.glp1PrevioMotivoAbandono) : null,
      medicoPrescriptor: aTexto(form.medicoPrescriptor),
      otroTratamientoPeso: aTexto(form.otroTratamientoPeso),
      farmaceutico: aTexto(form.farmaceutico),
    };

    try {
      const guardado = programa
        ? await actualizar.mutateAsync({ id: programa.id, ...datos })
        : await crear.mutateAsync(datos);
      toast.success(programa ? "Programa actualizado" : "Programa de nutrición iniciado");
      onGuardado?.(guardado);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar el programa");
    }
  };

  return (
    <div className="space-y-6">
      <SeccionFormulario titulo="Motivación y objetivo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha de inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => cambiar("fechaInicio", e.target.value)}
            />
          </div>
          <CampoNumero
            id="pesoObjetivo"
            label="Peso objetivo"
            unidad="kg"
            value={form.pesoObjetivo}
            onChange={(v) => cambiar("pesoObjetivo", v)}
          />
          <CampoTexto
            id="farmaceutico"
            label="Farmacéutico responsable"
            value={form.farmaceutico}
            onChange={(v) => cambiar("farmaceutico", v)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoTexto
            id="motivoConsulta"
            label="Motivo de consulta"
            multilinea
            value={form.motivoConsulta}
            onChange={(v) => cambiar("motivoConsulta", v)}
          />
          <CampoTexto
            id="objetivoPrincipal"
            label="Objetivo principal del paciente"
            multilinea
            value={form.objetivoPrincipal}
            onChange={(v) => cambiar("objetivoPrincipal", v)}
          />
        </div>
        <CampoTexto
          id="dietasPrevias"
          label="Dietas intentadas anteriormente"
          placeholder="Déjalo vacío si no ha hecho ninguna"
          value={form.dietasPrevias}
          onChange={(v) => cambiar("dietasPrevias", v)}
        />
        {programa && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <OpcionesUnicas
              label="Estado del programa"
              opciones={ESTADOS_PROGRAMA}
              value={form.estado}
              onChange={(v) => cambiar("estado", v ?? "activo")}
            />
            {form.estado === "finalizado" && (
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha de finalización</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={form.fechaFin || hoyISO()}
                  onChange={(e) => cambiar("fechaFin", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </SeccionFormulario>

      <SeccionFormulario titulo="Antecedentes médicos y familiares">
        <OpcionesMultiples
          label="Antecedentes personales"
          opciones={ANTECEDENTES}
          value={form.antecedentes}
          onChange={(v) => cambiar("antecedentes", v)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoTexto
            id="otrosProblemasMedicos"
            label="Otros problemas médicos"
            multilinea
            filas={2}
            value={form.otrosProblemasMedicos}
            onChange={(v) => cambiar("otrosProblemasMedicos", v)}
          />
          <CampoTexto
            id="antecedentesFamiliares"
            label="Antecedentes familiares"
            multilinea
            filas={2}
            value={form.antecedentesFamiliares}
            onChange={(v) => cambiar("antecedentesFamiliares", v)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OpcionesUnicas label="Tabaco" opciones={OPCIONES_TABACO} value={form.tabaco} onChange={(v) => cambiar("tabaco", v)} />
          <OpcionesUnicas label="Alcohol" opciones={OPCIONES_ALCOHOL} value={form.alcohol} onChange={(v) => cambiar("alcohol", v)} />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        titulo="Historia de tratamiento"
        descripcion="El tratamiento actual (fármaco y dosis) se registra en cada visita."
      >
        <div className="flex items-center gap-3">
          <Switch id="glp1Previo" checked={form.glp1Previo} onCheckedChange={(v) => cambiar("glp1Previo", v)} />
          <Label htmlFor="glp1Previo">Ha usado GLP-1 anteriormente</Label>
        </div>
        {form.glp1Previo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="glp1PrevioFarmaco">Fármaco previo</Label>
              <Input
                id="glp1PrevioFarmaco"
                list="farmacos-glp1"
                value={form.glp1PrevioFarmaco}
                onChange={(e) => cambiar("glp1PrevioFarmaco", e.target.value)}
              />
              <datalist id="farmacos-glp1">
                {FARMACOS_GLP1.filter((f) => f.id !== "otro").map((f) => (
                  <option key={f.id} value={f.label} />
                ))}
              </datalist>
            </div>
            <CampoTexto
              id="glp1PrevioMotivoAbandono"
              label="Motivo de abandono"
              value={form.glp1PrevioMotivoAbandono}
              onChange={(v) => cambiar("glp1PrevioMotivoAbandono", v)}
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoTexto
            id="medicoPrescriptor"
            label="Médico prescriptor"
            value={form.medicoPrescriptor}
            onChange={(v) => cambiar("medicoPrescriptor", v)}
          />
          <CampoTexto
            id="otroTratamientoPeso"
            label="Otro tratamiento para el peso (distinto de GLP-1)"
            value={form.otroTratamientoPeso}
            onChange={(v) => cambiar("otroTratamientoPeso", v)}
          />
        </div>
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button size="lg" className="gap-2 shadow-md" onClick={guardar} disabled={guardando}>
          <Save className="h-5 w-5" />
          {guardando ? "Guardando..." : programa ? "Guardar cambios" : "Iniciar programa"}
        </Button>
      </div>
    </div>
  );
}
