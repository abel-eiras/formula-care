# Configuración de plantillas de correo y sistema de mensajería

Guía para dejar operativo el sistema de emails (plantillas, proveedor SMTP/Resend y enlaces de acción) en la siguiente fase. No añade nuevas funciones; solo configuración y comprobaciones.

---

## 1. Resumen del sistema

El sistema permite:

- **Enviar emails** cuando se confirma una cita, se aprueba una solicitud, se envía un recordatorio, se cancela o se rechaza una solicitud.
- **Plantillas por farmacia**: cada farmacia tiene sus propias plantillas (confirmación, recordatorio, cancelación, rechazo) editables desde la app.
- **Proveedor dual**: SMTP (Gmail, Outlook, servidor propio) o Resend; configurable por entorno y opcionalmente por farmacia.
- **Enlaces de acción**: en los emails se insertan URLs para confirmar, modificar o cancelar la cita (con token de un solo uso y expiración).

Referencia técnica del backend: [backend/EMAIL_CONFIG.md](../../backend/EMAIL_CONFIG.md).

---

## 2. Variables de entorno necesarias

### 2.1 Backend (`.env` en `backend/`)

| Variable | Descripción | Cuándo es necesaria |
|----------|-------------|----------------------|
| `APP_URL` | URL base del frontend (donde se abren los enlaces de los emails) | **Siempre** en producción. Ej: `https://tu-app.vercel.app` |
| `EMAIL_PROVIDER` | `smtp` o `resend` | Opcional; por defecto `smtp` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Credenciales SMTP | Si usas SMTP y no configuras Resend por farmacia |
| `SMTP_FROM` | Email remitente por defecto | Opcional; puede venir de la configuración de la farmacia |
| `RESEND_API_KEY` | API Key de Resend | Si usas Resend y no lo configuras por farmacia |

**Importante:** Los enlaces de los emails (confirmar, modificar, cancelar) se construyen con `APP_URL`. Debe coincidir con la URL pública del frontend (ej. Vercel). Si `APP_URL` no está definida, se usa `http://localhost:5173`.

### 2.2 Frontend

No se requieren variables específicas para el sistema de mensajería. Las páginas de acción (confirmar/modificar/cancelar cita) usan la misma `VITE_API_URL` que el resto de la app para llamar al backend.

---

## 3. Configuración por farmacia (desde la aplicación)

Cada farmacia puede tener:

1. **Datos de la farmacia** (Configuración > Datos de la farmacia): nombre, dirección, teléfono, email, web. Se usan en las plantillas como `{{nombreFarmacia}}`, `{{direccionFarmacia}}`, etc.
2. **Plantillas de email** (Configuración > Plantillas de email): asunto y contenido HTML por tipo (confirmación, recordatorio, cancelación, rechazo). Se pueden personalizar y usar variables.
3. **Email (proveedor y remitente)** (si está expuesto en la UI de configuración): `emailProvider` (`smtp` | `resend`), `resendApiKey`, `emailRemitente`, `emailNombreRemitente` se guardan en el modelo `Configuracion` y tienen prioridad sobre las variables de entorno para esa farmacia.

Orden de resolución del remitente y proveedor:

- Primero se mira la **configuración de la farmacia** (Configuracion.emailRemitente, Configuracion.emailProvider, Configuracion.resendApiKey).
- Si no hay configuración por farmacia, se usan las **variables de entorno** (`SMTP_FROM`, `RESEND_API_KEY`, etc.).

---

## 4. Tipos de plantilla y cuándo se envían

| Tipo | Descripción | Momento de envío |
|------|-------------|-------------------|
| `confirmacion` | Cita confirmada | Al aprobar una solicitud de cita (estado solicitud → aprobada, se crea la cita y se envía este email). |
| `recordatorio` | Recordatorio de cita | Mediante tarea programada/cron (por ejemplo, día anterior). Debe existir un job que llame al servicio de envío de recordatorios. |
| `cancelacion` | Cita cancelada | Cuando el paciente o la farmacia cancela la cita; también se reutiliza para rechazo de solicitud (con motivo). |
| `rechazo` | Solicitud rechazada | Al rechazar una solicitud de cita pendiente (se puede usar la plantilla de cancelación con `motivoRechazo`). |

Si no existe plantilla activa para un tipo, ese email no se envía (el código lo comprueba antes de enviar).

---

## 5. Variables disponibles en las plantillas

Todas las plantillas pueden usar estas variables (sintaxis `{{nombreVariable}}`):

| Variable | Descripción |
|----------|-------------|
| `{{nombrePaciente}}` | Nombre del paciente/cliente |
| `{{fechaCita}}` | Fecha de la cita (formato largo, ej. "viernes, 24 de enero de 2026") |
| `{{horaCita}}` | Hora de la cita |
| `{{tipoServicio}}` | Tipo de servicio (ej. Dermocosmética, Análisis Bioquímico) |
| `{{nombreFarmacia}}` | Nombre de la farmacia |
| `{{direccionFarmacia}}` | Dirección (y ciudad si aplica) |
| `{{telefonoFarmacia}}` | Teléfono de contacto |
| `{{emailFarmacia}}` | Email de la farmacia |
| `{{webFarmacia}}` | Sitio web |
| `{{urlConfirmar}}` | Enlace para confirmar la cita (token de un solo uso) |
| `{{urlModificar}}` | Enlace para modificar la cita |
| `{{urlCancelar}}` | Enlace para cancelar la cita |
| `{{motivoRechazo}}` | Motivo del rechazo (solo en email de rechazo/cancelación cuando aplica) |
| `{{anioActual}}` | Año actual (útil para el pie del email) |

Los enlaces `urlConfirmar`, `urlModificar` y `urlCancelar` se generan con `APP_URL` y las rutas del frontend:

- Confirmar: `{APP_URL}/cita/confirmar/{token}`
- Modificar: `{APP_URL}/cita/modificar/{token}`
- Cancelar: `{APP_URL}/cita/cancelar/{token}`

El frontend debe tener estas rutas públicas (sin login) que llaman al API público (`/api/public/cita/confirmar/:token`, etc.).

---

## 6. Rutas del frontend y del API implicadas

Para que los enlaces de los emails funcionen:

| Acción | Ruta frontend | Llamada al backend |
|--------|----------------|--------------------|
| Confirmar cita | `/cita/confirmar/:token` | `POST /api/public/cita/confirmar/:token` |
| Modificar cita | `/cita/modificar/:token` | `GET` (datos) y `POST` (guardar) `/api/public/cita/modificar/:token` |
| Cancelar cita | `/cita/cancelar/:token` | `POST /api/public/cita/cancelar/:token` |

El backend valida el token (existencia, no usado, no expirado) y ejecuta la acción. Tras usarse, el token se marca como usado.

---

## 7. Checklist para la siguiente fase (mensajería funcional)

Usar esta lista para dejar el sistema de mensajería operativo.

### 7.1 Entorno y variables

- [ ] En producción, `APP_URL` en el backend apunta a la URL pública del frontend (ej. `https://tu-dominio.vercel.app`).
- [ ] Definidas las variables de email en `backend/.env` según el proveedor elegido:
  - **SMTP:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y opcionalmente `SMTP_FROM`.
  - **Resend:** `RESEND_API_KEY` y, si aplica, `EMAIL_PROVIDER=resend`. Remitente en Resend o en `SMTP_FROM` / configuración de farmacia.

### 7.2 Configuración por farmacia

- [ ] En la app, cada farmacia tiene rellenados los **Datos de la farmacia** (nombre, dirección, teléfono, email, web) para que las variables `{{nombreFarmacia}}`, etc. tengan valor en los emails.
- [ ] Revisadas o creadas las **plantillas de email** por farmacia (confirmación, recordatorio, cancelación/rechazo) en Configuración > Plantillas de email.
- [ ] Si se usa Resend o SMTP por farmacia, configurado en la pantalla de configuración de la farmacia (email remitente, proveedor, API Key si aplica).

### 7.3 Plantillas por defecto

- [ ] Si una farmacia no tiene plantillas, el backend puede usar plantillas por defecto al crear la farmacia o al hacer seed. Comprobar que el seed o el flujo de alta de farmacia crea registros en `PlantillaEmail` para los tipos `confirmacion`, `recordatorio`, `cancelacion` (y `rechazo` si se usa).

### 7.4 Envío de emails

- [ ] **Confirmación:** al aprobar una solicitud de cita se llama a `enviarConfirmacionCita`. Comprobar que, tras aprobar, llega el email y los enlaces abren el frontend correcto.
- [ ] **Rechazo:** al rechazar una solicitud se llama a `enviarRechazoSolicitud`. Comprobar que llega el email con el motivo si se ha rellenado.
- [ ] **Cancelación:** al cancelar una cita (paciente o farmacia) se llama a `enviarCancelacionCita`. Comprobar envío.
- [ ] **Recordatorio:** si está implementado el envío de recordatorios (cron/job), configurar la tarea y comprobar que usa la plantilla `recordatorio` y que las URLs siguen siendo válidas.

### 7.5 Enlaces de acción

- [ ] Abrir un email de confirmación y pulsar "Confirmar asistencia", "Modificar cita" y "Cancelar cita". Verificar que:
  - Se abre el frontend en `APP_URL`.
  - Las rutas `/cita/confirmar/:token`, `/cita/modificar/:token`, `/cita/cancelar/:token` cargan y el backend acepta el token.
  - Tras confirmar o cancelar, el token deja de ser válido (no se puede reutilizar).

### 7.6 Tokens

- [ ] Los tokens de acción tienen fecha de expiración (p. ej. confirmar 72 h, modificar 48 h, cancelar 24 h). Si se desea, ejecutar periódicamente la limpieza de tokens expirados (`limpiarTokensExpirados` en `tokenService`) vía cron o job.

### 7.7 Pruebas sin enviar correo real

- [ ] En desarrollo, si no se configuran SMTP ni Resend, el backend usa Ethereal: los correos no llegan a destinatarios reales y se pueden ver en la URL que imprime la consola. Útil para probar contenido y enlaces sin configurar un proveedor real.

---

## 8. Resolución de problemas frecuentes

- **Los enlaces del email llevan a localhost:** comprobar que en el servidor donde corre el backend `APP_URL` está definida y es la URL pública del frontend (sin barra final).
- **No llega ningún email:** revisar consola del backend (errores de SMTP/Resend), credenciales y, en Gmail, uso de "Contraseña de aplicación". Ver [backend/EMAIL_CONFIG.md](../../backend/EMAIL_CONFIG.md).
- **"Este enlace ya ha sido utilizado":** es esperado tras confirmar o cancelar; el token es de un solo uso.
- **"Este enlace ha expirado":** el token tiene caducidad; el paciente debe solicitar una nueva cita o la farmacia debe reenviar/crear nuevo enlace si el sistema lo permite.
- **Variables en blanco en el email:** asegurar que la configuración de la farmacia (nombre, dirección, teléfono, email, web) está guardada y que las variables usadas en la plantilla existen (ver tabla de variables arriba).

---

## 9. Documentos relacionados

- [backend/EMAIL_CONFIG.md](../../backend/EMAIL_CONFIG.md) – Configuración SMTP/Resend, Ethereal y variables de email.
- [backend/README.md](../../backend/README.md) – API y arranque del backend.
- [context/QUICKSTART.md](../QUICKSTART.md) – Comandos e inicio rápido del proyecto.
