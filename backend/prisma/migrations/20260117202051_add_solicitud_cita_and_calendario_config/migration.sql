-- CreateTable
CREATE TABLE "SolicitudCita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombreCliente" TEXT NOT NULL,
    "emailCliente" TEXT NOT NULL,
    "telefonoCliente" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "pacienteId" TEXT,
    "citaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SolicitudCita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SolicitudCita_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracionCalendario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "horariosPorTipo" TEXT NOT NULL DEFAULT '{}',
    "fechasBloqueadas" TEXT NOT NULL DEFAULT '[]',
    "horasBloqueadas" TEXT NOT NULL DEFAULT '{}',
    "autoAceptar" BOOLEAN NOT NULL DEFAULT false,
    "duracionPorTipo" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SolicitudCita_fecha_idx" ON "SolicitudCita"("fecha");

-- CreateIndex
CREATE INDEX "SolicitudCita_estado_idx" ON "SolicitudCita"("estado");

-- CreateIndex
CREATE INDEX "SolicitudCita_tipo_idx" ON "SolicitudCita"("tipo");

-- CreateIndex
CREATE INDEX "SolicitudCita_emailCliente_idx" ON "SolicitudCita"("emailCliente");
