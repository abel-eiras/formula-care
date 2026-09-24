-- Reserva online como buzón cifrado (booking-web publica huecos y recoge solicitudes)
ALTER TABLE "Cita" ADD COLUMN "tokenCancelacion" TEXT;
CREATE UNIQUE INDEX "Cita_tokenCancelacion_key" ON "Cita"("tokenCancelacion");

CREATE TABLE "ReservaOnline" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "urlPublica" TEXT,
    "urlApi" TEXT,
    "tokenSincronizacion" TEXT,
    "clavePublica" TEXT,
    "clavePrivada" TEXT,
    "diasVista" INTEGER NOT NULL DEFAULT 60,
    "antelacionMinimaHoras" INTEGER NOT NULL DEFAULT 24,
    "ultimaSincronizacion" DATETIME,
    "ultimoError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "SolicitudOnline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "fechaNacimiento" TEXT,
    "sexo" TEXT,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivoRechazo" TEXT,
    "pacienteId" TEXT,
    "citaId" TEXT,
    "recibidaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEn" DATETIME
);
CREATE INDEX "SolicitudOnline_estado_idx" ON "SolicitudOnline"("estado");
CREATE INDEX "SolicitudOnline_fecha_idx" ON "SolicitudOnline"("fecha");
