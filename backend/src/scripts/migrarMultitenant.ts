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
 * 
 * NOTA: Este script es compatible con PostgreSQL (Supabase)
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

  // 2. Obtener configuración actual (si existe) - usando Prisma ORM para compatibilidad PostgreSQL
  const configExistente = await prisma.configuracion.findFirst();

  const config = configExistente || {
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

  // 6. Actualizar pacientes (usando Prisma ORM)
  console.log('🏥 Actualizando pacientes...');
  const pacientesActualizados = await prisma.paciente.updateMany({
    where: {
      OR: [
        { farmaciaId: '' },
        { farmaciaId: { isSet: false } }
      ]
    },
    data: { farmaciaId: farmacia.id }
  });
  console.log(`✅ ${pacientesActualizados.count} pacientes actualizados\n`);

  // 7. Actualizar citas
  console.log('📅 Actualizando citas...');
  const citasActualizadas = await prisma.cita.updateMany({
    where: {
      OR: [
        { farmaciaId: '' },
        { farmaciaId: { isSet: false } }
      ]
    },
    data: { farmaciaId: farmacia.id }
  });
  console.log(`✅ ${citasActualizadas.count} citas actualizadas\n`);

  // 8. Actualizar notificaciones
  console.log('🔔 Actualizando notificaciones...');
  const notificacionesActualizadas = await prisma.notificacion.updateMany({
    where: {
      OR: [
        { farmaciaId: '' },
        { farmaciaId: { isSet: false } }
      ]
    },
    data: { farmaciaId: farmacia.id }
  });
  console.log(`✅ ${notificacionesActualizadas.count} notificaciones actualizadas\n`);

  // 9. Actualizar solicitudes de cita
  console.log('📝 Actualizando solicitudes de cita...');
  const solicitudesActualizadas = await prisma.solicitudCita.updateMany({
    where: {
      OR: [
        { farmaciaId: '' },
        { farmaciaId: { isSet: false } }
      ]
    },
    data: { farmaciaId: farmacia.id }
  });
  console.log(`✅ ${solicitudesActualizadas.count} solicitudes actualizadas\n`);

  // 10. Actualizar eventos
  console.log('🎉 Actualizando eventos...');
  const eventosActualizados = await prisma.evento.updateMany({
    where: {
      OR: [
        { farmaciaId: '' },
        { farmaciaId: { isSet: false } }
      ]
    },
    data: { farmaciaId: farmacia.id }
  });
  console.log(`✅ ${eventosActualizados.count} eventos actualizados\n`);

  // 11. Actualizar plantillas de email
  console.log('📧 Actualizando plantillas de email...');
  const plantillasActualizadas = await prisma.plantillaEmail.updateMany({
    where: {
      OR: [
        { farmaciaId: '' },
        { farmaciaId: { isSet: false } }
      ]
    },
    data: { farmaciaId: farmacia.id }
  });
  console.log(`✅ ${plantillasActualizadas.count} plantillas actualizadas\n`);

  // 12. Crear configuración para la farmacia (si no existe ya vinculada)
  console.log('⚙️ Creando configuración para la farmacia...');
  
  const configYaExiste = await prisma.configuracion.findUnique({
    where: { farmaciaId: farmacia.id }
  });

  if (!configYaExiste) {
    // Usar datos de configuración existente sin farmaciaId o crear nuevos
    if (configExistente && !configExistente.farmaciaId) {
      // Actualizar la configuración existente para vincularla a la farmacia
      await prisma.configuracion.update({
        where: { id: configExistente.id },
        data: { farmaciaId: farmacia.id }
      });
      console.log('✅ Configuración existente vinculada a la farmacia\n');
    } else {
      await prisma.configuracion.create({
        data: {
          farmaciaId: farmacia.id,
          farmaciaNombre: nombreFarmacia,
        },
      });
      console.log('✅ Configuración creada por defecto\n');
    }
  } else {
    console.log('ℹ️ La farmacia ya tiene configuración\n');
  }

  // 13. Crear configuración de calendario
  console.log('📆 Creando configuración de calendario...');
  const calExiste = await prisma.configuracionCalendario.findUnique({
    where: { farmaciaId: farmacia.id }
  });
  
  if (!calExiste) {
    await prisma.configuracionCalendario.create({
      data: {
        farmaciaId: farmacia.id,
      },
    });
    console.log('✅ Configuración de calendario creada por defecto\n');
  } else {
    console.log('ℹ️ La farmacia ya tiene configuración de calendario\n');
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
