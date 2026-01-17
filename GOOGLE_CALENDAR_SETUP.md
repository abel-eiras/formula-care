# Configuración de Google Calendar

Esta guía explica cómo configurar la integración con Google Calendar para sincronizar citas automáticamente.

## Requisitos Previos

1. Una cuenta de Google
2. Acceso a Google Cloud Console

## Pasos de Configuración

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Calendar API"
   - Haz clic en "Enable"

### 2. Configurar OAuth 2.0

1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth client ID"
3. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo de aplicación: "External"
   - Nombre de la aplicación: "Farmacia Pontevea Servicios"
   - Email de soporte: tu email
   - Dominios autorizados: tu dominio (o `localhost` para desarrollo)
   - Guarda y continúa
4. Crea el OAuth Client ID:
   - Tipo de aplicación: "Web application"
   - Nombre: "Farmacia Pontevea Web Client"
   - **Authorized redirect URIs**: 
     - Desarrollo: `http://localhost:5000/api/google-calendar/callback`
     - Producción: `https://tu-dominio.com/api/google-calendar/callback`
   - Haz clic en "Create"
5. Copia el **Client ID** y **Client Secret**

### 3. Configurar Variables de Entorno

Agrega las siguientes variables al archivo `.env` del backend:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=tu-client-id-aqui
GOOGLE_CLIENT_SECRET=tu-client-secret-aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/callback

# URL del frontend (para redirección después de OAuth)
FRONTEND_URL=http://localhost:5173
```

**Para producción**, actualiza:
- `GOOGLE_REDIRECT_URI` con tu dominio real
- `FRONTEND_URL` con tu dominio del frontend

### 4. Configurar en la Aplicación

1. Inicia la aplicación
2. Ve a **Configuración** > **Google Calendar**
3. Haz clic en **"Conectar con Google"**
4. Autoriza el acceso a tu cuenta de Google
5. Selecciona el calendario que quieres usar
6. Guarda la configuración

## Funcionalidades

### Colores de Citas

Las citas se sincronizan con colores diferentes según el tipo:

- **Azul**: Citas de Dermocosmética
- **Verde**: Análisis Bioquímico
- **Lavanda**: Consulta General
- **Amarillo**: Seguimiento

### Sincronización Bidireccional

#### Del Sistema hacia Google Calendar (Automática)

- ✅ Las citas creadas en el sistema se crean automáticamente en Google Calendar
- ✅ Las citas actualizadas se actualizan automáticamente en Google Calendar
- ✅ Las citas eliminadas se eliminan automáticamente de Google Calendar
- ✅ Se guarda el `eventId` de Google Calendar para mantener la sincronización

#### De Google Calendar hacia el Sistema (Manual)

- 🔄 Usa el botón "Sincronizar" en Configuración > Google Calendar
- 🔄 Detecta cambios en Google Calendar (fecha, hora, título, descripción)
- 🔄 Actualiza las citas locales con los cambios de Google Calendar
- 🔄 Elimina citas locales si el evento fue eliminado en Google Calendar
- 🔄 Muestra un resumen de los cambios detectados

### Estado de Sincronización

En la interfaz de configuración puedes ver:
- Número de citas sincronizadas vs total
- Porcentaje de sincronización
- Botón para sincronizar manualmente

## Solución de Problemas

### Error: "redirect_uri_mismatch"

- Verifica que la URI de redirección en Google Cloud Console coincida exactamente con `GOOGLE_REDIRECT_URI`
- Asegúrate de que no haya espacios o caracteres extra

### Error: "invalid_grant"

- El refresh token puede haber expirado
- Desconecta y vuelve a conectar la cuenta

### Las citas no se sincronizan

- Verifica que Google Calendar esté habilitado en Configuración
- Verifica que hayas seleccionado un calendario
- Revisa los logs del backend para errores

## Notas Importantes

- Los tokens OAuth se guardan de forma segura en la base de datos
- El refresh token permite renovar automáticamente el access token
- Solo se sincronizan las citas creadas después de habilitar la integración
- Puedes desconectar la cuenta en cualquier momento desde Configuración
