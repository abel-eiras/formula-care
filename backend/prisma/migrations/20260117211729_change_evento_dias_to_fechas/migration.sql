-- AlterTable: Cambiar campo 'dias' por 'fechas' en Evento
-- El campo 'dias' contenía días de la semana, ahora 'fechas' contendrá fechas específicas (YYYY-MM-DD)

-- Renombrar la columna
ALTER TABLE "Evento" RENAME COLUMN "dias" TO "fechas";
