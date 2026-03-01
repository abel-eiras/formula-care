-- CreateTable
CREATE TABLE "ConfiguracionPlataforma" (
    "id" TEXT NOT NULL,
    "emailProvider" TEXT NOT NULL DEFAULT 'smtp',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "resendApiKey" TEXT,
    "emailNombreRemitente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionPlataforma_pkey" PRIMARY KEY ("id")
);
