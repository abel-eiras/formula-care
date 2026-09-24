-- La última visita se calcula a partir de los servicios (no se guardaba nunca)
ALTER TABLE "Paciente" DROP COLUMN "lastVisit";
