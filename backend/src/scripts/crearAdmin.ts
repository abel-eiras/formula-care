/**
 * Script para crear usuario administrador
 * Uso: npx tsx src/scripts/crearAdmin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function crearAdmin() {
  console.log('🔐 Creando usuario administrador...');

  // Verificar si ya existe un admin
  const existeAdmin = await prisma.usuario.findFirst({
    where: { rol: 'admin' }
  });

  if (existeAdmin) {
    console.log('ℹ️ Ya existe un usuario admin:', existeAdmin.email);
    console.log('   Si quieres resetear la contraseña, elimina el usuario primero.');
    return;
  }

  // Crear usuario admin
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const admin = await prisma.usuario.create({
    data: {
      email: 'admin@farmaciapontevea.com',
      password: passwordHash,
      nombre: 'Administrador',
      rol: 'admin',
    },
  });

  console.log('✅ Usuario administrador creado correctamente:');
  console.log('   Email: admin@farmaciapontevea.com');
  console.log('   Contraseña: admin123');
  console.log('   ⚠️ IMPORTANTE: Cambia la contraseña después del primer login');
}

crearAdmin()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
