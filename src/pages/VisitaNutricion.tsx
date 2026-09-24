import { useSearchParams } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FormularioVisita } from "@/components/nutricion/FormularioVisita";
import { useProgramaNutricion } from "@/hooks/useNutricion";
import { usePacientes } from "@/hooks/usePacientes";

/**
 * Página de visita de nutrición (inicial o de seguimiento).
 * URL: /servicios/nutricion/visita?programaId=...[&id=...]
 */
export default function VisitaNutricion() {
  const [searchParams] = useSearchParams();
  const programaId = searchParams.get("programaId") ?? undefined;
  const visitaId = searchParams.get("id") ?? undefined;

  const { data: programa, isLoading, isFetching, isError } = useProgramaNutricion(programaId);
  const { data: pacientes = [] } = usePacientes();

  if (!programaId || isError) {
    return <p className="text-muted-foreground">No se ha encontrado el programa de nutrición.</p>;
  }
  if (isLoading || !programa) {
    return <LoadingSpinner />;
  }

  const visita = visitaId ? programa.visitas.find((v) => v.id === visitaId) : undefined;
  if (visitaId && !visita) {
    // Recién creada: la visita aparece cuando termina de recargarse el programa
    if (isFetching) return <LoadingSpinner />;
    return <p className="text-muted-foreground">No se ha encontrado la visita.</p>;
  }

  const paciente = pacientes.find((p) => p.id === programa.pacienteId);

  // La key reinicia el formulario al pasar de "nueva" a "guardada" o cambiar de visita
  return (
    <FormularioVisita
      key={visitaId ?? "nueva"}
      programa={programa}
      visita={visita}
      sexoPaciente={paciente?.sex}
      nombrePaciente={paciente?.name}
    />
  );
}
