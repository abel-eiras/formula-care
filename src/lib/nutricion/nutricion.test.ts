import { describe, it, expect } from "vitest";
import type { ProgramaNutricion, RegistroAlimentacion, VisitaNutricion } from "@/types";
import {
  calcularICC,
  calcularIMC,
  clasificarCintura,
  clasificarICC,
  clasificarIMC,
  numeroSesion,
  resumirEvolucion,
  serieEvolucion,
} from "./metricas";
import { analizarRegistro, franjaDeHora } from "./analisisRegistro";
import { generarSugerencias } from "./sugerencias";

// ==========================================
// FÁBRICAS DE DATOS DE PRUEBA
// ==========================================

function visita(datos: Partial<VisitaNutricion> & Pick<VisitaNutricion, "id" | "fecha">): VisitaNutricion {
  return {
    programaId: "p1",
    tipo: "seguimiento",
    glp1Activo: false,
    efectosSecundarios: [],
    picoteoCausas: [],
    ejercicioTipos: [],
    ...datos,
  };
}

function registro(datos: Partial<RegistroAlimentacion> & Pick<RegistroAlimentacion, "id" | "fecha" | "momento">): RegistroAlimentacion {
  return { programaId: "p1", descripcion: "comida", sensaciones: [], ...datos };
}

const programa: ProgramaNutricion = {
  id: "p1",
  pacienteId: "pac1",
  fechaInicio: "2026-01-01",
  estado: "activo",
  antecedentes: [],
  glp1Previo: false,
};

const idsSugerencias = (...args: Parameters<typeof generarSugerencias>) => generarSugerencias(...args).map((s) => s.id);

// ==========================================
// MÉTRICAS
// ==========================================

describe("índices antropométricos", () => {
  it("calcula IMC e ICC y devuelve null si falta un dato", () => {
    expect(calcularIMC(90, 170)).toBe(31.1);
    expect(calcularIMC(90, null)).toBeNull();
    expect(calcularICC(100, 110)).toBe(0.91);
    expect(calcularICC(undefined, 110)).toBeNull();
  });

  it("clasifica el IMC según la OMS", () => {
    expect(clasificarIMC(17).texto).toBe("Bajo peso");
    expect(clasificarIMC(22).nivel).toBe("normal");
    expect(clasificarIMC(31.1).texto).toBe("Obesidad grado I");
    expect(clasificarIMC(41).texto).toBe("Obesidad grado III");
  });

  it("usa umbrales distintos por sexo con la codificación de la app (M = masculino)", () => {
    expect(clasificarICC(0.88, "M").nivel).toBe("normal");
    expect(clasificarICC(0.88, "F").nivel).toBe("critico");
    // Sexo "O" o desconocido: umbral prudente (femenino)
    expect(clasificarICC(0.88, "O").nivel).toBe("critico");
    expect(clasificarCintura(95, "M").nivel).toBe("advertencia");
    expect(clasificarCintura(90, "F").nivel).toBe("critico");
  });
});

describe("resumirEvolucion", () => {
  const visitas = [
    visita({ id: "v3", fecha: "2026-03-01", peso: 90, masaMagra: 57, cintura: 100 }),
    visita({ id: "v1", fecha: "2026-01-01", tipo: "inicial", peso: 100, masaMagra: 60, cintura: 110 }),
    visita({ id: "v2", fecha: "2026-02-01", peso: 95 }),
  ];

  it("compara con la visita inicial aunque lleguen desordenadas", () => {
    const r = resumirEvolucion(visitas);
    expect(r.pesoInicial).toBe(100);
    expect(r.pesoActual).toBe(90);
    expect(r.diferenciaPeso).toBe(-10);
    expect(r.porcentajePerdida).toBe(10);
    expect(r.hitoAlcanzado).toBe(10);
    expect(r.diferenciaCintura).toBe(-10);
  });

  it("calcula qué parte del peso perdido es masa magra", () => {
    // 3 kg de magra sobre 10 kg perdidos
    expect(resumirEvolucion(visitas).proporcionMagraPerdida).toBe(0.3);
  });

  it("calcula el ritmo entre las dos últimas visitas con peso", () => {
    const r = resumirEvolucion(visitas);
    // -5 kg en 28 días (4 semanas)
    expect(r.ritmoRecienteKgSemana).toBe(-1.25);
  });

  it("no inventa datos con una sola visita", () => {
    const r = resumirEvolucion([visitas[1]]);
    expect(r.diferenciaPeso).toBe(0);
    expect(r.ritmoRecienteKgSemana).toBeNull();
    expect(r.proporcionMagraPerdida).toBeNull();
    expect(r.hitoAlcanzado).toBeNull();
  });

  it("numera las sesiones por fecha y genera la serie en orden", () => {
    expect(numeroSesion(visitas, "v1")).toBe(1);
    expect(numeroSesion(visitas, "v3")).toBe(3);
    expect(serieEvolucion(visitas).map((p) => p.porcentajePerdida)).toEqual([0, 5, 10]);
  });
});

// ==========================================
// REGISTRO DE ALIMENTACIÓN
// ==========================================

describe("analizarRegistro", () => {
  it("asigna franjas horarias, incluida la noche después de medianoche", () => {
    expect(franjaDeHora("08:30")).toBe("manana");
    expect(franjaDeHora("17:00")).toBe("tarde");
    expect(franjaDeHora("23:15")).toBe("noche");
    expect(franjaDeHora("01:00")).toBe("noche");
    expect(franjaDeHora(null)).toBeNull();
  });

  it("resume picoteos, causas y malestar", () => {
    const registros = [
      registro({ id: "r1", fecha: "2026-01-01", momento: "desayuno", hambreAntes: 6 }),
      registro({ id: "r2", fecha: "2026-01-01", momento: "picoteo", hora: "18:00", causaPicoteo: "ansiedad", hambreAntes: 1 }),
      registro({ id: "r3", fecha: "2026-01-02", momento: "picoteo", hora: "19:00", causaPicoteo: "aburrimiento" }),
      registro({ id: "r4", fecha: "2026-01-02", momento: "cena", sensaciones: ["pesadez"], compania: "solo" }),
    ];
    const a = analizarRegistro(registros);
    expect(a.diasRegistrados).toBe(2);
    expect(a.totalPicoteos).toBe(2);
    expect(a.picoteosPorDia).toBe(1);
    expect(a.picoteosEmocionales).toBe(2);
    expect(a.franjaPicoteo).toBe("tarde");
    expect(a.ingestasSinHambre).toBe(1);
    expect(a.ingestasConMalestar).toBe(1);
    expect(a.porcentajeSolo).toBe(100);
    expect(a.diasConDesayuno).toBe(1);
  });
});

// ==========================================
// SUGERENCIAS
// ==========================================

describe("generarSugerencias", () => {
  it("no sugiere nada sin visitas", () => {
    expect(generarSugerencias({ programa, visitas: [] })).toEqual([]);
  });

  it("deriva al médico los efectos digestivos moderados con GLP-1 y los pone primero", () => {
    const sugerencias = generarSugerencias({
      programa,
      visitas: [
        visita({
          id: "v1",
          fecha: "2026-01-01",
          glp1Activo: true,
          efectosSecundarios: [{ id: "nauseas", intensidad: "moderada" }],
          aguaLitros: 2,
          racionesProteinaDia: 4,
        }),
      ],
    });
    expect(sugerencias[0].id).toBe("efectos_digestivos");
    expect(sugerencias[0].derivar).toBe(true);
  });

  it("no avisa de efectos leves como derivación, pero sí da consejos", () => {
    const ids = idsSugerencias({
      programa,
      visitas: [visita({ id: "v1", fecha: "2026-01-01", glp1Activo: true, efectosSecundarios: [{ id: "nauseas", intensidad: "leve" }] })],
    });
    expect(ids).not.toContain("efectos_digestivos");
    expect(ids).toContain("malestar_comidas");
  });

  it("avisa de pérdida de masa magra y de falta de fuerza", () => {
    const ids = idsSugerencias({
      programa,
      visitas: [
        visita({ id: "v1", fecha: "2026-01-01", tipo: "inicial", peso: 100, masaMagra: 60 }),
        visita({ id: "v2", fecha: "2026-03-01", peso: 90, masaMagra: 55, ejercicioTipos: ["caminar"] }),
      ],
    });
    expect(ids).toContain("perdida_masa_magra");
    expect(ids).toContain("sin_fuerza");
    expect(ids).toContain("hito");
  });

  it("detecta picoteo emocional a partir del registro de alimentación", () => {
    const registros = ["r1", "r2", "r3"].map((id) =>
      registro({ id, fecha: "2026-01-01", momento: "picoteo", causaPicoteo: "ansiedad" })
    );
    const ids = idsSugerencias({ programa, visitas: [visita({ id: "v1", fecha: "2026-01-02" })], registros });
    expect(ids).toContain("picoteo_emocional");
    expect(ids).toContain("picoteo_frecuente");
  });

  it("evalúa una visita pasada solo con los datos disponibles en su fecha", () => {
    const visitas = [
      visita({ id: "v1", fecha: "2026-01-01", tipo: "inicial", peso: 100 }),
      visita({ id: "v2", fecha: "2026-02-01", peso: 94, systolic: 150, diastolic: 95 }),
    ];
    const registros = ["r1", "r2", "r3"].map((id) =>
      registro({ id, fecha: "2026-01-15", momento: "picoteo", causaPicoteo: "ansiedad" })
    );
    const ids = idsSugerencias({ programa, visitas, registros, visitaId: "v1" });
    expect(ids).not.toContain("tension_elevada");
    expect(ids).not.toContain("hito");
    expect(ids).not.toContain("picoteo_emocional");
    expect(idsSugerencias({ programa, visitas, registros })).toEqual(
      expect.arrayContaining(["tension_elevada", "hito", "picoteo_emocional"])
    );
  });

  it("detecta estancamiento del peso", () => {
    const ids = idsSugerencias({
      programa,
      visitas: [
        visita({ id: "v1", fecha: "2026-01-01", tipo: "inicial", peso: 100 }),
        visita({ id: "v2", fecha: "2026-02-01", peso: 95 }),
        visita({ id: "v3", fecha: "2026-03-01", peso: 95 }),
      ],
    });
    expect(ids).toContain("estancamiento");
  });
});
