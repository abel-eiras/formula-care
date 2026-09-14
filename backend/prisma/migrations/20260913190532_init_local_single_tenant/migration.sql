-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalisisDermo" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "hydration" REAL,
    "sebum" REAL,
    "elasticity" REAL,
    "spots" REAL,
    "ph" REAL,
    "treatment" TEXT,
    "cleaning" TEXT,
    "sunProtection" TEXT,
    "supplements" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalisisDermo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalisisBio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "glucemia" REAL,
    "cholesterol" REAL,
    "cholesterolHDL" REAL,
    "cholesterolLDL" REAL,
    "triglycerides" REAL,
    "hemoglobinaGlucosilada" REAL,
    "proteinaCReactiva" REAL,
    "vitaminaD" REAL,
    "ferritina" REAL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulsaciones" INTEGER,
    "weight" REAL,
    "height" REAL,
    "perimetroAbdominal" REAL,
    "imc" REAL,
    "observaciones" TEXT,
    "recomendaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalisisBio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "confirmacionEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "pacienteId" TEXT,
    "citaId" TEXT,
    "analisisId" TEXT,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvio" DATETIME,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fechaLectura" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notificacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notificacion_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Configuracion" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConfiguracionCalendario" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "horariosPorTipo" TEXT NOT NULL DEFAULT '{}',
    "fechasBloqueadas" TEXT NOT NULL DEFAULT '[]',
    "horasBloqueadas" TEXT NOT NULL DEFAULT '{}',
    "autoAceptar" BOOLEAN NOT NULL DEFAULT false,
    "duracionPorTipo" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechas" TEXT NOT NULL DEFAULT '[]',
    "horas" TEXT NOT NULL DEFAULT '[]',
    "duracion" INTEGER NOT NULL DEFAULT 60,
    "maxAsistentes" INTEGER NOT NULL DEFAULT 1,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlantillaEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "contenidoHtml" TEXT NOT NULL,
    "contenidoTexto" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TokenInvitacionUsuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" DATETIME NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenInvitacionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

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
CREATE INDEX "Cita_pacienteId_idx" ON "Cita"("pacienteId");

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");

-- CreateIndex
CREATE INDEX "Notificacion_pacienteId_idx" ON "Notificacion"("pacienteId");

-- CreateIndex
CREATE INDEX "Notificacion_citaId_idx" ON "Notificacion"("citaId");

-- CreateIndex
CREATE INDEX "Notificacion_enviada_idx" ON "Notificacion"("enviada");

-- CreateIndex
CREATE INDEX "Notificacion_leida_idx" ON "Notificacion"("leida");

-- CreateIndex
CREATE INDEX "Evento_activo_idx" ON "Evento"("activo");

-- CreateIndex
CREATE INDEX "Evento_nombre_idx" ON "Evento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaEmail_tipo_key" ON "PlantillaEmail"("tipo");

-- CreateIndex
CREATE INDEX "PlantillaEmail_activa_idx" ON "PlantillaEmail"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "TokenInvitacionUsuario_token_key" ON "TokenInvitacionUsuario"("token");

-- CreateIndex
CREATE INDEX "TokenInvitacionUsuario_token_idx" ON "TokenInvitacionUsuario"("token");

-- CreateIndex
CREATE INDEX "TokenInvitacionUsuario_usuarioId_idx" ON "TokenInvitacionUsuario"("usuarioId");

-- CreateIndex
CREATE INDEX "TokenInvitacionUsuario_expiraEn_idx" ON "TokenInvitacionUsuario"("expiraEn");
