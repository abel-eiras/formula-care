/**
 * Seed de base de datos
 * Crea datos iniciales para una instalación local de una sola farmacia
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  PARAMETROS_BIO_CONFIG_DEFAULT,
  PARAMETROS_REFERENCIA_DEFAULT,
} from '../config/parametrosBioDefault.js';

const prisma = new PrismaClient();

// ID fijo de la fila única de configuración (instalación local de una sola farmacia)
const CONFIG_ID = 'singleton';

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // =============================================
  // 1. CREAR USUARIO ADMIN
  // =============================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@farmacia.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  const adminExiste = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExiste) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await prisma.usuario.create({
      data: {
        email: adminEmail,
        password: passwordHash,
        nombre: 'Administrador',
        rol: 'admin',
      },
    });
    console.log(`✅ Admin creado: ${adminEmail} / ${adminPassword}`);
    console.log('⚠️  IMPORTANTE: cambia esta contraseña por defecto en cuanto inicies sesión.');
  } else {
    console.log(`ℹ️ Admin ya existe: ${adminEmail}`);
  }

  // =============================================
  // 2. CREAR CONFIGURACIÓN DE LA FARMACIA (fila única)
  // =============================================
  const configExiste = await prisma.configuracion.findUnique({
    where: { id: CONFIG_ID },
  });

  if (!configExiste) {
    await prisma.configuracion.create({
      data: {
        id: CONFIG_ID,
        farmaciaNombre: 'Mi Farmacia',
        farmaciaDireccion: 'Calle Principal 1',
        farmaciaCiudad: 'Ciudad',
        farmaciaTelefono: '',
        farmaciaEmail: '',
        farmaciaWeb: '',
        valoracionBioActiva: true,
        parametrosReferencia: JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
        parametrosBioConfig: JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
      },
    });
    console.log('✅ Configuración de la farmacia creada (con parámetros bioquímicos por defecto)');
  } else {
    console.log('ℹ️ Configuración de la farmacia ya existe');
  }

  // =============================================
  // 3. CREAR CONFIGURACIÓN DE CALENDARIO (fila única)
  // =============================================
  const calExiste = await prisma.configuracionCalendario.findUnique({
    where: { id: CONFIG_ID },
  });

  if (!calExiste) {
    await prisma.configuracionCalendario.create({
      data: {
        id: CONFIG_ID,
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
  // 4. CREAR PACIENTES DE EJEMPLO
  // =============================================
  const pacientesCount = await prisma.paciente.count();

  if (pacientesCount === 0) {
    const paciente1 = await prisma.paciente.create({
      data: {
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
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
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
