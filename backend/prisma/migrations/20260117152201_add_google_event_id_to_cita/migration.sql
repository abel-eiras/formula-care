-- AlterTable
ALTER TABLE "Cita" ADD COLUMN "googleEventId" TEXT;

-- CreateIndex
CREATE INDEX "Cita_googleEventId_idx" ON "Cita"("googleEventId");
