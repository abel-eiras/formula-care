/**
 * Script para actualizar parámetros bioquímicos de Farmacia Pontevea
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function actualizarParametros() {
  console.log('🔧 Actualizando parámetros bioquímicos...\n');

  // Configuración de parámetros bioquímicos completa
  // Grupos válidos: 'basicos', 'avanzados', 'corporales'
  const parametrosBioConfig = [
    // BÁSICOS - Glucemia, tensión arterial y pulso
    { id: 'glucemia', label: 'Glucemia', unit: 'mg/dL', grupo: 'basicos', activo: true, orden: 1 },
    { id: 'systolic', label: 'Tensión Sistólica', unit: 'mmHg', grupo: 'basicos', activo: true, orden: 2 },
    { id: 'diastolic', label: 'Tensión Diastólica', unit: 'mmHg', grupo: 'basicos', activo: true, orden: 3 },
    { id: 'pulsaciones', label: 'Pulsaciones', unit: 'lpm', grupo: 'basicos', activo: true, orden: 4 },
    // AVANZADOS - Colesterol, triglicéridos y otros parámetros de sangre
    { id: 'cholesterol', label: 'Colesterol Total', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 1 },
    { id: 'cholesterolHDL', label: 'Colesterol HDL', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 2 },
    { id: 'cholesterolLDL', label: 'Colesterol LDL', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 3 },
    { id: 'triglycerides', label: 'Triglicéridos', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 4 },
    { id: 'hemoglobinaGlucosilada', label: 'Hemoglobina Glucosilada (HbA1c)', unit: '%', grupo: 'avanzados', activo: true, orden: 5 },
    { id: 'proteinaCReactiva', label: 'Proteína C Reactiva (PCR)', unit: 'mg/L', grupo: 'avanzados', activo: true, orden: 6 },
    { id: 'vitaminaD', label: 'Vitamina D', unit: 'ng/mL', grupo: 'avanzados', activo: true, orden: 7 },
    { id: 'ferritina', label: 'Ferritina', unit: 'ng/mL', grupo: 'avanzados', activo: true, orden: 8 },
    // MEDIDAS CORPORALES
    { id: 'weight', label: 'Peso', unit: 'kg', grupo: 'corporales', activo: true, orden: 1 },
    { id: 'height', label: 'Altura', unit: 'cm', grupo: 'corporales', activo: true, orden: 2 },
    { id: 'perimetroAbdominal', label: 'Perímetro Abdominal', unit: 'cm', grupo: 'corporales', activo: true, orden: 3 },
    { id: 'imc', label: 'IMC', unit: 'kg/m²', grupo: 'corporales', activo: true, orden: 4 },
  ];

  // Parámetros de referencia
  const parametrosReferencia = {
    glucemia: { normalMin: 70, normalMax: 100, advertenciaMin: 60, advertenciaMax: 125, criticoMin: 50, criticoMax: 180 },
    systolic: { normalMin: 90, normalMax: 120, advertenciaMax: 140, criticoMax: 180 },
    diastolic: { normalMin: 60, normalMax: 80, advertenciaMax: 90, criticoMax: 120 },
    pulsaciones: { normalMin: 60, normalMax: 100, advertenciaMin: 50, advertenciaMax: 110, criticoMin: 40, criticoMax: 130 },
    cholesterol: { normalMin: 0, normalMax: 200, advertenciaMax: 240, criticoMax: 280 },
    cholesterolHDL: { normalMin: 40, normalMax: 60 },
    cholesterolLDL: { normalMin: 0, normalMax: 100, advertenciaMax: 130, criticoMax: 160 },
    triglycerides: { normalMin: 0, normalMax: 150, advertenciaMax: 200, criticoMax: 500 },
    hemoglobinaGlucosilada: { normalMin: 4, normalMax: 5.7, advertenciaMax: 6.5, criticoMax: 8 },
    proteinaCReactiva: { normalMin: 0, normalMax: 1, advertenciaMax: 3, criticoMax: 10 },
    vitaminaD: { normalMin: 30, normalMax: 100, advertenciaMin: 20, criticoMin: 10 },
    ferritina: { normalMin: 30, normalMax: 300 },
    imc: { normalMin: 18.5, normalMax: 24.9, advertenciaMax: 30, criticoMax: 40 },
    perimetroAbdominal: { normalMax: 102 },
  };

  const farmacia = await prisma.farmacia.findFirst({ where: { slug: 'farmacia-pontevea' } });
  if (!farmacia) {
    console.log('❌ No se encontró Farmacia Pontevea');
    return;
  }

  console.log(`📍 Farmacia encontrada: ${farmacia.nombre} (ID: ${farmacia.id})`);

  await prisma.configuracion.update({
    where: { farmaciaId: farmacia.id },
    data: {
      parametrosBioConfig: JSON.stringify(parametrosBioConfig),
      parametrosReferencia: JSON.stringify(parametrosReferencia),
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
