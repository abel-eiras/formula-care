-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalisisBio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "glucemia" REAL,
    "cholesterol" REAL,
    "cholesterolHDL" REAL,
    "cholesterolLDL" REAL,
    "triglycerides" REAL,
    "hemoglobinaGlucosilada" REAL,
    "proteinaCReactiva" REAL,
    "vitaminaD" REAL,
    "ferritina" REAL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulsaciones" INTEGER,
    "weight" REAL,
    "height" REAL,
    "imc" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalisisBio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AnalisisBio" ("id", "pacienteId", "fecha", "cholesterol", "triglycerides", "systolic", "diastolic", "weight", "height", "imc", "createdAt", "updatedAt", "glucemia") 
SELECT "id", "pacienteId", "fecha", "cholesterol", "triglycerides", "systolic", "diastolic", "weight", "height", "imc", "createdAt", "createdAt", "glucose" FROM "AnalisisBio";
DROP TABLE "AnalisisBio";
ALTER TABLE "new_AnalisisBio" RENAME TO "AnalisisBio";
CREATE INDEX "AnalisisBio_pacienteId_idx" ON "AnalisisBio"("pacienteId");
CREATE INDEX "AnalisisBio_fecha_idx" ON "AnalisisBio"("fecha");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
