# booking-web

Servicio **opcional** y **autoalojable** para que los pacientes pidan cita por
internet a una farmacia que usa la app de escritorio de este repositorio.

> **Desactivado por ahora en la app.** Hasta que la farmacia tenga dónde
> alojarlo y el correo configurado, la app no muestra nada de la reserva
> online ni sincroniza. Para activarlo, pon `RESERVA_ONLINE_DISPONIBLE = true`
> en `src/lib/funciones.ts` y en `backend/src/config/funciones.ts`.

Funciona como un **buzón cifrado**: la app de escritorio es la única fuente de
verdad de la agenda y booking-web solo guarda lo imprescindible para que la
página de reserva funcione mientras la farmacia está cerrada o con el equipo
apagado.

## Cómo funciona

```
 Paciente (navegador)             booking-web (internet)              App de escritorio (farmacia)
 ────────────────────             ──────────────────────              ────────────────────────────
                                   Publicación  ◄──── PUT /api/sync/publicacion ──── huecos libres,
 GET /api/public/reserva  ◄──────  (huecos, marca,                                  marca, textos legales,
                                    clave pública)                                   clave pública
 Cifra sus datos con la
 clave pública de la farmacia
 POST /api/public/solicitudes ───► Buzón (solo
                                    texto cifrado) ───► GET /api/sync/buzon ───────► descifra, guarda,
                                                   ◄─── POST /api/sync/buzon/recibido  avisa al personal
                                                        (se borra del servidor)
                                                                                     Aceptar → cita +
 Email de confirmación  ◄──────────────────────────────────────────────────────────  email (con enlace
 con enlace "cancelar"                                                                para cancelar)
 POST /api/public/cancelaciones ─► Buzón ─────────────► la app valida el enlace
                                                        y cancela la cita
```

- **La app publica sus huecos libres** cada 2 minutos y justo después de cada
  cambio de agenda. Los calcula con el horario de cada servicio, sus citas
  (de cualquier tipo), los días cerrados, los eventos con plazas y las
  solicitudes pendientes. Así no se ofrecen huecos que ya están ocupados en la
  farmacia.
- **Los datos personales se cifran en el navegador** del paciente con la clave
  pública de la farmacia (ECDH P-256 → HKDF-SHA256 → AES-256-GCM, clave
  efímera por solicitud). El servidor solo ve el servicio, la fecha y la hora
  (los necesita para reservar el hueco), que además van autenticados: si
  alguien los cambia, la app no puede descifrar el sobre y lo descarta. La
  clave privada nunca sale del equipo de la farmacia.
- **La app recoge el buzón con conexiones salientes**: no hay que abrir puertos
  en la farmacia. Primero guarda lo recogido, después publica los huecos
  actualizados y por último confirma la recepción; el servidor borra entonces
  lo recogido. Lo que no se recoja en 30 días se borra solo.
- **El personal acepta o rechaza en la app** (Calendario → Solicitudes online).
  Al aceptar se crea la cita (y el paciente, si es nuevo) y se envía la
  confirmación con el correo configurado en la app; el email lleva un enlace
  para cancelar. Al rechazar, el paciente recibe un email con el motivo.
  Opcionalmente, las solicitudes se pueden aceptar solas.
- **Cancelar**: el enlace del email lleva un token aleatorio que solo la app
  conoce. booking-web lo guarda sin poder validarlo; la app lo comprueba,
  cancela la cita, libera el hueco y avisa por email.

### Qué no protege el cifrado

El código de la página lo sirve este servidor: quien lo controle podría
modificarlo para capturar los datos antes de cifrarlos. El cifrado protege los
datos **guardados** (copias de seguridad, filtraciones de la base de datos, un
proveedor de hosting curioso), no frente a un servidor comprometido de forma
activa. Aloja booking-web en un proveedor de confianza y con HTTPS (el cifrado
del navegador solo funciona en páginas https:// o en localhost).

La huella de la clave aparece en la app (Configuración → Reserva online); si
algún día cambia sin que lo hayas hecho tú, investiga.

## Estructura

```
booking-web/
├── backend/     Express + Prisma: publicación, buzón y API de sincronización
│   ├── prisma/schema.prisma      Publicacion, Solicitud, Cancelacion
│   └── src/
│       ├── publicacion.ts        Formato de la publicación y huecos vigentes
│       ├── rutas/publicas.ts     /api/public/*
│       ├── rutas/sincronizacion.ts  /api/sync/* (token SYNC_TOKEN)
│       ├── captcha.ts            reCAPTCHA Enterprise opcional
│       └── server.ts
└── frontend/    Vite + React: página de reserva, textos legales y cancelación
    └── src/
        ├── lib/cifrado.ts        Cifrado en el navegador (espejo del de la app)
        └── pages/                SolicitarCita, LegalPublico, CancelarCita
```

Son proyectos npm independientes del resto del repositorio. El cifrado está
duplicado a propósito en `frontend/src/lib/cifrado.ts` y en
`backend/src/services/reservaOnline/cifrado.ts` de la app: si se cambia uno,
hay que cambiar el otro.

## Puesta en marcha

1. **En la app de escritorio**: Configuración → Reserva online → *Generar* token
   y cópialo. Configura también los horarios de los servicios que quieras
   ofrecer.
2. **Despliega booking-web** (ver abajo) con ese token en `SYNC_TOKEN`.
3. **En la app**: escribe la dirección de la página de reserva y la de la API
   (normalmente la misma con `/api`), activa la reserva online y guarda. En
   unos segundos debería aparecer "Última sincronización".

La app sincroniza mientras está abierta. Si se cierra, la página sigue
aceptando solicitudes sobre los últimos huecos publicados (se descartan los
que ya han pasado) y la app las recoge al volver a abrirse.

## Configuración (`backend/.env`)

Copia `backend/.env.example` a `backend/.env`:

- `DATABASE_URL`: base de datos (Postgres por defecto, ver abajo).
- `SYNC_TOKEN`: el token generado en la app (mínimo 16 caracteres).
- `CORS_ORIGIN`: origen del frontend (por ejemplo `https://citas.tufarmacia.es`).
- `TRUST_PROXY`: `1` si va detrás de un proxy (Render, Fly.io, Nginx), para que
  el límite de peticiones use la IP real.
- Opcional, contra envíos masivos: `RECAPTCHA_ENTERPRISE_API_KEY`,
  `RECAPTCHA_ENTERPRISE_PROJECT_ID` y `RECAPTCHA_SITE_KEY`. Sin ellas no se exige
  captcha (siempre hay un límite de peticiones por IP).

booking-web no envía correos ni guarda configuración: la marca, los textos
legales y los emails salen de la app.

Frontend: copia `frontend/.env.example` a `frontend/.env` y ajusta
`VITE_API_URL` (URL del backend con `/api`).

### Base de datos

El esquema usa Postgres (lo habitual en Render, Fly.io o Supabase):

```
DATABASE_URL="postgresql://usuario:password@host:5432/booking"
```

Para autoalojar con SQLite en un disco persistente, cambia `provider` a
`"sqlite"` en `prisma/schema.prisma`, usa `DATABASE_URL="file:./booking.db"` y
genera la migración con `npx prisma migrate dev`. Guarda poca cosa y durante
poco tiempo: si se pierde, la app vuelve a publicar en 2 minutos y solo se
perderían las solicitudes aún no recogidas.

## Desarrollo

```bash
# Backend
cd booking-web/backend
npm install
npx prisma migrate deploy
npm run dev               # http://localhost:4000

# Frontend
cd booking-web/frontend
npm install
npm run dev               # http://localhost:5174
```

Rutas del frontend: `/` (pedir cita), `/legal/:tipo` (`aviso-legal`,
`privacidad`, `cookies`) y `/cancelar/:token` (enlace de los emails).

## Producción

```bash
cd booking-web/backend && npm install && npm run build && npx prisma migrate deploy && npm start
cd booking-web/frontend && npm install && npm run build   # dist/ es un sitio estático
```

`backend/Dockerfile` construye la imagen y aplica las migraciones al arrancar.
El frontend compilado se puede servir desde cualquier hosting estático
(Netlify, Cloudflare Pages, el Nginx del VPS...) apuntando `VITE_API_URL` al
backend. Sirve ambos con HTTPS.

## Verificación

Probado de extremo a extremo con Postgres 16 y el backend de la app: publicar →
pedir cita cifrada desde el navegador → hueco ocupado al instante (409 si se
repite) → sobre manipulado detectado y descartado → recogida y borrado del
buzón → aceptar (paciente nuevo, email con enlace) → cancelar desde el enlace
(cita cancelada, hueco liberado, email) → rechazar con motivo → evento con
plazas limitadas y aceptación automática.

## Licencia

MIT, igual que el resto del repositorio (ver `LICENSE` en la raíz).
