/**
 * Script para actualizar parámetros bioquímicos de Farmacia Pontevea
 * Usa los mismos valores por defecto que el resto del sistema (parametrosBioDefault).
 */
import { PrismaClient } from '@prisma/client';
import {
  PARAMETROS_BIO_CONFIG_DEFAULT,
  PARAMETROS_REFERENCIA_DEFAULT,
} from '../config/parametrosBioDefault.js';

const prisma = new PrismaClient();

async function actualizarParametros() {
  console.log('🔧 Actualizando parámetros bioquímicos...\n');

  const farmacia = await prisma.farmacia.findFirst({ where: { slug: 'farmacia-pontevea' } });
  if (!farmacia) {
    console.log('❌ No se encontró Farmacia Pontevea');
    return;
  }

  console.log(`📍 Farmacia encontrada: ${farmacia.nombre} (ID: ${farmacia.id})`);

  await prisma.configuracion.update({
    where: { farmaciaId: farmacia.id },
    data: {
      parametrosBioConfig: JSON.stringify(PARAMETROS_BIO_CONFIG_DEFAULT),
      parametrosReferencia: JSON.stringify(PARAMETROS_REFERENCIA_DEFAULT),
    },
  });

  console.log('\n✅ Parámetros bioquímicos actualizados correctamente');
  console.log('\n📋 Grupos de parámetros:');
  console.log('   - Básicos: Glucemia, Tensión Sistólica, Tensión Diastólica, Pulsaciones');
  console.log('   - Avanzados: Colesterol (Total, HDL, LDL), Triglicéridos, HbA1c, PCR, Vitamina D, Ferritina');
  console.log('   - Medidas Corporales: Peso, Altura, Perímetro Abdominal, IMC');
}

actualizarParametros()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
