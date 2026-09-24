-- CreateTable
CREATE TABLE "FelicitacionCumpleanos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "canal" TEXT NOT NULL,
    "usuario" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FelicitacionCumpleanos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FelicitacionCumpleanos_pacienteId_anio_key" ON "FelicitacionCumpleanos"("pacienteId", "anio");

