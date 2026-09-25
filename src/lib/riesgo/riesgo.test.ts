import { describe, expect, it } from "vitest";
import { calcularScore2, faltaParaScore2 } from "./score2";
import { completo, respuesta, resultadoFindrisc, valorCintura, valorEdad, valorImc, type RespuestasFindrisc } from "./findrisc";

// Colesterol en mg/dL equivalente a los mmol/L de los casos de referencia
const mgdl = (mmol: number) => mmol * 38.67;

describe("SCORE2 (región de riesgo bajo: España)", () => {
  it("reproduce los ejemplos resueltos de los artículos originales (región de riesgo bajo)", () => {
    // SCORE2, métodos suplementarios, tabla 4: 50 años, fumador, PAS 140, CT 6,3, HDL 1,4
    const ejemplo = { edad: 50, fumador: true, sistolica: 140, colesterolTotal: mgdl(6.3), colesterolHDL: mgdl(1.4) };
    expect(calcularScore2({ ...ejemplo, sexo: "M" })).toMatchObject({ modelo: "SCORE2", riesgo: 6.3, categoria: "alto" });
    expect(calcularScore2({ ...ejemplo, sexo: "F" })).toMatchObject({ riesgo: 4.3, categoria: "bajo-moderado" });
    // SCORE2-OP, métodos suplementarios, tabla 3: 75 años, fumador, PAS 140, CT 5,5, HDL 1,3
    const mayor = { edad: 75, fumador: true, sistolica: 140, colesterolTotal: mgdl(5.5), colesterolHDL: mgdl(1.3) };
    expect(calcularScore2({ ...mayor, sexo: "M" })).toMatchObject({ modelo: "SCORE2-OP", riesgo: 18.6, categoria: "muy-alto" });
    expect(calcularScore2({ ...mayor, sexo: "F" })?.riesgo).toBe(15.2);
    expect(calcularScore2({ ...mayor, sexo: "M", fumador: false })?.riesgo).toBe(13.3);
    expect(calcularScore2({ edad: 75, sexo: "F", fumador: false, sistolica: 110, colesterolTotal: mgdl(5), colesterolHDL: mgdl(2) })?.riesgo).toBe(6.1);
  });

  it("a partir de 70 años usa SCORE2-OP", () => {
    const r = calcularScore2({ edad: 75, sexo: "M", fumador: false, sistolica: 150, colesterolTotal: mgdl(6), colesterolHDL: mgdl(1.4) });
    expect(r?.modelo).toBe("SCORE2-OP");
    expect(r?.umbrales).toEqual([7.5, 15]);
  });

  it("el riesgo sube al fumar, con más tensión y con menos HDL", () => {
    const base = { edad: 55, sexo: "M" as const, fumador: false, sistolica: 130, colesterolTotal: 220, colesterolHDL: 50 };
    const r = (cambio: Partial<typeof base>) => calcularScore2({ ...base, ...cambio })!.riesgo;
    expect(r({ fumador: true })).toBeGreaterThan(r({}));
    expect(r({ sistolica: 160 })).toBeGreaterThan(r({}));
    expect(r({ colesterolHDL: 35 })).toBeGreaterThan(r({}));
  });

  it("fuera de 40-89 años no se calcula y explica qué falta", () => {
    expect(calcularScore2({ edad: 35, sexo: "F", fumador: false, sistolica: 120, colesterolTotal: 200, colesterolHDL: 50 })).toBeNull();
    expect(faltaParaScore2({ edad: 55, sexo: "O", sistolica: 120 })).toEqual(["sexo (hombre o mujer)", "si fuma", "colesterol total", "colesterol HDL"]);
  });
});

describe("FINDRISC", () => {
  it("rellena solas edad, IMC y cintura", () => {
    expect(valorEdad(44)).toBe("<45");
    expect(valorEdad(54)).toBe("45-54");
    expect(valorEdad(65)).toBe(">64");
    expect(valorImc(30)).toBe("25-30");
    expect(valorImc(30.1)).toBe(">30");
    expect(valorCintura(94, "M")).toBe("medio");
    expect(valorCintura(89, "F")).toBe("alto");
    expect(valorCintura(90, "O")).toBeNull();
  });

  it("suma los puntos y clasifica", () => {
    const respuestas: RespuestasFindrisc = {
      edad: respuesta("edad", "55-64"), // 3
      imc: respuesta("imc", "25-30"), // 1
      cintura: respuesta("cintura", "medio"), // 3
      actividad: respuesta("actividad", "no"), // 2
      frutaVerdura: respuesta("frutaVerdura", "diario"), // 0
      antihipertensivos: respuesta("antihipertensivos", "si"), // 2
      glucosaAlta: respuesta("glucosaAlta", "no"), // 0
      familiares: respuesta("familiares", "segundo-grado"), // 3
    };
    expect(completo(respuestas)).toBe(true);
    expect(resultadoFindrisc(respuestas)).toMatchObject({ total: 14, categoria: "moderado", riesgo: "1 de cada 6" });
    expect(resultadoFindrisc({ ...respuestas, glucosaAlta: respuesta("glucosaAlta", "si") })).toMatchObject({ total: 19, categoria: "alto" });
  });

  it("sin todas las respuestas no da resultado", () => {
    expect(resultadoFindrisc({ edad: respuesta("edad", "<45") })).toBeNull();
  });
});
