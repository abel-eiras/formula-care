import type { ParametroReferencia, EstadoValoracion } from "@/types";

/**
 * Evalúa el estado de un valor según los rangos de referencia
 */
export function evaluarValor(
  valor: number | undefined,
  referencia: ParametroReferencia | undefined
): EstadoValoracion | null {
  if (valor === undefined || !referencia) {
    return null;
  }

  // Verificar rango crítico (prioridad más alta)
  if (
    (referencia.criticoMin !== undefined && valor < referencia.criticoMin) ||
    (referencia.criticoMax !== undefined && valor > referencia.criticoMax) ||
    (referencia.criticoMin2 !== undefined && valor < referencia.criticoMin2) ||
    (referencia.criticoMax2 !== undefined && valor > referencia.criticoMax2)
  ) {
    // Verificar si está en rango crítico
    const enCritico1 =
      referencia.criticoMin !== undefined &&
      referencia.criticoMax !== undefined &&
      valor >= referencia.criticoMin &&
      valor <= referencia.criticoMax;
    const enCritico2 =
      referencia.criticoMin2 !== undefined &&
      referencia.criticoMax2 !== undefined &&
      valor >= referencia.criticoMin2 &&
      valor <= referencia.criticoMax2;

    if (!enCritico1 && !enCritico2) {
      return "critico";
    }
  }

  // Verificar rango de advertencia
  if (
    (referencia.advertenciaMin !== undefined && valor < referencia.advertenciaMin) ||
    (referencia.advertenciaMax !== undefined && valor > referencia.advertenciaMax) ||
    (referencia.advertenciaMin2 !== undefined && valor < referencia.advertenciaMin2) ||
    (referencia.advertenciaMax2 !== undefined && valor > referencia.advertenciaMax2)
  ) {
    // Verificar si está en rango de advertencia
    const enAdvertencia1 =
      referencia.advertenciaMin !== undefined &&
      referencia.advertenciaMax !== undefined &&
      valor >= referencia.advertenciaMin &&
      valor <= referencia.advertenciaMax;
    const enAdvertencia2 =
      referencia.advertenciaMin2 !== undefined &&
      referencia.advertenciaMax2 !== undefined &&
      valor >= referencia.advertenciaMin2 &&
      valor <= referencia.advertenciaMax2;

    if (!enAdvertencia1 && !enAdvertencia2) {
      // Verificar si no está en rango normal
      const enNormal =
        valor >= referencia.normalMin && valor <= referencia.normalMax;
      if (!enNormal) {
        return "advertencia";
      }
    } else {
      return "advertencia";
    }
  }

  // Verificar rango normal
  if (valor >= referencia.normalMin && valor <= referencia.normalMax) {
    return "normal";
  }

  // Si no está en ningún rango definido, considerar como advertencia
  return "advertencia";
}

/**
 * Obtiene el mensaje de advertencia según el estado
 */
export function getMensajeValoracion(estado: EstadoValoracion | null): string {
  switch (estado) {
    case "normal":
      return "Valor correcto";
    case "advertencia":
      return "Requiere consejo sanitario";
    case "critico":
      return "Control médico recomendado";
    default:
      return "";
  }
}

/**
 * Obtiene la clase de color según el estado
 */
export function getColorValoracion(estado: EstadoValoracion | null): string {
  switch (estado) {
    case "normal":
      return "text-success border-success";
    case "advertencia":
      return "text-warning border-warning";
    case "critico":
      return "text-destructive border-destructive";
    default:
      return "";
  }
}
