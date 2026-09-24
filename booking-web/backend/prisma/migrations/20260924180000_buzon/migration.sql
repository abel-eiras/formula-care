-- CreateTable
CREATE TABLE "Publicacion" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "datos" TEXT NOT NULL,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "sobre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancelacion" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancelacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Solicitud_createdAt_idx" ON "Solicitud"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cancelacion_token_key" ON "Cancelacion"("token");

-- CreateIndex
CREATE INDEX "Cancelacion_createdAt_idx" ON "Cancelacion"("createdAt");

