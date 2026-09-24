-- CreateTable
CREATE TABLE "Medicion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "analisisBioId" TEXT,
    "visitaNutricionId" TEXT,
    "peso" REAL,
    "altura" REAL,
    "cintura" REAL,
    "cadera" REAL,
    "imc" REAL,
    "icc" REAL,
    "porcentajeGrasa" REAL,
    "masaGrasa" REAL,
    "masaMagra" REAL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulsaciones" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Medicion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Medicion_analisisBioId_fkey" FOREIGN KEY ("analisisBioId") REFERENCES "AnalisisBio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Medicion_visitaNutricionId_fkey" FOREIGN KEY ("visitaNutricionId") REFERENCES "VisitaNutricion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgramaNutricion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fechaInicio" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fechaFin" TEXT,
    "motivoConsulta" TEXT,
    "objetivoPrincipal" TEXT,
    "pesoObjetivo" REAL,
    "dietasPrevias" TEXT,
    "antecedentes" TEXT NOT NULL DEFAULT '[]',
    "otrosProblemasMedicos" TEXT,
    "antecedentesFamiliares" TEXT,
    "tabaco" TEXT,
    "alcohol" TEXT,
    "glp1Previo" BOOLEAN NOT NULL DEFAULT false,
    "glp1PrevioFarmaco" TEXT,
    "glp1PrevioMotivoAbandono" TEXT,
    "medicoPrescriptor" TEXT,
    "otroTratamientoPeso" TEXT,
    "farmaceutico" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgramaNutricion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisitaNutricion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programaId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "evolucionSubjetiva" TEXT,
    "adherencia" INTEGER,
    "motivacion" INTEGER,
    "medicacionHabitual" TEXT,
    "suplementacion" TEXT,
    "glp1Activo" BOOLEAN NOT NULL DEFAULT false,
    "glp1Farmaco" TEXT,
    "glp1Dosis" TEXT,
    "glp1FechaInicio" TEXT,
    "glp1DosisOlvidadas" INTEGER,
    "efectosSecundarios" TEXT NOT NULL DEFAULT '[]',
    "toleranciaObservaciones" TEXT,
    "cambioDieteticoIniciado" BOOLEAN,
    "pautaDietetica" TEXT,
    "comidasDia" INTEGER,
    "racionesProteinaDia" INTEGER,
    "racionesFrutaVerduraDia" INTEGER,
    "picoteo" BOOLEAN,
    "picoteoFrecuencia" TEXT,
    "picoteoCausas" TEXT NOT NULL DEFAULT '[]',
    "aguaLitros" REAL,
    "suenoHoras" REAL,
    "suenoCalidad" TEXT,
    "estres" TEXT,
    "ejercicio" TEXT,
    "ejercicioTipos" TEXT NOT NULL DEFAULT '[]',
    "ejercicioDiasSemana" INTEGER,
    "ejercicioMinutosSesion" INTEGER,
    "ejercicioDetalle" TEXT,
    "dificultades" TEXT,
    "observaciones" TEXT,
    "objetivosProximaSesion" TEXT,
    "recomendaciones" TEXT,
    "proximaRevision" TEXT,
    "farmaceutico" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisitaNutricion_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "ProgramaNutricion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroAlimentacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programaId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT,
    "momento" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" TEXT,
    "hambreAntes" INTEGER,
    "saciedadDespues" INTEGER,
    "sensaciones" TEXT NOT NULL DEFAULT '[]',
    "compania" TEXT,
    "lugar" TEXT,
    "causaPicoteo" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegistroAlimentacion_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "ProgramaNutricion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Traslada las medidas que ya hubiera en los análisis Bio a la tabla única de mediciones
INSERT INTO "Medicion" ("id", "pacienteId", "fecha", "origen", "analisisBioId", "peso", "altura", "cintura", "imc", "systolic", "diastolic", "pulsaciones", "createdAt", "updatedAt")
SELECT 'bio_' || "id", "pacienteId", substr("fecha", 1, 10), 'bio', "id", "weight", "height", "perimetroAbdominal", "imc", "systolic", "diastolic", "pulsaciones", "createdAt", "updatedAt"
FROM "AnalisisBio"
WHERE COALESCE("weight", "height", "perimetroAbdominal", "imc", "systolic", "diastolic", "pulsaciones") IS NOT NULL;

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
    "observaciones" TEXT,
    "recomendaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalisisBio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AnalisisBio" ("cholesterol", "cholesterolHDL", "cholesterolLDL", "createdAt", "fecha", "ferritina", "glucemia", "hemoglobinaGlucosilada", "id", "observaciones", "pacienteId", "proteinaCReactiva", "recomendaciones", "triglycerides", "updatedAt", "vitaminaD") SELECT "cholesterol", "cholesterolHDL", "cholesterolLDL", "createdAt", "fecha", "ferritina", "glucemia", "hemoglobinaGlucosilada", "id", "observaciones", "pacienteId", "proteinaCReactiva", "recomendaciones", "triglycerides", "updatedAt", "vitaminaD" FROM "AnalisisBio";
DROP TABLE "AnalisisBio";
ALTER TABLE "new_AnalisisBio" RENAME TO "AnalisisBio";
CREATE INDEX "AnalisisBio_pacienteId_idx" ON "AnalisisBio"("pacienteId");
CREATE INDEX "AnalisisBio_fecha_idx" ON "AnalisisBio"("fecha");
CREATE TABLE "new_Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "textoBusqueda" TEXT NOT NULL DEFAULT '',
    "birthDate" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "lastVisit" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Paciente" ("address", "age", "birthDate", "createdAt", "email", "id", "lastVisit", "name", "notes", "origen", "phone", "sex", "updatedAt") SELECT "address", "age", "birthDate", "createdAt", "email", "id", "lastVisit", "name", "notes", "origen", "phone", "sex", "updatedAt" FROM "Paciente";
DROP TABLE "Paciente";
ALTER TABLE "new_Paciente" RENAME TO "Paciente";
CREATE INDEX "Paciente_origen_idx" ON "Paciente"("origen");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Medicion_analisisBioId_key" ON "Medicion"("analisisBioId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicion_visitaNutricionId_key" ON "Medicion"("visitaNutricionId");

-- CreateIndex
CREATE INDEX "Medicion_pacienteId_fecha_idx" ON "Medicion"("pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "ProgramaNutricion_pacienteId_estado_idx" ON "ProgramaNutricion"("pacienteId", "estado");

-- CreateIndex
CREATE INDEX "VisitaNutricion_programaId_fecha_idx" ON "VisitaNutricion"("programaId", "fecha");

-- CreateIndex
CREATE INDEX "RegistroAlimentacion_programaId_fecha_idx" ON "RegistroAlimentacion"("programaId", "fecha");

-- Texto de búsqueda de los pacientes existentes: minúsculas y sin tildes, igual
-- que normalizarBusqueda() en el servidor (SQLite lower() solo convierte ASCII)
UPDATE "Paciente" SET "textoBusqueda" = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(lower("name" || ' ' || "phone" || ' ' || replace("phone", ' ', '') || ' ' || COALESCE("email", '')), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ü', 'u'), 'Á', 'a'), 'É', 'e'), 'Í', 'i'), 'Ó', 'o'), 'Ú', 'u'), 'Ü', 'u'), 'Ñ', 'n'), 'ñ', 'n');
