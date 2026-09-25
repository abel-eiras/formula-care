/**
 * SCORE2 y FINDRISC en el informe imprimible del análisis bioquímico:
 * un resumen junto a los parámetros y el test FINDRISC como anexo, con la
 * respuesta y los puntos de cada pregunta.
 */
import type { AnalisisBio, Paciente } from "@/types";
import { calcularEdad } from "@/lib/edad";
import { calcularScore2, TEXTO_CATEGORIA_SCORE2 } from "@/lib/riesgo/score2";
import { leerRespuestasFindrisc, PREGUNTAS_FINDRISC, resultadoFindrisc } from "@/lib/riesgo/findrisc";
import { posibleDiabetes } from "@/lib/riesgo/datosRiesgo";

function score2DelAnalisis(analisis: AnalisisBio, paciente?: Paciente | null) {
  const edad = calcularEdad(paciente?.birthDate, new Date(analisis.fecha));
  if (edad == null || analisis.fumador == null || !analisis.systolic || !analisis.cholesterol || !analisis.cholesterolHDL) return null;
  if (paciente?.sex !== "M" && paciente?.sex !== "F") return null;
  return calcularScore2({
    edad,
    sexo: paciente.sex,
    fumador: analisis.fumador,
    sistolica: analisis.systolic,
    colesterolTotal: analisis.cholesterol,
    colesterolHDL: analisis.cholesterolHDL,
  });
}

/** Resumen: se muestra solo si hay algo que contar */
export function ResumenRiesgoInforme({ analisis, paciente }: { analisis: AnalisisBio; paciente?: Paciente | null }) {
  const score2 = score2DelAnalisis(analisis, paciente);
  const findrisc = resultadoFindrisc(leerRespuestasFindrisc(analisis.findrisc) ?? {});
  if (!score2 && !findrisc) return null;
  return (
    <>
      <div className="section-header">Riesgo cardiovascular y de diabetes</div>
      <div className="space-y-2 mb-6">
        {score2 && (
          <div className="param-row">
            <span className="param-label">Riesgo cardiovascular a 10 años ({score2.modelo})</span>
            <span className="param-value">
              {score2.riesgo.toLocaleString("es-ES")} % · {TEXTO_CATEGORIA_SCORE2[score2.categoria]}
            </span>
          </div>
        )}
        {score2 && posibleDiabetes(analisis.glucemia, analisis.hemoglobinaGlucosilada) && (
          <p className="text-xs">SCORE2 no está pensado para personas con diabetes: valor solo orientativo.</p>
        )}
        {findrisc && (
          <div className="param-row">
            <span className="param-label">Test FINDRISC (riesgo de diabetes tipo 2 a 10 años)</span>
            <span className="param-value">
              {findrisc.total} puntos · {findrisc.texto} ({findrisc.riesgo})
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/** Anexo con el detalle del test FINDRISC */
export function AnexoFindrisc({ analisis }: { analisis: AnalisisBio }) {
  const respuestas = leerRespuestasFindrisc(analisis.findrisc);
  const resultado = respuestas ? resultadoFindrisc(respuestas) : null;
  if (!respuestas || !resultado) return null;
  return (
    <div style={{ breakInside: "avoid" }}>
      <div className="section-header">Anexo: test FINDRISC</div>
      <table className="w-full text-sm mb-6" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {PREGUNTAS_FINDRISC.map((pregunta) => {
            const r = respuestas[pregunta.id];
            const opcion = pregunta.opciones.find((o) => o.valor === r?.valor);
            return (
              <tr key={pregunta.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td className="py-1 pr-3">{pregunta.texto}</td>
                <td className="py-1 pr-3">{opcion?.texto ?? "—"}</td>
                <td className="py-1 text-right whitespace-nowrap">{r?.puntos ?? "—"} p.</td>
              </tr>
            );
          })}
          <tr>
            <td className="py-2 font-semibold" colSpan={2}>
              Total · {resultado.texto} (riesgo estimado: {resultado.riesgo})
            </td>
            <td className="py-2 text-right font-semibold whitespace-nowrap">{resultado.total} p.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
