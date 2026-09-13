/**
 * Script para actualizar los parámetros bioquímicos de la instalación
 * Usa los mismos valores por defecto que el resto del sistema (parametrosBioDefault).
 */
import { PrismaClient } from '@prisma/client';
import {
  PARAMETROS_BIO_CONFIG_DEFAULT,
  PARAMETROS_REFERENCIA_DEFAULT,
} from '../config/parametrosBioDefault.js';

const prisma = new PrismaClient();

// ID fijo de la fila única de configuración (instalación local de una sola farmacia)
const CONFIG_ID = 'singleton';

async function actualizarParametros() {
  console.log('🔧 Actualizando parámetros bioquímicos...\n');

  const config = await prisma.configuracion.findUnique({ where: { id: CONFIG_ID } });
  if (!config) {
    console.log('❌ No se encontró la configuración de la instalación. Ejecuta el seed primero.');
    return;
  }

  await prisma.configuracion.update({
    where: { id: CONFIG_ID },
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
