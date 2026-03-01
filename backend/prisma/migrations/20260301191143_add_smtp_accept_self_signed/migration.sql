-- AlterTable
ALTER TABLE "Configuracion" ADD COLUMN     "smtpAcceptSelfSigned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ConfiguracionPlataforma" ADD COLUMN     "smtpAcceptSelfSigned" BOOLEAN NOT NULL DEFAULT false;
