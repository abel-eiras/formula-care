-- Cierre de sesión por inactividad y registro de accesos a datos de pacientes
ALTER TABLE "Configuracion" ADD COLUMN "minutosInactividad" INTEGER NOT NULL DEFAULT 15;

CREATE TABLE "RegistroAcceso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "pacienteId" TEXT,
    "pacienteNombre" TEXT,
    "detalle" TEXT
);

CREATE INDEX "RegistroAcceso_fecha_idx" ON "RegistroAcceso"("fecha");
CREATE INDEX "RegistroAcceso_pacienteId_idx" ON "RegistroAcceso"("pacienteId");
CREATE INDEX "RegistroAcceso_usuarioId_idx" ON "RegistroAcceso"("usuarioId");
