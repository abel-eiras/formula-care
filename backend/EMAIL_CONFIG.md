# Configuración de Email

Este sistema utiliza `nodemailer` para enviar emails de confirmación de citas.

## Variables de Entorno

Agrega las siguientes variables a tu archivo `.env` en la carpeta `backend/`:

```env
# Configuración SMTP
SMTP_HOST=smtp.gmail.com          # Servidor SMTP (ej: smtp.gmail.com, smtp.outlook.com)
SMTP_PORT=587                     # Puerto SMTP (587 para TLS, 465 para SSL)
SMTP_SECURE=false                 # true para puerto 465 (SSL), false para otros
SMTP_USER=tu-email@gmail.com      # Email desde el que se enviarán los mensajes
SMTP_PASS=tu-contraseña-app       # Contraseña o contraseña de aplicación
SMTP_FROM=tu-email@gmail.com      # Email del remitente (opcional, usa SMTP_USER por defecto)
```

## Ejemplos de Configuración

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicación
```

**Nota:** Para Gmail, necesitas generar una "Contraseña de aplicación" desde tu cuenta de Google:
1. Ve a tu cuenta de Google
2. Seguridad > Verificación en 2 pasos
3. Contraseñas de aplicaciones
4. Genera una nueva contraseña para "Correo"

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-contraseña
```

### Otros Servicios

Consulta la documentación de tu proveedor de email para obtener los valores correctos de `SMTP_HOST` y `SMTP_PORT`.

## Modo de Desarrollo

Si no se configuran las variables de entorno, el sistema usará un transportador de prueba que:
- No envía emails reales
- Muestra los emails en la consola
- Útil para desarrollo y pruebas

## Funcionalidades

- ✅ Envío de confirmación de citas aprobadas
- ✅ Emails HTML con diseño responsive
- ✅ Versión texto plano como alternativa
- ✅ Manejo de errores (no falla la app si el email no se envía)
- ✅ Uso de datos de la farmacia desde la configuración
