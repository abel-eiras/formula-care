-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "lastVisit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalisisDermo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
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
    CONSTRAINT "AnalisisDermo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalisisBio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "glucose" REAL,
    "cholesterol" REAL,
    "triglycerides" REAL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "weight" REAL,
    "height" REAL,
    "imc" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalisisBio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Paciente_name_idx" ON "Paciente"("name");

-- CreateIndex
CREATE INDEX "Paciente_phone_idx" ON "Paciente"("phone");

-- CreateIndex
CREATE INDEX "AnalisisDermo_pacienteId_idx" ON "AnalisisDermo"("pacienteId");

-- CreateIndex
CREATE INDEX "AnalisisDermo_fecha_idx" ON "AnalisisDermo"("fecha");

-- CreateIndex
CREATE INDEX "AnalisisBio_pacienteId_idx" ON "AnalisisBio"("pacienteId");

-- CreateIndex
CREATE INDEX "AnalisisBio_fecha_idx" ON "AnalisisBio"("fecha");

-- CreateIndex
CREATE INDEX "Cita_pacienteId_idx" ON "Cita"("pacienteId");

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");
