-- Constancia del consentimiento del paciente (fecha y versión del texto)
ALTER TABLE "Paciente" ADD COLUMN "consentimientoFecha" DATETIME;
ALTER TABLE "Paciente" ADD COLUMN "consentimientoVersion" TEXT;
