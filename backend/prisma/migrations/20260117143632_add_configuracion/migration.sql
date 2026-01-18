-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmaciaNombre" TEXT DEFAULT 'Farmacia Pontevea',
    "farmaciaDireccion" TEXT DEFAULT 'Avda. Ignacio Varela 16, Pontevea',
    "farmaciaCiudad" TEXT DEFAULT '15883 Teo, A Coruña',
    "farmaciaTelefono" TEXT DEFAULT '981 815 708',
    "farmaciaEmail" TEXT DEFAULT 'farmacia@farmaciapontevea.com',
    "farmaciaWeb" TEXT DEFAULT 'www.farmaciapontevea.com',
    "farmaciaWhatsapp" TEXT,
    "farmaciaLogo" TEXT,
    "valoracionBioActiva" BOOLEAN NOT NULL DEFAULT 1,
    "parametrosReferencia" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insertar registro inicial de configuración
INSERT INTO "Configuracion" ("id", "parametrosReferencia") 
VALUES ('config', '{
  "glucemia": { "normalMin": 70, "normalMax": 100, "advertenciaMin": 100, "advertenciaMax": 125, "criticoMin": 0, "criticoMax": 70, "criticoMin2": 125, "criticoMax2": 999 },
  "cholesterol": { "normalMin": 0, "normalMax": 200, "advertenciaMin": 200, "advertenciaMax": 240, "criticoMin": 240, "criticoMax": 999 },
  "cholesterolHDL": { "normalMin": 40, "normalMax": 999, "advertenciaMin": 35, "advertenciaMax": 40, "criticoMin": 0, "criticoMax": 35 },
  "cholesterolLDL": { "normalMin": 0, "normalMax": 100, "advertenciaMin": 100, "advertenciaMax": 160, "criticoMin": 160, "criticoMax": 999 },
  "triglycerides": { "normalMin": 0, "normalMax": 150, "advertenciaMin": 150, "advertenciaMax": 200, "criticoMin": 200, "criticoMax": 999 },
  "hemoglobinaGlucosilada": { "normalMin": 0, "normalMax": 5.7, "advertenciaMin": 5.7, "advertenciaMax": 6.4, "criticoMin": 6.4, "criticoMax": 999 },
  "proteinaCReactiva": { "normalMin": 0, "normalMax": 3, "advertenciaMin": 3, "advertenciaMax": 10, "criticoMin": 10, "criticoMax": 999 },
  "vitaminaD": { "normalMin": 30, "normalMax": 100, "advertenciaMin": 20, "advertenciaMax": 30, "criticoMin": 0, "criticoMax": 20 },
  "ferritina": { "normalMin": 15, "normalMax": 200, "advertenciaMin": 10, "advertenciaMax": 15, "advertenciaMin2": 200, "advertenciaMax2": 300, "criticoMin": 0, "criticoMax": 10, "criticoMin2": 300, "criticoMax2": 999 },
  "systolic": { "normalMin": 90, "normalMax": 120, "advertenciaMin": 120, "advertenciaMax": 140, "criticoMin": 0, "criticoMax": 90, "criticoMin2": 140, "criticoMax2": 999 },
  "diastolic": { "normalMin": 60, "normalMax": 80, "advertenciaMin": 80, "advertenciaMax": 90, "criticoMin": 0, "criticoMax": 60, "criticoMin2": 90, "criticoMax2": 999 },
  "pulsaciones": { "normalMin": 60, "normalMax": 100, "advertenciaMin": 50, "advertenciaMax": 60, "advertenciaMin2": 100, "advertenciaMax2": 120, "criticoMin": 0, "criticoMax": 50, "criticoMin2": 120, "criticoMax2": 999 },
  "imc": { "normalMin": 18.5, "normalMax": 25, "advertenciaMin": 17, "advertenciaMax": 18.5, "advertenciaMin2": 25, "advertenciaMax2": 30, "criticoMin": 0, "criticoMax": 17, "criticoMin2": 30, "criticoMax2": 999 }
}');
