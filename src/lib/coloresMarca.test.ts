import { describe, it, expect } from "vitest";
import { getColoresParaConfig, revisarContraste, TEMAS_PRECONFIGURADOS } from "./coloresMarca";
import { contraste, textoSobre, TEXTO_CLARO, TEXTO_OSCURO } from "./contraste";

describe("contraste", () => {
  it("calcula la relación WCAG", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contraste("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("elige texto blanco sobre colores oscuros y oscuro sobre claros", () => {
    expect(textoSobre("#3e551b")).toBe(TEXTO_CLARO);
    expect(textoSobre("#a4c639")).toBe(TEXTO_OSCURO); // verde lima: el blanco no se leería
    expect(textoSobre("#f59e0b")).toBe(TEXTO_OSCURO);
  });
});

describe("temas preconfigurados", () => {
  it.each(Object.entries(TEMAS_PRECONFIGURADOS))("%s se lee bien", (_id, tema) => {
    expect(revisarContraste(tema.colores)).toEqual([]);
    // Estilo de la app: texto blanco sobre primario y secundario
    expect(textoSobre(tema.colores.primario)).toBe(TEXTO_CLARO);
    expect(textoSobre(tema.colores.secundario)).toBe(TEXTO_CLARO);
    // El texto sobre el acento (elegido automáticamente) también es legible
    expect(contraste(tema.colores.acento, textoSobre(tema.colores.acento))).toBeGreaterThanOrEqual(4.5);
  });

  it("todos tienen la paleta completa en hexadecimal", () => {
    for (const tema of Object.values(TEMAS_PRECONFIGURADOS)) {
      for (const color of Object.values(tema.colores)) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("el tema verde farmacia usa los verdes de la plantilla de referencia", () => {
    const { colores } = TEMAS_PRECONFIGURADOS.verdeFarmacia;
    expect(colores.acento).toBe("#a4c639");
    expect(colores.texto).toBe("#2c3e50");
  });
});

describe("revisarContraste", () => {
  it("avisa de un tema personalizado ilegible", () => {
    const avisos = revisarContraste({ primario: "#f5f5a0", fondo: "#ffffff", texto: "#cccccc" });
    expect(avisos.map((a) => a.campo)).toEqual(expect.arrayContaining(["primario", "texto"]));
  });

  it("usa los colores personalizados solo con el tema personalizado", () => {
    const propios = { primario: "#123456" };
    expect(getColoresParaConfig({ temaActivo: "custom", coloresMarca: propios }).primario).toBe("#123456");
    expect(getColoresParaConfig({ temaActivo: "oceano", coloresMarca: propios }).primario).toBe("#0b4f6c");
    expect(getColoresParaConfig({ temaActivo: "inexistente" }).primario).toBe("#79438f");
  });
});

describe("sincronía con el backend", () => {
  it("los emails usan los mismos temas que la app", async () => {
    // El backend es otro paquete: se lee su fichero para comparar la tabla de temas
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const fuente = readFileSync(resolve(__dirname, "../../backend/src/services/emailService.ts"), "utf8");
    const bloque = fuente.slice(fuente.indexOf("const TEMAS_PRECONFIGURADOS"), fuente.indexOf("};", fuente.indexOf("const TEMAS_PRECONFIGURADOS")));
    const backend = Object.fromEntries(
      [...bloque.matchAll(/(\w+): \{ primario: '(#\w+)', secundario: '(#\w+)', acento: '(#\w+)' \}/g)].map((m) => [
        m[1],
        { primario: m[2], secundario: m[3], acento: m[4] },
      ])
    );
    const frontend = Object.fromEntries(
      Object.entries(TEMAS_PRECONFIGURADOS).map(([id, { colores }]) => [
        id,
        { primario: colores.primario, secundario: colores.secundario, acento: colores.acento },
      ])
    );
    expect(backend).toEqual(frontend);
  });
});
