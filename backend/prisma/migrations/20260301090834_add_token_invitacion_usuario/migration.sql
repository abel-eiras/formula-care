-- CreateTable
CREATE TABLE "TokenInvitacionUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenInvitacionUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenInvitacionUsuario_token_key" ON "TokenInvitacionUsuario"("token");

-- CreateIndex
CREATE INDEX "TokenInvitacionUsuario_token_idx" ON "TokenInvitacionUsuario"("token");

-- CreateIndex
CREATE INDEX "TokenInvitacionUsuario_usuarioId_idx" ON "TokenInvitacionUsuario"("usuarioId");

-- CreateIndex
CREATE INDEX "TokenInvitacionUsuario_expiraEn_idx" ON "TokenInvitacionUsuario"("expiraEn");

-- AddForeignKey
ALTER TABLE "TokenInvitacionUsuario" ADD CONSTRAINT "TokenInvitacionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
