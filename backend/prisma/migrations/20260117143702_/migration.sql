-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'config',
    "farmaciaNombre" TEXT DEFAULT 'Farmacia Pontevea',
    "farmaciaDireccion" TEXT DEFAULT 'Avda. Ignacio Varela 16, Pontevea',
    "farmaciaCiudad" TEXT DEFAULT '15883 Teo, A Coruña',
    "farmaciaTelefono" TEXT DEFAULT '981 815 708',
    "farmaciaEmail" TEXT DEFAULT 'farmacia@farmaciapontevea.com',
    "farmaciaWeb" TEXT DEFAULT 'www.farmaciapontevea.com',
    "farmaciaWhatsapp" TEXT,
    "farmaciaLogo" TEXT,
    "valoracionBioActiva" BOOLEAN NOT NULL DEFAULT true,
    "parametrosReferencia" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Configuracion" ("createdAt", "farmaciaCiudad", "farmaciaDireccion", "farmaciaEmail", "farmaciaLogo", "farmaciaNombre", "farmaciaTelefono", "farmaciaWeb", "farmaciaWhatsapp", "id", "parametrosReferencia", "updatedAt", "valoracionBioActiva") SELECT "createdAt", "farmaciaCiudad", "farmaciaDireccion", "farmaciaEmail", "farmaciaLogo", "farmaciaNombre", "farmaciaTelefono", "farmaciaWeb", "farmaciaWhatsapp", "id", "parametrosReferencia", "updatedAt", "valoracionBioActiva" FROM "Configuracion";
DROP TABLE "Configuracion";
ALTER TABLE "new_Configuracion" RENAME TO "Configuracion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
