/**
 * Funciones que existen en el código pero no se muestran todavía.
 *
 * Reserva online (booking-web): necesita un servidor accesible desde internet
 * y correo configurado para confirmar y cancelar citas. Mientras la farmacia
 * no lo tenga, se oculta para no dar a entender que funciona. Al activarla
 * vuelven la pestaña de Configuración, el panel de solicitudes del Calendario,
 * la plantilla de rechazo y el filtro de pacientes por origen.
 */
export const RESERVA_ONLINE_DISPONIBLE = false;

/** Plantillas y variables de email que solo tienen sentido con la reserva online */
export const PLANTILLAS_RESERVA_ONLINE = ["rechazo"];
export const VARIABLES_RESERVA_ONLINE = ["bloqueCancelar", "urlCancelar", "motivoRechazo", "bloqueMotivo"];
