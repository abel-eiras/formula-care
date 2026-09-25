# Correo: referencia técnica

Guía funcional (qué correos se envían, cómo configurarlo desde la app,
problemas frecuentes): [context/guias/CONFIGURACION_EMAIL_Y_MENSAJERIA.md](../context/guias/CONFIGURACION_EMAIL_Y_MENSAJERIA.md).

Todo el envío está en `src/services/emailService.ts`.

## De dónde sale la configuración

`obtenerConfigEmail()` lee la fila única de `Configuracion` (`id = 'singleton'`)
y, para cada campo vacío, cae a la variable de entorno:

| Campo en `Configuracion` | Variable de entorno | Notas |
|--------------------------|---------------------|-------|
| `emailProvider` | — | `smtp` (por defecto) o `resend` |
| `emailRemitente` | `SMTP_FROM` | Si falta, `farmaciaEmail` |
| `emailNombreRemitente` | — | Si falta, `farmaciaNombre` |
| `smtpHost` / `smtpPort` / `smtpSecure` | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Puerto 587 por defecto |
| `smtpAcceptSelfSigned` | — | `tls.rejectUnauthorized = false` |
| `smtpUser` / `smtpPass` | `SMTP_USER` / `SMTP_PASS` | |
| `resendApiKey` | `RESEND_API_KEY` | Si Resend falla, se intenta SMTP |

En la app instalada lo normal es configurarlo desde **Configuración → Correo**;
las variables de entorno sirven para desarrollo.

Los clientes SMTP y Resend se cachean con una huella de la configuración: al
guardar cambios se recrean sin reiniciar.

## API

Todas bajo `verificarToken`; las de correo, además, solo para `admin`.

| Método y ruta | Qué hace |
|---------------|----------|
| `GET /api/configuracion/correo` | Configuración sin credenciales (`smtpPassGuardada`, `resendApiKeyGuardada`) |
| `PUT /api/configuracion/correo` | Guarda; `smtpPass`/`resendApiKey` vacíos u omitidos conservan los guardados |
| `POST /api/configuracion/correo/prueba` | `{ destinatario }` → `{ enviado, pasos[], mensajeError?, sugerencia? }` |

`GET /api/configuracion` y el resto de respuestas de configuración pasan por
`sinSecretos()`: nunca incluyen `smtpPass`, `resendApiKey`,
`backupCifradoClave` ni `backupCifradoSalt`.

## Desarrollo

- Sin SMTP completo y con `NODE_ENV` distinto de `production`, se usa una
  cuenta de **Ethereal**: los correos no llegan a nadie y la consola imprime
  el enlace para verlos.
- En producción (la app instalada) **no** se usa Ethereal: sin configuración
  el envío falla y queda registrado en el log.
- Para probar con un servidor local se puede usar cualquier «catcher» SMTP
  (p. ej. `aiosmtpd`, MailHog o Mailpit) y configurarlo en la pestaña Correo
  como «Otro proveedor» (`127.0.0.1`, su puerto).

## Plantillas

`PlantillaEmail` (una por `tipo`: `confirmacion`, `recordatorio`,
`cancelacion`, `modificacion`, `cumpleanos`…), editables en **Configuración →
Plantillas Email**. `obtenerPlantilla(tipo)` devuelve `null` si está
desactivada y entonces no se envía. Las variables `{{...}}` se sustituyen en
`reemplazarVariables()`; el listado para la interfaz lo da
`GET /api/plantillas-email/variables`.
