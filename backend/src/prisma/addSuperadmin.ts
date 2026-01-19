/**
 * Script para crear un nuevo superadmin
 * Uso: npx tsx src/prisma/addSuperadmin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'abel@formulafarma.com';
  const password = 'Formula2026!';
  const nombre = 'Abel - Superadmin';

  console.log('🔐 Creando superadmin...\n');

  // Verificar si ya existe
  const existe = await prisma.usuario.findUnique({
    where: { email }
  });

  if (existe) {
    // Actualizar contraseña si ya existe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    await prisma.usuario.update({
      where: { email },
      data: { 
        password: passwordHash,
        rol: 'superadmin',
        activo: true
      }
    });
    console.log(`✅ Usuario actualizado: ${email}`);
  } else {
    // Crear nuevo
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.usuario.create({
      data: {
        email,
        password: passwordHash,
        nombre,
        rol: 'superadmin',
        farmaciaId: null,
        activo: true
      },
    });
    console.log(`✅ Superadmin creado: ${email}`);
  }

  console.log(`\n📋 Credenciales:`);
  console.log(`   Email: ${email}`);
  console.log(`   Contraseña: ${password}`);
  console.log('\n⚠️ Recuerda cambiar la contraseña después del primer login\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
