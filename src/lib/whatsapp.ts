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

/** Recordatorio de cita por WhatsApp (para pacientes sin email o como refuerzo) */
export function mensajeRecordatorioCita(nombrePaciente: string, fecha: string, hora: string, nombreFarmacia?: string): string {
  const nombre = nombrePaciente.split(" ")[0];
  const dia = new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const farmacia = nombreFarmacia ? ` en ${nombreFarmacia}` : "";
  return `Hola ${nombre}, te recordamos tu cita${farmacia} el ${dia} a las ${hora}. Si no puedes venir, avísanos respondiendo a este mensaje. ¡Gracias!`;
}
