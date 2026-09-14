-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "farmaciaNombre" TEXT,
    "farmaciaDireccion" TEXT,
    "farmaciaCiudad" TEXT,
    "farmaciaTelefono" TEXT,
    "farmaciaEmail" TEXT,
    "farmaciaWeb" TEXT,
    "farmaciaWhatsapp" TEXT,
    "farmaciaLogo" TEXT,
    "temaActivo" TEXT DEFAULT 'default',
    "coloresMarca" TEXT,
    "valoracionBioActiva" BOOLEAN NOT NULL DEFAULT true,
    "parametrosReferencia" TEXT NOT NULL DEFAULT '{}',
    "parametrosBioConfig" TEXT NOT NULL DEFAULT '[]',
    "rgpdRazonSocial" TEXT,
    "rgpdCif" TEXT,
    "rgpdDireccionFiscal" TEXT,
    "rgpdEmailContacto" TEXT,
    "rgpdResponsable" TEXT,
    "rgpdDpo" TEXT,
    "textoAvisoLegal" TEXT,
    "textoPoliticaPrivacidad" TEXT,
    "textoPoliticaCookies" TEXT,
    "textoConsentimiento" TEXT,
    "consentimientoRequerido" BOOLEAN NOT NULL DEFAULT true,
    "consentimientoVersion" TEXT DEFAULT 'v1.0',
    "retencionDatosMeses" INTEGER NOT NULL DEFAULT 60,
    "emailProvider" TEXT DEFAULT 'smtp',
    "resendApiKey" TEXT,
    "emailRemitente" TEXT,
    "emailNombreRemitente" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpAcceptSelfSigned" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "backupPeriodicidad" TEXT NOT NULL DEFAULT 'diaria',
    "backupCifrado" BOOLEAN NOT NULL DEFAULT false,
    "backupCifradoClave" TEXT,
    "backupCifradoSalt" TEXT,
    "backupUltimaEjecucion" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Configuracion" ("coloresMarca", "consentimientoRequerido", "consentimientoVersion", "createdAt", "emailNombreRemitente", "emailProvider", "emailRemitente", "farmaciaCiudad", "farmaciaDireccion", "farmaciaEmail", "farmaciaLogo", "farmaciaNombre", "farmaciaTelefono", "farmaciaWeb", "farmaciaWhatsapp", "id", "parametrosBioConfig", "parametrosReferencia", "resendApiKey", "retencionDatosMeses", "rgpdCif", "rgpdDireccionFiscal", "rgpdDpo", "rgpdEmailContacto", "rgpdRazonSocial", "rgpdResponsable", "smtpAcceptSelfSigned", "smtpHost", "smtpPass", "smtpPort", "smtpSecure", "smtpUser", "temaActivo", "textoAvisoLegal", "textoConsentimiento", "textoPoliticaCookies", "textoPoliticaPrivacidad", "updatedAt", "valoracionBioActiva") SELECT "coloresMarca", "consentimientoRequerido", "consentimientoVersion", "createdAt", "emailNombreRemitente", "emailProvider", "emailRemitente", "farmaciaCiudad", "farmaciaDireccion", "farmaciaEmail", "farmaciaLogo", "farmaciaNombre", "farmaciaTelefono", "farmaciaWeb", "farmaciaWhatsapp", "id", "parametrosBioConfig", "parametrosReferencia", "resendApiKey", "retencionDatosMeses", "rgpdCif", "rgpdDireccionFiscal", "rgpdDpo", "rgpdEmailContacto", "rgpdRazonSocial", "rgpdResponsable", "smtpAcceptSelfSigned", "smtpHost", "smtpPass", "smtpPort", "smtpSecure", "smtpUser", "temaActivo", "textoAvisoLegal", "textoConsentimiento", "textoPoliticaCookies", "textoPoliticaPrivacidad", "updatedAt", "valoracionBioActiva" FROM "Configuracion";
DROP TABLE "Configuracion";
ALTER TABLE "new_Configuracion" RENAME TO "Configuracion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
