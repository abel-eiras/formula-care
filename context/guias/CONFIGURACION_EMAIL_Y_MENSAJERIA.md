# Correo y mensajería

Cómo funciona el envío de correos en Formula Care (app de escritorio, una
instalación = una farmacia) y cómo dejarlo operativo. Referencia técnica del
backend: [backend/EMAIL_CONFIG.md](../../backend/EMAIL_CONFIG.md).

---

## 1. Qué correos envía la app

| Correo | Cuándo se envía | Plantilla |
|--------|-----------------|-----------|
| Confirmación de cita | Al crear una cita para un paciente con email | `confirmacion` |
| Modificación de cita | Al cambiar fecha u hora de una cita | `modificacion` |
| Cancelación de cita | Al cancelar una cita | `cancelacion` |
| Recordatorio | El día anterior a la cita (tarea periódica, cada hora con la app abierta; se reintenta si falla) | `recordatorio` |
| Informe | Al pulsar «Enviar por email» en un informe (PDF adjunto) | — |
| Felicitación de cumpleaños | Al felicitar desde el aviso de cumpleaños | `cumpleanos` |

Si el paciente no tiene email, no se envía nada. Si una plantilla está
desactivada, ese correo no se envía.

La reserva online (confirmaciones de solicitudes y rechazos) está oculta
mientras `RESERVA_ONLINE_DISPONIBLE` sea `false`.

## 2. Configurar la cuenta de envío

**Configuración → Correo** (solo administradores):

1. Dirección de correo y nombre que verá el paciente.
2. Cómo se envía:
   - **Con mi cuenta de correo** (SMTP): Gmail, Outlook/Microsoft 365 u otro
     proveedor (servidor de correo saliente, puerto, SSL y certificado
     autofirmado).
     - Gmail exige una **contraseña de aplicación** (cuenta de Google →
       Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones).
   - **Con Resend**: clave API; el remitente debe ser de un dominio verificado
     en Resend.
3. **Guardar** y **Enviar correo de prueba**. La prueba muestra el diagnóstico
   por pasos (conexión con el servidor, usuario y contraseña, envío) con una
   sugerencia en lenguaje llano si algo falla.

Las contraseñas se guardan en la base de datos local y nunca se devuelven al
cliente: el formulario solo sabe si hay una guardada. Dejar el campo vacío al
guardar conserva la actual.

Sin configuración, en producción no se envía nada (no se usa Ethereal) y los
recordatorios quedan pendientes hasta que se configure.

## 3. Plantillas

**Configuración → Plantillas Email**: asunto y contenido por tipo, con
variables `{{nombreVariable}}` (la propia pantalla lista las disponibles:
nombre del paciente, fecha y hora, servicio, datos de la farmacia…). Los datos
de la farmacia salen de **Configuración → Datos de la Farmacia**; si faltan,
las variables quedan en blanco.

## 4. Problemas frecuentes

- **No llega nada:** usar el correo de prueba y seguir la sugerencia del paso
  que falla. Revisar también la carpeta de spam.
- **Error de conexión:** servidor o puerto incorrectos, o un antivirus o
  cortafuegos que bloquea los puertos 465/587 en ese ordenador.
- **Usuario o contraseña incorrectos en Gmail:** falta la contraseña de
  aplicación.
- **Error de certificado:** activar «Aceptar certificado autofirmado».
- **Variables en blanco:** completar los datos de la farmacia.

## 5. Documentos relacionados

- [backend/EMAIL_CONFIG.md](../../backend/EMAIL_CONFIG.md): detalles técnicos (API, variables de entorno, desarrollo).
- [backend/README.md](../../backend/README.md): API y arranque del backend.
