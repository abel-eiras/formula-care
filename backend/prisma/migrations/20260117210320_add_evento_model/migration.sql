CREATE TABLE "Evento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "dias" TEXT NOT NULL DEFAULT '[]',
    "horas" TEXT NOT NULL DEFAULT '[]',
    "duracion" INTEGER NOT NULL DEFAULT 60,
    "maxAsistentes" INTEGER NOT NULL DEFAULT 1,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Evento_activo_idx" ON "Evento"("activo");
CREATE INDEX "Evento_nombre_idx" ON "Evento"("nombre");
