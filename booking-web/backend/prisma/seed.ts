/**
 * Seed inicial de booking-web: crea las filas singleton de Configuracion y
 * ConfiguracionCalendario si no existen todavía, y las plantillas de email
 * por defecto (usando el mismo HTML que src/services/emailService.ts genera
 * cuando no hay plantilla en BD, para que el panel de staff tenga algo editable).
 */

import { PrismaClient } from '@prisma/client';
import {
  generarPlantillaConfirmacionDefault,
  generarPlantillaCancelacionDefault,
  generarPlantillaModificacionDefault,
  generarPlantillaRechazoDefault,
} from '../src/services/emailService.js';

const prisma = new PrismaClient();

const DATOS_EJEMPLO = {
  nombrePaciente: '{{nombrePaciente}}',
  fechaCita: '{{fechaCita}}',
  horaCita: '{{horaCita}}',
  tipoServicio: '{{tipoServicio}}',
  nombreFarmacia: '{{nombreFarmacia}}',
  direccionFarmacia: '{{direccionFarmacia}}',
  telefonoFarmacia: '{{telefonoFarmacia}}',
  emailFarmacia: '{{emailFarmacia}}',
  webFarmacia: '{{webFarmacia}}',
  urlConfirmar: '{{urlConfirmar}}',
  urlModificar: '{{urlModificar}}',
  urlCancelar: '{{urlCancelar}}',
  urlSolicitarCita: '{{urlSolicitarCita}}',
  colorPrimario: '#79438f',
  colorSecundario: '#6495a8',
};

async function main() {
  console.log('🌱 Sembrando datos iniciales de booking-web...');

  await prisma.configuracion.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      farmaciaNombre: 'Mi Farmacia',
      emailProvider: 'smtp',
    },
    update: {},
  });

  await prisma.configuracionCalendario.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      horariosPorTipo: JSON.stringify({
        dermo: { lunes: ['09:00-14:00', '16:00-19:00'], martes: ['09:00-14:00', '16:00-19:00'] },
      }),
      fechasBloqueadas: '[]',
      horasBloqueadas: '{}',
      autoAceptar: false,
      duracionPorTipo: JSON.stringify({ dermo: 45, bio: 20, consulta: 30, seguimiento: 20 }),
    },
    update: {},
  });

  const plantillas: Array<{ tipo: string; nombre: string; asunto: string; html: string }> = [
    { tipo: 'confirmacion', nombre: 'Confirmación de cita', asunto: 'Confirmación de cita - {{tipoServicio}}', html: generarPlantillaConfirmacionDefault(DATOS_EJEMPLO) },
    { tipo: 'cancelacion', nombre: 'Cancelación de cita', asunto: 'Cita cancelada - {{tipoServicio}}', html: generarPlantillaCancelacionDefault(DATOS_EJEMPLO) },
    { tipo: 'modificacion', nombre: 'Modificación de cita', asunto: 'Tu cita ha sido modificada - {{tipoServicio}}', html: generarPlantillaModificacionDefault(DATOS_EJEMPLO) },
    { tipo: 'rechazo', nombre: 'Rechazo de solicitud', asunto: 'Tu solicitud de cita - {{tipoServicio}}', html: generarPlantillaRechazoDefault(DATOS_EJEMPLO) },
  ];

  for (const p of plantillas) {
    await prisma.plantillaEmail.upsert({
      where: { tipo: p.tipo },
      create: { tipo: p.tipo, nombre: p.nombre, asunto: p.asunto, contenidoHtml: p.html, activa: true },
      update: {},
    });
  }

  console.log('✅ Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
