/**
 * Seed de base de datos
 * Crea datos iniciales para desarrollo
 * 
 * Arquitectura Multi-Tenant: Crea superadmin + farmacia de ejemplo
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  PARAMETROS_BIO_CONFIG_DEFAULT,
  PARAMETROS_REFERENCIA_DEFAULT,
} from '../config/parametrosBioDefault.js';

const prisma = new PrismaClient();

// Función para generar slug a partir del nombre
function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // =============================================
  // 1. CREAR SUPERADMIN (REDACTED_EMAIL)
  // =============================================
  const superadminEmail = 'REDACTED_EMAIL';
  const superadminPassword = 'FormulaFarma2026!';

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
        nombre: 'Abel - Fórmula Farma',
        rol: 'superadmin',
        farmaciaId: null,
      },
    });
    console.log(`✅ Superadmin creado: ${superadminEmail} / ${superadminPassword}`);
  } else {
    console.log(`ℹ️ Superadmin ya existe: ${superadminEmail}`);
  }

  // =============================================
  // 2. CREAR FARMACIA PONTEVEA
  // =============================================
  const nombreFarmacia = 'Farmacia Pontevea';
  const slugFarmacia = generarSlug(nombreFarmacia);

  let farmacia = await prisma.farmacia.findUnique({
    where: { slug: slugFarmacia }
  });

  if (!farmacia) {
    farmacia = await prisma.farmacia.create({
      data: {
        nombre: nombreFarmacia,
        slug: slugFarmacia,
        direccion: 'Lugar de A Igrexa, 7',
        ciudad: 'Pontevea, A Estrada (Pontevedra)',
        telefono: '986 580 157',
        email: 'info@farmaciapontevea.com',
        web: 'www.farmaciapontevea.com',
        activa: true,
        plan: 'profesional',
        maxUsuarios: 5,
        maxPacientes: 1000,
      },
    });
    console.log(`✅ Farmacia creada: ${nombreFarmacia} (${slugFarmacia})`);
  } else {
    console.log(`ℹ️ Farmacia ya existe: ${nombreFarmacia}`);
  }

  // =============================================
  // 3. CREAR ADMIN DE LA FARMACIA
  // =============================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@farmaciapontevea.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const adminExiste = await prisma.usuario.findUnique({
    where: { email: adminEmail }
  });

  if (!adminExiste) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await prisma.usuario.create({
      data: {
        email: adminEmail,
        password: passwordHash,
        nombre: 'Farmacia Pontevea',
        rol: 'admin',
        farmaciaId: farmacia.id,
      },
    });
    console.log(`✅ Admin farmacia creado: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`ℹ️ Admin farmacia ya existe: ${adminEmail}`);
  }

  // =============================================
  // 4. CREAR CONFIGURACIÓN DE LA FARMACIA
  // =============================================
  const configExiste = await prisma.configuracion.findUnique({
    where: { farmaciaId: farmacia.id }
  });

  if (!configExiste) {
    await prisma.configuracion.create({
      data: {
        farmaciaId: farmacia.id,
        farmaciaNombre: farmacia.nombre,
        farmaciaDireccion: farmacia.direccion,
        farmaciaCiudad: farmacia.ciudad,
        farmaciaTelefono: farmacia.telefono,
        farmaciaEmail: farmacia.email,
        farmaciaWeb: farmacia.web,
        valoracionBioActiva: true,
        parametrosReferencia: JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
        parametrosBioConfig: JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
      },
    });
    console.log('✅ Configuración de farmacia creada (parámetros bio = Pontevea por defecto)');
  } else {
    console.log('ℹ️ Configuración de farmacia ya existe');
  }

  // =============================================
  // 5. CREAR CONFIGURACIÓN DE CALENDARIO
  // =============================================
  const calExiste = await prisma.configuracionCalendario.findUnique({
    where: { farmaciaId: farmacia.id }
  });

  if (!calExiste) {
    await prisma.configuracionCalendario.create({
      data: {
        farmaciaId: farmacia.id,
        horariosPorTipo: JSON.stringify({
          dermo: {
            lunes: ['09:00-14:00', '16:00-20:00'],
            martes: ['09:00-14:00', '16:00-20:00'],
            miercoles: ['09:00-14:00', '16:00-20:00'],
            jueves: ['09:00-14:00', '16:00-20:00'],
            viernes: ['09:00-14:00', '16:00-20:00'],
          },
          bio: {
            lunes: ['09:00-14:00'],
            martes: ['09:00-14:00'],
            miercoles: ['09:00-14:00'],
            jueves: ['09:00-14:00'],
            viernes: ['09:00-14:00'],
          },
        }),
        duracionPorTipo: JSON.stringify({
          dermo: 45,
          bio: 20,
          consulta: 30,
          evento: 60,
        }),
        autoAceptar: false,
      },
    });
    console.log('✅ Configuración de calendario creada');
  } else {
    console.log('ℹ️ Configuración de calendario ya existe');
  }

  // =============================================
  // 6. CREAR PACIENTES DE EJEMPLO
  // =============================================
  const pacientesCount = await prisma.paciente.count({
    where: { farmaciaId: farmacia.id }
  });

  if (pacientesCount === 0) {
    const paciente1 = await prisma.paciente.create({
      data: {
        farmaciaId: farmacia.id,
        name: 'María García López',
        age: 45,
        sex: 'F',
        phone: '600123456',
        email: 'maria.garcia@email.com',
        birthDate: '1981-03-15',
        address: 'Calle Mayor 10, Madrid',
        origen: 'manual',
      },
    });

    const paciente2 = await prisma.paciente.create({
      data: {
        farmaciaId: farmacia.id,
        name: 'Juan Martínez Ruiz',
        age: 62,
        sex: 'M',
        phone: '600654321',
        email: 'juan.martinez@email.com',
        birthDate: '1964-07-22',
        address: 'Avenida Principal 25, Madrid',
        origen: 'manual',
      },
    });

    console.log('✅ Pacientes de ejemplo creados');

    // Crear análisis de ejemplo
    await prisma.analisisBio.create({
      data: {
        pacienteId: paciente2.id,
        fecha: new Date().toISOString().split('T')[0],
        glucemia: 95,
        cholesterol: 210,
        cholesterolHDL: 55,
        cholesterolLDL: 130,
        triglycerides: 125,
        systolic: 130,
        diastolic: 85,
        weight: 78,
        height: 175,
        imc: 25.5,
        observaciones: 'Paciente con colesterol ligeramente elevado',
        recomendaciones: 'Dieta baja en grasas saturadas',
      },
    });
    console.log('✅ Análisis bioquímico de ejemplo creado');

    await prisma.analisisDermo.create({
      data: {
        pacienteId: paciente1.id,
        fecha: new Date().toISOString().split('T')[0],
        motivoConsulta: 'Hidratación y antienvejecimiento',
        valoracionPiel: JSON.stringify(['piel_seca', 'arrugas']),
        habitos: JSON.stringify(['estres']),
        rutinaDia: JSON.stringify({
          higiene: 'Leche limpiadora',
          hidratacion: 'Crema hidratante SPF30',
          proteccionSolar: 'Incluida en hidratante',
        }),
        farmaceutico: 'Dra. López',
        proximaRevision: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
    console.log('✅ Análisis dermocosmético de ejemplo creado');
  } else {
    console.log('ℹ️ Ya existen pacientes de ejemplo');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 Seed completado exitosamente');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Credenciales:');
  console.log(`   Superadmin: ${superadminEmail} / ${superadminPassword}`);
  console.log(`   Admin farmacia: ${adminEmail} / ${adminPassword}`);
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
