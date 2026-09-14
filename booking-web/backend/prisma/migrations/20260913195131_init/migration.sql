-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
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
    "textoAvisoLegal" TEXT,
    "textoPoliticaPrivacidad" TEXT,
    "textoPoliticaCookies" TEXT,
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
    "recaptchaSiteKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionCalendario" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "horariosPorTipo" TEXT NOT NULL DEFAULT '{}',
    "fechasBloqueadas" TEXT NOT NULL DEFAULT '[]',
    "horasBloqueadas" TEXT NOT NULL DEFAULT '{}',
    "autoAceptar" BOOLEAN NOT NULL DEFAULT false,
    "duracionPorTipo" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionCalendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechas" TEXT NOT NULL DEFAULT '[]',
    "horas" TEXT NOT NULL DEFAULT '[]',
    "duracion" INTEGER NOT NULL DEFAULT 60,
    "maxAsistentes" INTEGER NOT NULL DEFAULT 1,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudCita" (
    "id" TEXT NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "emailCliente" TEXT NOT NULL,
    "emailClienteHash" TEXT NOT NULL,
    "telefonoCliente" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "motivoRechazo" TEXT,
    "citaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "emailCliente" TEXT NOT NULL,
    "emailClienteHash" TEXT NOT NULL,
    "telefonoCliente" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "duracion" INTEGER NOT NULL DEFAULT 30,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "confirmacionEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAccionCita" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAccionCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaEmail" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "contenidoHtml" TEXT NOT NULL,
    "contenidoTexto" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evento_activo_idx" ON "Evento"("activo");

-- CreateIndex
CREATE INDEX "SolicitudCita_emailClienteHash_idx" ON "SolicitudCita"("emailClienteHash");

-- CreateIndex
CREATE INDEX "SolicitudCita_estado_idx" ON "SolicitudCita"("estado");

-- CreateIndex
CREATE INDEX "SolicitudCita_fecha_idx" ON "SolicitudCita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAccionCita_token_key" ON "TokenAccionCita"("token");

-- CreateIndex
CREATE INDEX "TokenAccionCita_token_idx" ON "TokenAccionCita"("token");

-- CreateIndex
CREATE INDEX "TokenAccionCita_citaId_idx" ON "TokenAccionCita"("citaId");

-- CreateIndex
CREATE INDEX "TokenAccionCita_expiraEn_idx" ON "TokenAccionCita"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaEmail_tipo_key" ON "PlantillaEmail"("tipo");

-- CreateIndex
CREATE INDEX "PlantillaEmail_activa_idx" ON "PlantillaEmail"("activa");

-- AddForeignKey
ALTER TABLE "TokenAccionCita" ADD CONSTRAINT "TokenAccionCita_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
