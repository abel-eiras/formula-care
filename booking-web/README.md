# booking-web

Servicio **opcional** y **autoalojable** de reserva pública de citas por internet,
para pharmacias que usan la app de escritorio de este repositorio y quieren
además dejar que sus pacientes soliciten cita online sin iniciar sesión.

## Qué es esto y por qué existe

El proyecto original (antes de convertirse en app de escritorio Tauri) permitía
a los pacientes solicitar cita desde una página pública, sin login, con enlaces
de confirmar/modificar/cancelar por email y protección reCAPTCHA. Ese flujo
necesita un servidor accesible desde internet, lo cual no encaja con la nueva
app de escritorio (`backend/` + `src/` + `src-tauri/`), pensada para funcionar
en local, sin conexión.

`booking-web/` conserva esa funcionalidad como un servicio **independiente**:

- Es **opcional**: si una farmacia no quiere reserva online, simplemente no
  despliega `booking-web/` y usa la app de escritorio como siempre.
- Se despliega **por separado** (Render, Fly.io, un VPS con Docker, etc.), con
  su propia base de datos.
- **No está sincronizado** con la base de datos local de la app de escritorio
  (ver la sección "Limitación importante" más abajo).

## Estructura

```
booking-web/
├── backend/     Express + Prisma (API pública + panel de personal)
│   ├── prisma/schema.prisma
│   ├── prisma/seed.ts
│   └── src/
│       ├── controllers/   solicitudesPublicas.ts, accionesCita.ts, staff.ts
│       ├── services/      disponibilidadService, emailService, tokenService, encryptionService
│       ├── middleware/    staffAuth.ts
│       ├── routes/        public.ts, staff.ts
│       └── server.ts
└── frontend/    Vite + React + TS (página de reserva + panel de personal)
    └── src/
        ├── pages/         SolicitarCita, LegalPublico, Confirmar/Modificar/CancelarCita
        └── pages/staff/   StaffLogin, StaffLayout, StaffInbox, StaffSettings
```

Ambos son proyectos Node/npm completamente independientes del resto del
repositorio (tienen su propio `package.json`, su propio `node_modules`, etc.).
Instalarlos o construirlos nunca toca `backend/`, `src/`, `src-tauri/` ni el
`package.json` de la raíz.

## Modelo de datos: un solo tenant

A diferencia del backend multi-tenant original, `booking-web` asume **una
farmacia por despliegue** (igual que la app de escritorio). No hay modelo
`Farmacia`: la marca, los datos de contacto y los textos legales viven en la
fila singleton `Configuracion` (`id: "singleton"`), igual que en
`backend/prisma/schema.prisma` de la app de escritorio.

Modelos principales (ver `backend/prisma/schema.prisma` para el detalle):

- `Configuracion` (singleton): branding, contacto, textos legales, SMTP/Resend.
- `ConfiguracionCalendario` (singleton): horarios por tipo de servicio, fechas
  y horas bloqueadas, `autoAceptar`, duración por tipo.
- `Evento`: talleres/jornadas puntuales, con sus propias fechas/horas/aforo.
- `SolicitudCita`: solicitudes pendientes de revisión (nombre/email/teléfono
  del cliente **encriptados** con AES-256-GCM, igual que en el backend
  original — ver `src/services/encryptionService.ts`).
- `Cita`: registro **local y mínimo** de las citas que `booking-web` ha creado
  o aprobado — ver limitación importante debajo.
- `TokenAccionCita`: tokens de un solo uso para los enlaces de
  confirmar/modificar/cancelar por email.
- `PlantillaEmail`: una plantilla editable por tipo (`confirmacion`,
  `cancelacion`, `modificacion`, `rechazo`); si no hay plantilla activa en BD
  se usa un HTML por defecto embebido en `emailService.ts`.

### Limitación importante: sin sincronización con la app de escritorio

`booking-web` tiene su **propia** tabla `Cita`, separada de la base de datos
SQLite local de la app de escritorio. Se usa **únicamente** para que este
servicio calcule su propia disponibilidad y no deje que dos reservas online
choquen entre sí.

Esto significa que:

- Si el personal acepta una solicitud de `booking-web` desde el panel de
  staff, esa cita **no aparece automáticamente** en la app de escritorio.
- Si el personal agenda una cita por teléfono o en persona **solo** en la app
  de escritorio, ese hueco **no se bloquea** en `booking-web` — un paciente
  online podría solicitar esa misma fecha/hora.
- Con `autoAceptar` activado, `booking-web` bloquea en tiempo real los huecos
  que él mismo aprueba, pero sigue sin saber nada de lo que pasa en la app de
  escritorio.

**Mitigación recomendada para v1**: el personal debe revisar ambos calendarios
(el de la app de escritorio y la bandeja de `booking-web`) antes de aceptar
una solicitud, especialmente si `autoAceptar` está desactivado (recomendado).
Sincronizar ambas bases de datos queda fuera del alcance de esta fase.

## Panel de personal (staff)

No hay sistema de usuarios ni roles: basta con una contraseña compartida
(`STAFF_PASSWORD`) para entrar en `/staff`. Al iniciar sesión se emite una
cookie HttpOnly firmada (JWT, `STAFF_SESSION_SECRET`) válida 12 horas.

Desde `/staff` el personal puede:

- Ver solicitudes pendientes/aprobadas/rechazadas (`/staff/solicitudes`).
- Aprobar una solicitud (crea la `Cita` local y envía el email de
  confirmación) o rechazarla (envía un email de rechazo con motivo opcional).
- Editar los ajustes básicos (`/staff/ajustes`): datos de la farmacia, textos
  legales, configuración de email (SMTP/Resend) y algunos ajustes de
  calendario (auto-aceptar, duración por tipo de servicio).

Los horarios detallados por día de la semana y las fechas/horas bloqueadas
(`ConfiguracionCalendario.horariosPorTipo` / `fechasBloqueadas` /
`horasBloqueadas`) no tienen todavía una UI dedicada — se pueden editar
directamente en la base de datos o ampliando `StaffSettings.tsx` más adelante.

## Configuración (`backend/.env`)

Copia `backend/.env.example` a `backend/.env` y rellena, como mínimo:

- `DATABASE_URL` — ver más abajo (Postgres o SQLite).
- `ENCRYPTION_KEY` — 64 caracteres hex (32 bytes). Genera una con:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `STAFF_PASSWORD` — contraseña del panel de personal.
- `STAFF_SESSION_SECRET` — secreto para firmar la cookie de sesión de staff
  (mismo comando de arriba para generarlo).
- `APP_URL` — URL pública del **frontend** (se usa para construir los enlaces
  de los emails).
- `CORS_ORIGIN` — origen(es) del frontend, separados por coma.

Opcionales:

- `RESEND_API_KEY` o `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`
  — si no configuras ninguno, los emails no se envían de verdad: se registran
  en la consola del servidor (modo *dry-run*), así que el servicio funciona
  igualmente sin credenciales de correo (útil para probarlo).
- `RECAPTCHA_ENTERPRISE_API_KEY` + `RECAPTCHA_ENTERPRISE_PROJECT_ID` +
  `RECAPTCHA_SITE_KEY` — si no defines `RECAPTCHA_ENTERPRISE_API_KEY`, no se
  exige ni se valida ningún captcha en `/api/public/solicitar-cita`. No hace
  falta una cuenta de Google Cloud para desplegar esto.

Para el frontend, copia `frontend/.env.example` a `frontend/.env` y ajusta
`VITE_API_URL` a la URL del backend (con el sufijo `/api`).

### Base de datos: Postgres (por defecto) o SQLite

El esquema (`backend/prisma/schema.prisma`) usa `provider = "postgresql"` por
defecto — es lo habitual para un servicio siempre encendido en Render,
Fly.io o Supabase. Formato de `DATABASE_URL`:

```
DATABASE_URL="postgresql://usuario:password@host:5432/nombre_bd"
```

Si prefieres autoalojar con SQLite (por ejemplo un VPS propio con disco
persistente, igual que hace la app de escritorio), cambia el `provider` en
`schema.prisma` a `"sqlite"` y usa:

```
DATABASE_URL="file:./booking.db"
```

## Desarrollo

```bash
# Backend
cd booking-web/backend
npm install
npx prisma generate
npx prisma migrate dev   # crea las tablas (primera vez)
npm run seed             # crea las filas singleton y plantillas de email por defecto
npm run dev              # http://localhost:4000

# Frontend (en otra terminal)
cd booking-web/frontend
npm install
npm run dev               # http://localhost:5174
```

La página pública de reserva vive en `/`, los textos legales en
`/legal/:tipo` (`aviso-legal` | `privacidad` | `cookies`), las acciones de
cita desde email en `/cita/confirmar/:token`, `/cita/modificar/:token` y
`/cita/cancelar/:token`, y el panel de personal en `/staff`.

## Build / despliegue en producción

```bash
# Backend
cd booking-web/backend
npm install
npm run build            # prisma generate + tsc -> dist/
npx prisma migrate deploy
npm start                 # node dist/server.js

# Frontend
cd booking-web/frontend
npm install
npm run build             # tsc --noEmit + vite build -> dist/ (sirve como sitio estático)
```

El frontend compilado (`frontend/dist/`) es un sitio estático: puedes servirlo
con cualquier CDN/hosting estático (Vercel, Netlify, Cloudflare Pages, el
propio Nginx del VPS, etc.), apuntando `VITE_API_URL` a donde despliegues el
backend.

Para el backend:

- **Render / Fly.io**: añade un servicio Postgres, configura las variables de
  entorno de `.env.example` en el panel del proveedor, y usa `npm run build`
  como build command y `npm start` como start command (o el `Dockerfile`
  incluido).
- **Docker**: `booking-web/backend/Dockerfile` construye la imagen y ejecuta
  `prisma migrate deploy` al arrancar el contenedor. Necesitas un Postgres
  accesible (o cambiar el esquema a SQLite y montar un volumen persistente).

## Verificación realizada durante el desarrollo

El backend se verificó de extremo a extremo contra SQLite local:
`solicitar-cita` → login de staff → listar solicitudes pendientes → aprobar
(crea `Cita` + genera tokens + email en modo dry-run) → verificar/confirmar
token → verificar/cancelar token, además de rechazar una solicitud y de leer
y actualizar `Configuracion`/`ConfiguracionCalendario`/`Evento` desde el panel
de staff. `npx tsc --noEmit` pasa limpio en backend y frontend, y
`npm run build` completa correctamente en ambos.

## Limitaciones conocidas (fuera de alcance de esta fase)

- Sin sincronización con la base de datos de la app de escritorio (ver arriba).
- Sin UI dedicada para editar horarios por día de la semana o fechas/horas
  bloqueadas (se edita el JSON directamente en `ConfiguracionCalendario`).
- Sin UI para editar el contenido de `PlantillaEmail` (se puede editar
  directamente en la base de datos; el HTML por defecto generado en código
  cubre los cuatro tipos de email).
- Sin recordatorio automático de citas (existía como tarea programada en el
  backend original; aquí no hay ningún proceso en segundo plano/cron).
- reCAPTCHA Enterprise requiere credenciales de Google Cloud si se activa;
  por defecto está desactivado y no es necesario para desplegar el servicio.

## Licencia

MIT — igual que el resto del repositorio (ver `LICENSE` en la raíz).
