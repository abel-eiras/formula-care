-- Carpeta adicional para las copias de seguridad (para poder restaurarlas en otro equipo)
ALTER TABLE "Configuracion" ADD COLUMN "backupCarpetaExtra" TEXT;
ALTER TABLE "Configuracion" ADD COLUMN "backupUltimoError" TEXT;
