-- Remove Google Calendar and Cal.com integration fields

-- Remove googleEventId from Cita table
CREATE TABLE "new_Cita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "notas" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "new_Cita" ("id", "titulo", "pacienteId", "fecha", "hora", "tipo", "notas", "recordatorioEnviado", "createdAt", "updatedAt")
SELECT "id", "titulo", "pacienteId", "fecha", "hora", "tipo", "notas", "recordatorioEnviado", "createdAt", "updatedAt"
FROM "Cita";

-- Drop old table
DROP TABLE "Cita";

-- Rename new table
ALTER TABLE "new_Cita" RENAME TO "Cita";

-- Recreate indexes
CREATE INDEX "Cita_pacienteId_idx" ON "Cita"("pacienteId");
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- Remove Google Calendar and Cal.com fields from Configuracion table
CREATE TABLE "new_Configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmaciaNombre" TEXT DEFAULT 'Farmacia Pontevea',
    "farmaciaDireccion" TEXT DEFAULT 'Avda. Ignacio Varela 16, Pontevea',
    "farmaciaCiudad" TEXT DEFAULT '15883 Teo, A Coruña',
    "farmaciaTelefono" TEXT DEFAULT '981 815 708',
    "farmaciaEmail" TEXT DEFAULT 'farmacia@farmaciapontevea.com',
    "farmaciaWeb" TEXT DEFAULT 'www.farmaciapontevea.com',
    "farmaciaWhatsapp" TEXT,
    "farmaciaLogo" TEXT,
    "valoracionBioActiva" BOOLEAN NOT NULL DEFAULT true,
    "parametrosReferencia" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data (excluding Google Calendar and Cal.com fields)
INSERT INTO "new_Configuracion" ("id", "farmaciaNombre", "farmaciaDireccion", "farmaciaCiudad", "farmaciaTelefono", "farmaciaEmail", "farmaciaWeb", "farmaciaWhatsapp", "farmaciaLogo", "valoracionBioActiva", "parametrosReferencia", "createdAt", "updatedAt")
SELECT "id", "farmaciaNombre", "farmaciaDireccion", "farmaciaCiudad", "farmaciaTelefono", "farmaciaEmail", "farmaciaWeb", "farmaciaWhatsapp", "farmaciaLogo", "valoracionBioActiva", "parametrosReferencia", "createdAt", "updatedAt"
FROM "Configuracion";

-- Drop old table
DROP TABLE "Configuracion";

-- Rename new table
ALTER TABLE "new_Configuracion" RENAME TO "Configuracion";
