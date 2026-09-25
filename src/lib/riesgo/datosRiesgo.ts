import { respuesta, valorCintura, valorEdad, valorImc, type RespuestasFindrisc } from "./findrisc";

/** Datos del análisis y del paciente que usan SCORE2 y FINDRISC */
export interface DatosRiesgo {
  edad: number | null;
  sexo: string | null;
  sistolica?: number;
  colesterolTotal?: number;
  colesterolHDL?: number;
  imc: number | null;
  cintura?: number;
  glucemia?: number;
  hba1c?: number;
}

/** Glucemia o HbA1c en rango de diabetes: SCORE2 no es la herramienta adecuada */
export function posibleDiabetes(glucemia?: number, hba1c?: number): boolean {
  return (glucemia ?? 0) >= 126 || (hba1c ?? 0) >= 6.5;
}

/** Respuestas de edad, IMC y cintura calculadas con los datos del análisis */
export function respuestasAutomaticas(datos: DatosRiesgo): RespuestasFindrisc {
  const automaticas: RespuestasFindrisc = {};
  if (datos.edad != null) automaticas.edad = respuesta("edad", valorEdad(datos.edad));
  if (datos.imc) automaticas.imc = respuesta("imc", valorImc(datos.imc));
  const cintura = datos.cintura ? valorCintura(datos.cintura, datos.sexo) : null;
  if (cintura) automaticas.cintura = respuesta("cintura", cintura);
  return automaticas;
}
