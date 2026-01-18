# Configuración del Sistema de Emails

El sistema de emails permite enviar confirmaciones, recordatorios y cancelaciones de citas a los pacientes.

## Modos de Funcionamiento

### Modo Desarrollo (Sin configuración)

Si no se configuran las variables de entorno, el sistema usa automáticamente **Ethereal Email**, un servicio de pruebas que:

- No envía emails reales a los destinatarios
- Genera una URL de preview para ver el email en el navegador
- Muestra la URL en la consola del servidor

**Ejemplo de salida en consola:**
```
⚠️  Configuración SMTP incompleta. Usando Ethereal Email para pruebas...
📧 Cuenta de prueba Ethereal creada:
   Usuario: abc123@ethereal.email
   Los emails se pueden ver en: https://ethereal.email/login
✅ Transportador Ethereal configurado (modo pruebas)
✅ Email enviado vía SMTP a paciente@ejemplo.com
📬 Preview del email (Ethereal):
   https://ethereal.email/message/XXXXXXX
```

Haz clic en la URL de preview para ver el email renderizado.

---

## Configuración para Producción

### Opción 1: SMTP (Gmail, Outlook, Servidor propio)

Crea o edita el archivo `.env` en la carpeta `backend/`:

```env
# Proveedor de email
EMAIL_PROVIDER=smtp

# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
SMTP_FROM=tu-email@gmail.com
```

#### Configuración específica por proveedor:

**Gmail:**
1. Activa la verificación en 2 pasos en tu cuenta Google
2. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Crea una "Contraseña de aplicación" para "Correo"
4. Usa esa contraseña (16 caracteres) en `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=465
SMTP_SECURE=true
```

---

### Opción 2: Resend (Recomendado)

[Resend](https://resend.com) es un servicio moderno de email transaccional con:
- API simple y fiable
- Buenas tasas de entrega
- Analíticas de emails
- Plan gratuito de 3,000 emails/mes

#### Pasos para configurar Resend:

1. **Crear cuenta** en [resend.com](https://resend.com)

2. **Verificar dominio** (o usar el dominio de pruebas `onboarding@resend.dev`)
   - Ve a Settings > Domains
   - Añade tu dominio
   - Configura los registros DNS indicados

3. **Generar API Key**
   - Ve a Settings > API Keys
   - Crea una nueva API Key
   - Copia la clave (empieza por `re_`)

4. **Configurar variables de entorno:**

```env
# Proveedor de email
EMAIL_PROVIDER=resend

# API Key de Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Email remitente (debe estar en un dominio verificado en Resend)
SMTP_FROM=citas@tu-dominio.com
```

---

## Variables de Entorno Disponibles

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `EMAIL_PROVIDER` | `smtp` o `resend` | No (default: smtp) |
| `RESEND_API_KEY` | API Key de Resend | Solo si provider=resend |
| `SMTP_HOST` | Servidor SMTP | Solo si provider=smtp |
| `SMTP_PORT` | Puerto SMTP | Solo si provider=smtp |
| `SMTP_SECURE` | `true` para puerto 465, `false` para 587 | No |
| `SMTP_USER` | Usuario SMTP | Solo si provider=smtp |
| `SMTP_PASS` | Contraseña SMTP | Solo si provider=smtp |
| `SMTP_FROM` | Email remitente | No (usa farmaciaEmail de config) |

---

## Plantillas de Email

Las plantillas se gestionan desde la aplicación:
1. Ve a **Configuración > Plantillas Email**
2. Selecciona la plantilla a editar
3. Modifica el asunto y contenido HTML
4. Usa variables como `{{nombrePaciente}}` que se reemplazarán automáticamente

### Variables disponibles:

| Variable | Descripción |
|----------|-------------|
| `{{nombrePaciente}}` | Nombre del paciente |
| `{{fechaCita}}` | Fecha de la cita formateada |
| `{{horaCita}}` | Hora de la cita |
| `{{tipoServicio}}` | Tipo de servicio (Dermocosmética, Bioquímico, etc.) |
| `{{nombreFarmacia}}` | Nombre de la farmacia |
| `{{direccionFarmacia}}` | Dirección completa |
| `{{telefonoFarmacia}}` | Teléfono de contacto |
| `{{emailFarmacia}}` | Email de la farmacia |
| `{{webFarmacia}}` | Sitio web |
| `{{urlConfirmar}}` | Enlace para confirmar cita |
| `{{urlModificar}}` | Enlace para modificar cita |
| `{{urlCancelar}}` | Enlace para cancelar cita |
| `{{motivoRechazo}}` | Motivo de cancelación (solo en email de cancelación) |
| `{{anioActual}}` | Año actual (para footer) |

---

## Solución de Problemas

### "Los emails no llegan"
1. Revisa la consola del servidor para errores
2. Verifica que las credenciales SMTP son correctas
3. Para Gmail, asegúrate de usar una "Contraseña de aplicación"
4. Revisa la carpeta de spam del destinatario

### "Error: Invalid login"
- Gmail: Necesitas una contraseña de aplicación, no tu contraseña normal
- Outlook: Puede requerir habilitar acceso SMTP en la configuración de la cuenta

### "Error de conexión SMTP"
- Verifica que el host y puerto son correctos
- Algunos servidores bloquean puertos SMTP (prueba con puerto 587 o 465)

### "Resend no envía emails"
- Verifica que la API Key es válida
- El dominio del remitente debe estar verificado en Resend
- Para pruebas, usa `onboarding@resend.dev` como remitente

---

## Reiniciar el Servidor

Después de cambiar la configuración, reinicia el backend:

```bash
# Si usas npm
cd backend && npm run dev

# En producción
pm2 restart backend
# o
systemctl restart farmacia-backend
```
