import { describe, it, expect } from "vitest";
import { calcularEdad, textoEdad } from "./edad";

describe("calcularEdad", () => {
  const hoy = new Date(2026, 8, 24); // 24 de septiembre de 2026 (hora local)

  it("cumple años el mismo día, no antes", () => {
    expect(calcularEdad("1986-09-24", hoy)).toBe(40);
    expect(calcularEdad("1986-09-25", hoy)).toBe(39);
    expect(calcularEdad("1986-10-01", hoy)).toBe(39);
    expect(calcularEdad("1986-01-31", hoy)).toBe(40);
  });

  it("acepta fechas con hora y rechaza las no válidas o futuras", () => {
    expect(calcularEdad("1986-09-24T00:00:00.000Z", hoy)).toBe(40);
    expect(calcularEdad("", hoy)).toBeNull();
    expect(calcularEdad(undefined, hoy)).toBeNull();
    expect(calcularEdad("24/09/1986", hoy)).toBeNull();
    expect(calcularEdad("2027-01-01", hoy)).toBeNull();
  });

  it("recién nacidos tienen 0 años", () => {
    expect(calcularEdad("2026-09-24", hoy)).toBe(0);
  });

  it("formatea el texto", () => {
    expect(textoEdad(null)).toBe("Edad desconocida");
  });
});
