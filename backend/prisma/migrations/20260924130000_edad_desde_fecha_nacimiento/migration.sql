-- La edad deja de guardarse: se calcula siempre desde la fecha de nacimiento,
-- que pasa a ser obligatoria y con formato YYYY-MM-DD.
-- Pacientes existentes sin fecha: se aproxima al 1 de enero del año que
-- corresponde a su edad guardada (hay que corregirla al editar el paciente).

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "textoBusqueda" TEXT NOT NULL DEFAULT '',
    "birthDate" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "lastVisit" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Paciente" ("address", "birthDate", "createdAt", "email", "id", "lastVisit", "name", "notes", "origen", "phone", "sex", "textoBusqueda", "updatedAt") SELECT "address", COALESCE(substr("birthDate", 1, 10), printf('%04d-01-01', CAST(strftime('%Y', 'now') AS INTEGER) - "age")), "createdAt", "email", "id", "lastVisit", "name", "notes", "origen", "phone", "sex", "textoBusqueda", "updatedAt" FROM "Paciente";
DROP TABLE "Paciente";
ALTER TABLE "new_Paciente" RENAME TO "Paciente";
CREATE INDEX "Paciente_origen_idx" ON "Paciente"("origen");
CREATE INDEX "Paciente_birthDate_idx" ON "Paciente"("birthDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

