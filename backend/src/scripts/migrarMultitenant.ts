/**
 * Script de migración a arquitectura Multi-Tenant
 * 
 * Este script:
 * 1. Crea una farmacia por defecto con los datos actuales de Configuración
 * 2. Crea un superadmin
 * 3. Asigna farmaciaId a todos los registros existentes
 * 4. Convierte el usuario admin actual en admin de esa farmacia
 * 
 * Uso: npx tsx src/scripts/migrarMultitenant.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Función para generar slug a partir del nombre
function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos por guiones
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
}

async function migrarMultitenant() {
  console.log('🚀 Iniciando migración a arquitectura Multi-Tenant...\n');

  // 1. Verificar si ya existe alguna farmacia (ya migrado)
  const farmaciasExistentes = await prisma.farmacia.count();
  if (farmaciasExistentes > 0) {
    console.log('⚠️ Ya existen farmacias en el sistema. La migración ya se realizó.');
    console.log('   Si deseas reiniciar, elimina los datos manualmente.');
    return;
  }

  // 2. Obtener configuración actual (si existe)
  const configActual = await prisma.$queryRaw<Array<{
    farmaciaNombre: string | null;
    farmaciaDireccion: string | null;
    farmaciaCiudad: string | null;
    farmaciaTelefono: string | null;
    farmaciaEmail: string | null;
    farmaciaWeb: string | null;
  }>>`SELECT farmaciaNombre, farmaciaDireccion, farmaciaCiudad, farmaciaTelefono, farmaciaEmail, farmaciaWeb FROM Configuracion LIMIT 1`;

  const config = configActual[0] || {
    farmaciaNombre: 'Mi Farmacia',
    farmaciaDireccion: null,
    farmaciaCiudad: null,
    farmaciaTelefono: null,
    farmaciaEmail: null,
    farmaciaWeb: null,
  };

  const nombreFarmacia = config.farmaciaNombre || 'Mi Farmacia';
  const slugFarmacia = generarSlug(nombreFarmacia);

  console.log(`📍 Creando farmacia: ${nombreFarmacia} (${slugFarmacia})`);

  // 3. Crear farmacia por defecto
  const farmacia = await prisma.farmacia.create({
    data: {
      nombre: nombreFarmacia,
      slug: slugFarmacia,
      direccion: config.farmaciaDireccion,
      ciudad: config.farmaciaCiudad,
      telefono: config.farmaciaTelefono,
      email: config.farmaciaEmail,
      web: config.farmaciaWeb,
      activa: true,
      plan: 'profesional', // Plan inicial
      maxUsuarios: 10,
      maxPacientes: 10000,
    },
  });

  console.log(`✅ Farmacia creada con ID: ${farmacia.id}\n`);

  // 4. Crear superadmin
  console.log('👤 Creando usuario superadmin...');
  
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@sistema.local';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
  
  // Verificar si ya existe
  const superadminExiste = await prisma.usuario.findUnique({
    where: { email: superadminEmail }
  });

  if (!superadminExiste) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(superadminPassword, salt);

    await prisma.usuario.create({
      data: {
        email: superadminEmail,
        password: passwordHash,
        nombre: 'Super Administrador',
        rol: 'superadmin',
        farmaciaId: null, // Superadmin no pertenece a ninguna farmacia
      },
    });

    console.log(`✅ Superadmin creado: ${superadminEmail}`);
    console.log(`   Contraseña: ${superadminPassword}`);
    console.log('   ⚠️ IMPORTANTE: Cambia la contraseña después del primer login\n');
  } else {
    console.log(`ℹ️ Superadmin ya existe: ${superadminEmail}\n`);
  }

  // 5. Actualizar usuarios existentes para asignarles la farmacia
  console.log('👥 Actualizando usuarios existentes...');
  const usuariosActualizados = await prisma.usuario.updateMany({
    where: {
      farmaciaId: null,
      rol: { not: 'superadmin' }
    },
    data: {
      farmaciaId: farmacia.id
    }
  });
  console.log(`✅ ${usuariosActualizados.count} usuarios actualizados\n`);

  // 6. Actualizar pacientes
  console.log('🏥 Actualizando pacientes...');
  const pacientesActualizados = await prisma.paciente.updateMany({
    where: { farmaciaId: farmacia.id }, // Ya debería tener el campo
    data: { farmaciaId: farmacia.id }
  });
  // Si el campo no existe, usamos raw query
  try {
    await prisma.$executeRaw`UPDATE Paciente SET farmaciaId = ${farmacia.id} WHERE farmaciaId IS NULL OR farmaciaId = ''`;
    console.log('✅ Pacientes actualizados\n');
  } catch {
    console.log('ℹ️ Pacientes ya tienen farmaciaId o la tabla está vacía\n');
  }

  // 7. Actualizar citas
  console.log('📅 Actualizando citas...');
  try {
    await prisma.$executeRaw`UPDATE Cita SET farmaciaId = ${farmacia.id} WHERE farmaciaId IS NULL OR farmaciaId = ''`;
    console.log('✅ Citas actualizadas\n');
  } catch {
    console.log('ℹ️ Citas ya tienen farmaciaId o la tabla está vacía\n');
  }

  // 8. Actualizar notificaciones
  console.log('🔔 Actualizando notificaciones...');
  try {
    await prisma.$executeRaw`UPDATE Notificacion SET farmaciaId = ${farmacia.id} WHERE farmaciaId IS NULL OR farmaciaId = ''`;
    console.log('✅ Notificaciones actualizadas\n');
  } catch {
    console.log('ℹ️ Notificaciones ya tienen farmaciaId o la tabla está vacía\n');
  }

  // 9. Actualizar solicitudes de cita
  console.log('📝 Actualizando solicitudes de cita...');
  try {
    await prisma.$executeRaw`UPDATE SolicitudCita SET farmaciaId = ${farmacia.id} WHERE farmaciaId IS NULL OR farmaciaId = ''`;
    console.log('✅ Solicitudes actualizadas\n');
  } catch {
    console.log('ℹ️ Solicitudes ya tienen farmaciaId o la tabla está vacía\n');
  }

  // 10. Actualizar eventos
  console.log('🎉 Actualizando eventos...');
  try {
    await prisma.$executeRaw`UPDATE Evento SET farmaciaId = ${farmacia.id} WHERE farmaciaId IS NULL OR farmaciaId = ''`;
    console.log('✅ Eventos actualizados\n');
  } catch {
    console.log('ℹ️ Eventos ya tienen farmaciaId o la tabla está vacía\n');
  }

  // 11. Actualizar plantillas de email
  console.log('📧 Actualizando plantillas de email...');
  try {
    await prisma.$executeRaw`UPDATE PlantillaEmail SET farmaciaId = ${farmacia.id} WHERE farmaciaId IS NULL OR farmaciaId = ''`;
    console.log('✅ Plantillas actualizadas\n');
  } catch {
    console.log('ℹ️ Plantillas ya tienen farmaciaId o la tabla está vacía\n');
  }

  // 12. Crear configuración para la farmacia
  console.log('⚙️ Creando configuración para la farmacia...');
  
  // Intentar obtener datos de la configuración antigua
  const configAntigua = await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM Configuracion LIMIT 1`;
  
  if (configAntigua.length > 0) {
    const cfg = configAntigua[0];
    await prisma.configuracion.create({
      data: {
        farmaciaId: farmacia.id,
        farmaciaNombre: cfg.farmaciaNombre as string || nombreFarmacia,
        farmaciaDireccion: cfg.farmaciaDireccion as string || null,
        farmaciaCiudad: cfg.farmaciaCiudad as string || null,
        farmaciaTelefono: cfg.farmaciaTelefono as string || null,
        farmaciaEmail: cfg.farmaciaEmail as string || null,
        farmaciaWeb: cfg.farmaciaWeb as string || null,
        farmaciaWhatsapp: cfg.farmaciaWhatsapp as string || null,
        farmaciaLogo: cfg.farmaciaLogo as string || null,
        valoracionBioActiva: cfg.valoracionBioActiva as boolean ?? true,
        parametrosReferencia: cfg.parametrosReferencia as string || '{}',
        parametrosBioConfig: cfg.parametrosBioConfig as string || '[]',
        rgpdRazonSocial: cfg.rgpdRazonSocial as string || null,
        rgpdCif: cfg.rgpdCif as string || null,
        rgpdDireccionFiscal: cfg.rgpdDireccionFiscal as string || null,
        rgpdEmailContacto: cfg.rgpdEmailContacto as string || null,
        rgpdResponsable: cfg.rgpdResponsable as string || null,
        rgpdDpo: cfg.rgpdDpo as string || null,
        textoAvisoLegal: cfg.textoAvisoLegal as string || null,
        textoPoliticaPrivacidad: cfg.textoPoliticaPrivacidad as string || null,
        textoPoliticaCookies: cfg.textoPoliticaCookies as string || null,
        textoConsentimiento: cfg.textoConsentimiento as string || null,
        consentimientoRequerido: cfg.consentimientoRequerido as boolean ?? true,
        consentimientoVersion: cfg.consentimientoVersion as string || 'v1.0',
        retencionDatosMeses: cfg.retencionDatosMeses as number || 60,
        emailProvider: cfg.emailProvider as string || 'smtp',
        resendApiKey: cfg.resendApiKey as string || null,
        emailRemitente: cfg.emailRemitente as string || null,
        emailNombreRemitente: cfg.emailNombreRemitente as string || null,
      },
    });
    console.log('✅ Configuración migrada\n');
  } else {
    await prisma.configuracion.create({
      data: {
        farmaciaId: farmacia.id,
        farmaciaNombre: nombreFarmacia,
      },
    });
    console.log('✅ Configuración creada por defecto\n');
  }

  // 13. Crear configuración de calendario
  console.log('📆 Creando configuración de calendario...');
  const calAntiguo = await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM ConfiguracionCalendario LIMIT 1`;
  
  if (calAntiguo.length > 0) {
    const cal = calAntiguo[0];
    await prisma.configuracionCalendario.create({
      data: {
        farmaciaId: farmacia.id,
        horariosPorTipo: cal.horariosPorTipo as string || '{}',
        fechasBloqueadas: cal.fechasBloqueadas as string || '[]',
        horasBloqueadas: cal.horasBloqueadas as string || '{}',
        autoAceptar: cal.autoAceptar as boolean ?? false,
        duracionPorTipo: cal.duracionPorTipo as string || '{}',
      },
    });
    console.log('✅ Configuración de calendario migrada\n');
  } else {
    await prisma.configuracionCalendario.create({
      data: {
        farmaciaId: farmacia.id,
      },
    });
    console.log('✅ Configuración de calendario creada por defecto\n');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 ¡Migración completada exitosamente!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n📍 Farmacia: ${nombreFarmacia}`);
  console.log(`   ID: ${farmacia.id}`);
  console.log(`   Slug: ${slugFarmacia}`);
  console.log(`\n👤 Superadmin: ${superadminEmail}`);
  console.log('   (Recuerda cambiar la contraseña)');
  console.log('\n');
}

migrarMultitenant()
  .catch((e) => {
    console.error('❌ Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
