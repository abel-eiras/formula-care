/*
  Warnings:

  - Added the required column `updatedAt` to the `AnalisisDermo` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalisisDermo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "motivoConsulta" TEXT,
    "valoracionPiel" TEXT NOT NULL DEFAULT '[]',
    "habitos" TEXT NOT NULL DEFAULT '[]',
    "medicacionHabitual" TEXT,
    "patologias" TEXT,
    "etapaHormonal" TEXT,
    "rutinaDia" TEXT,
    "rutinaNoche" TEXT,
    "cuidadosSemanales" TEXT,
    "suplementacionOral" TEXT,
    "proximaRevision" TEXT,
    "farmaceutico" TEXT,
    "skinType" TEXT,
    "phototype" TEXT,
    "concerns" TEXT NOT NULL DEFAULT '[]',
    "hydration" REAL,
    "sebum" REAL,
    "elasticity" REAL,
    "spots" REAL,
    "ph" REAL,
    "treatment" TEXT,
    "cleaning" TEXT,
    "sunProtection" TEXT,
    "supplements" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalisisDermo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AnalisisDermo" ("cleaning", "concerns", "createdAt", "elasticity", "fecha", "hydration", "id", "pacienteId", "ph", "phototype", "sebum", "skinType", "spots", "sunProtection", "supplements", "treatment", "updatedAt", "valoracionPiel", "habitos") SELECT "cleaning", "concerns", "createdAt", "elasticity", "fecha", "hydration", "id", "pacienteId", "ph", "phototype", "sebum", "skinType", "spots", "sunProtection", "supplements", "treatment", "createdAt", '[]', '[]' FROM "AnalisisDermo";
DROP TABLE "AnalisisDermo";
ALTER TABLE "new_AnalisisDermo" RENAME TO "AnalisisDermo";
CREATE INDEX "AnalisisDermo_pacienteId_idx" ON "AnalisisDermo"("pacienteId");
CREATE INDEX "AnalisisDermo_fecha_idx" ON "AnalisisDermo"("fecha");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
