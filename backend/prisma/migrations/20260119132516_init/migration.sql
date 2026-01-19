-- CreateTable
CREATE TABLE "Farmacia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "direccion" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "web" TEXT,
    "logo" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'basico',
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaExpiracion" TIMESTAMP(3),
    "maxUsuarios" INTEGER NOT NULL DEFAULT 3,
    "maxPacientes" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmacia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "farmaciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "emailHash" TEXT,
    "birthDate" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "lastVisit" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalisisDermo" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "motivoConsulta" TEXT,
    "valoracionPiel" TEXT NOT NULL DEFAULT '[]',
    "habitos" TEXT NOT NULL DEFAULT '[]',
    "medicacionHabitual" TEXT,
    "patologias" TEXT,
    "etapaHormonal" TEXT,
    "rutinaDia" TEXT,
    "rutinaNoche" TEXT,
    "cuidadosSemanales" TEXT,
    "suplementacionOral" TEXT,
    "proximaRevision" TEXT,
    "farmaceutico" TEXT,
    "skinType" TEXT,
    "phototype" TEXT,
    "concerns" TEXT NOT NULL DEFAULT '[]',
    "hydration" DOUBLE PRECISION,
    "sebum" DOUBLE PRECISION,
    "elasticity" DOUBLE PRECISION,
    "spots" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "treatment" TEXT,
    "cleaning" TEXT,
    "sunProtection" TEXT,
    "supplements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalisisDermo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalisisBio" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "glucemia" DOUBLE PRECISION,
    "cholesterol" DOUBLE PRECISION,
    "cholesterolHDL" DOUBLE PRECISION,
    "cholesterolLDL" DOUBLE PRECISION,
    "triglycerides" DOUBLE PRECISION,
    "hemoglobinaGlucosilada" DOUBLE PRECISION,
    "proteinaCReactiva" DOUBLE PRECISION,
    "vitaminaD" DOUBLE PRECISION,
    "ferritina" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulsaciones" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "imc" DOUBLE PRECISION,
    "observaciones" TEXT,
    "recomendaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalisisBio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "confirmacionEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "pacienteId" TEXT,
    "citaId" TEXT,
    "analisisId" TEXT,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvio" TIMESTAMP(3),
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fechaLectura" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "farmaciaNombre" TEXT,
    "farmaciaDireccion" TEXT,
    "farmaciaCiudad" TEXT,
    "farmaciaTelefono" TEXT,
    "farmaciaEmail" TEXT,
    "farmaciaWeb" TEXT,
    "farmaciaWhatsapp" TEXT,
    "farmaciaLogo" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudCita" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "emailCliente" TEXT NOT NULL,
    "emailClienteHash" TEXT NOT NULL,
    "telefonoCliente" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "pacienteId" TEXT,
    "citaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionCalendario" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
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
    "farmaciaId" TEXT NOT NULL,
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
CREATE TABLE "PlantillaEmail" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "Farmacia_slug_key" ON "Farmacia"("slug");

-- CreateIndex
CREATE INDEX "Farmacia_slug_idx" ON "Farmacia"("slug");

-- CreateIndex
CREATE INDEX "Farmacia_activa_idx" ON "Farmacia"("activa");

-- CreateIndex
CREATE INDEX "Farmacia_plan_idx" ON "Farmacia"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_farmaciaId_idx" ON "Usuario"("farmaciaId");

-- CreateIndex
CREATE INDEX "Paciente_farmaciaId_idx" ON "Paciente"("farmaciaId");

-- CreateIndex
CREATE INDEX "Paciente_emailHash_idx" ON "Paciente"("emailHash");

-- CreateIndex
CREATE INDEX "Paciente_origen_idx" ON "Paciente"("origen");

-- CreateIndex
CREATE INDEX "AnalisisDermo_pacienteId_idx" ON "AnalisisDermo"("pacienteId");

-- CreateIndex
CREATE INDEX "AnalisisDermo_fecha_idx" ON "AnalisisDermo"("fecha");

-- CreateIndex
CREATE INDEX "AnalisisBio_pacienteId_idx" ON "AnalisisBio"("pacienteId");

-- CreateIndex
CREATE INDEX "AnalisisBio_fecha_idx" ON "AnalisisBio"("fecha");

-- CreateIndex
CREATE INDEX "Cita_farmaciaId_idx" ON "Cita"("farmaciaId");

-- CreateIndex
CREATE INDEX "Cita_pacienteId_idx" ON "Cita"("pacienteId");

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");

-- CreateIndex
CREATE INDEX "Notificacion_farmaciaId_idx" ON "Notificacion"("farmaciaId");

-- CreateIndex
CREATE INDEX "Notificacion_pacienteId_idx" ON "Notificacion"("pacienteId");

-- CreateIndex
CREATE INDEX "Notificacion_citaId_idx" ON "Notificacion"("citaId");

-- CreateIndex
CREATE INDEX "Notificacion_enviada_idx" ON "Notificacion"("enviada");

-- CreateIndex
CREATE INDEX "Notificacion_leida_idx" ON "Notificacion"("leida");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_farmaciaId_key" ON "Configuracion"("farmaciaId");

-- CreateIndex
CREATE INDEX "Configuracion_farmaciaId_idx" ON "Configuracion"("farmaciaId");

-- CreateIndex
CREATE INDEX "SolicitudCita_farmaciaId_idx" ON "SolicitudCita"("farmaciaId");

-- CreateIndex
CREATE INDEX "SolicitudCita_fecha_idx" ON "SolicitudCita"("fecha");

-- CreateIndex
CREATE INDEX "SolicitudCita_estado_idx" ON "SolicitudCita"("estado");

-- CreateIndex
CREATE INDEX "SolicitudCita_tipo_idx" ON "SolicitudCita"("tipo");

-- CreateIndex
CREATE INDEX "SolicitudCita_emailClienteHash_idx" ON "SolicitudCita"("emailClienteHash");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionCalendario_farmaciaId_key" ON "ConfiguracionCalendario"("farmaciaId");

-- CreateIndex
CREATE INDEX "ConfiguracionCalendario_farmaciaId_idx" ON "ConfiguracionCalendario"("farmaciaId");

-- CreateIndex
CREATE INDEX "Evento_farmaciaId_idx" ON "Evento"("farmaciaId");

-- CreateIndex
CREATE INDEX "Evento_activo_idx" ON "Evento"("activo");

-- CreateIndex
CREATE INDEX "Evento_nombre_idx" ON "Evento"("nombre");

-- CreateIndex
CREATE INDEX "PlantillaEmail_farmaciaId_idx" ON "PlantillaEmail"("farmaciaId");

-- CreateIndex
CREATE INDEX "PlantillaEmail_tipo_idx" ON "PlantillaEmail"("tipo");

-- CreateIndex
CREATE INDEX "PlantillaEmail_activa_idx" ON "PlantillaEmail"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaEmail_farmaciaId_tipo_key" ON "PlantillaEmail"("farmaciaId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAccionCita_token_key" ON "TokenAccionCita"("token");

-- CreateIndex
CREATE INDEX "TokenAccionCita_token_idx" ON "TokenAccionCita"("token");

-- CreateIndex
CREATE INDEX "TokenAccionCita_citaId_idx" ON "TokenAccionCita"("citaId");

-- CreateIndex
CREATE INDEX "TokenAccionCita_expiraEn_idx" ON "TokenAccionCita"("expiraEn");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisDermo" ADD CONSTRAINT "AnalisisDermo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisBio" ADD CONSTRAINT "AnalisisBio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuracion" ADD CONSTRAINT "Configuracion_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCita" ADD CONSTRAINT "SolicitudCita_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCita" ADD CONSTRAINT "SolicitudCita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCita" ADD CONSTRAINT "SolicitudCita_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCalendario" ADD CONSTRAINT "ConfiguracionCalendario_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEmail" ADD CONSTRAINT "PlantillaEmail_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAccionCita" ADD CONSTRAINT "TokenAccionCita_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
