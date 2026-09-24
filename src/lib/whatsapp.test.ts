import { describe, it, expect } from "vitest";
import { enlaceWhatsapp, mensajeFelicitacion } from "./whatsapp";

describe("enlaceWhatsapp", () => {
  it("añade el prefijo 34 a los teléfonos españoles de 9 dígitos", () => {
    expect(enlaceWhatsapp("600 123 456", "Hola")).toBe("https://wa.me/34600123456?text=Hola");
  });

  it("respeta prefijos internacionales con + o 00", () => {
    expect(enlaceWhatsapp("+351 912 345 678", "x")).toBe("https://wa.me/351912345678?text=x");
    expect(enlaceWhatsapp("0044 7700 900123", "x")).toBe("https://wa.me/447700900123?text=x");
  });

  it("devuelve null con teléfonos incompletos", () => {
    expect(enlaceWhatsapp("12345", "x")).toBeNull();
  });
});

describe("mensajeFelicitacion", () => {
  it("usa el nombre de pila y la farmacia", () => {
    expect(mensajeFelicitacion("María García López", "Farmacia Sol")).toBe(
      "¡Feliz cumpleaños, María! 🎉 Todo el equipo de Farmacia Sol te desea un día estupendo."
    );
  });
});
