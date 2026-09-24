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
    "tipo" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "ProgramaNutricion_pacienteId_idx" ON "ProgramaNutricion"("pacienteId");

-- CreateIndex
CREATE INDEX "ProgramaNutricion_estado_idx" ON "ProgramaNutricion"("estado");

-- CreateIndex
CREATE INDEX "VisitaNutricion_programaId_idx" ON "VisitaNutricion"("programaId");

-- CreateIndex
CREATE INDEX "VisitaNutricion_fecha_idx" ON "VisitaNutricion"("fecha");

-- CreateIndex
CREATE INDEX "RegistroAlimentacion_programaId_idx" ON "RegistroAlimentacion"("programaId");

-- CreateIndex
CREATE INDEX "RegistroAlimentacion_fecha_idx" ON "RegistroAlimentacion"("fecha");

