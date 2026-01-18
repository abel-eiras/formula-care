import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Script para poblar la base de datos con datos de prueba
 */
async function main() {
  console.log('🌱 Sembrando base de datos...');

  // ==========================================
  // CREAR USUARIO ADMIN POR DEFECTO
  // ==========================================
  const existeAdmin = await prisma.usuario.findFirst({
    where: { rol: 'admin' }
  });

  if (!existeAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    await prisma.usuario.create({
      data: {
        email: 'admin@farmaciapontevea.com',
        password: passwordHash,
        nombre: 'Administrador',
        rol: 'admin',
      },
    });
    console.log('✅ Usuario admin creado: admin@farmaciapontevea.com / admin123');
  } else {
    console.log('ℹ️ Ya existe un usuario admin');
  }

  // Crear pacientes de ejemplo
  const paciente1 = await prisma.paciente.create({
    data: {
      name: 'María García López',
      age: 45,
      sex: 'F',
      phone: '612345678',
      email: 'maria.garcia@email.com',
      birthDate: '1979-03-15',
      address: 'Calle Mayor 15, Pontevea',
      notes: 'Piel sensible, evitar productos con alcohol',
    },
  });

  const paciente2 = await prisma.paciente.create({
    data: {
      name: 'Carlos Rodríguez',
      age: 62,
      sex: 'M',
      phone: '698765432',
      email: 'carlos.rodriguez@email.com',
      birthDate: '1962-07-20',
    },
  });

  const paciente3 = await prisma.paciente.create({
    data: {
      name: 'Ana Fernández',
      age: 33,
      sex: 'F',
      phone: '654321987',
      birthDate: '1991-11-10',
    },
  });

  // Crear análisis dermocosmético
  await prisma.analisisDermo.create({
    data: {
      pacienteId: paciente1.id,
      fecha: '2024-01-15',
      skinType: 'mixta',
      phototype: 'III - Intermedia',
      concerns: JSON.stringify(['manchas', 'deshidratacion']),
      hydration: 65,
      sebum: 45,
      elasticity: 70,
      spots: 3,
      ph: 5.5,
      treatment: 'Crema con vitamina C y ácido hialurónico',
      cleaning: 'Limpieza suave mañana y noche',
      sunProtection: 'SPF 50+ diario',
    },
  });

  // Crear análisis bioquímico
  await prisma.analisisBio.create({
    data: {
      pacienteId: paciente2.id,
      fecha: '2024-01-14',
      glucemia: 95, // Antes era 'glucose'
      cholesterol: 180,
      triglycerides: 120,
      systolic: 125,
      diastolic: 80,
      weight: 75,
      height: 170,
      imc: 25.95,
    },
  });

  // Crear citas
  await prisma.cita.create({
    data: {
      titulo: 'Análisis Dermocosmético',
      pacienteId: paciente1.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: '10:00',
      tipo: 'dermo',
      notas: 'Primera consulta',
    },
  });

  await prisma.cita.create({
    data: {
      titulo: 'Control Bioquímico',
      pacienteId: paciente2.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: '11:30',
      tipo: 'bio',
    },
  });

  console.log('✅ Base de datos sembrada correctamente');
}

main()
  .catch((e) => {
    console.error('❌ Error al sembrar base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
