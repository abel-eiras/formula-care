/**
 * Enlace de WhatsApp (wa.me) con un mensaje ya escrito.
 * Los teléfonos españoles de 9 dígitos se completan con el prefijo 34.
 */
export function enlaceWhatsapp(telefono: string, mensaje: string): string | null {
  let numero = telefono.replace(/\D/g, "");
  if (numero.startsWith("00")) numero = numero.slice(2);
  if (numero.length === 9) numero = `34${numero}`;
  if (numero.length < 10) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/** Mensaje de felicitación de cumpleaños por defecto */
export function mensajeFelicitacion(nombrePaciente: string, nombreFarmacia?: string): string {
  const nombre = nombrePaciente.split(" ")[0];
  const equipo = nombreFarmacia ? `Todo el equipo de ${nombreFarmacia}` : "Todo nuestro equipo";
  return `¡Feliz cumpleaños, ${nombre}! 🎉 ${equipo} te desea un día estupendo.`;
}
