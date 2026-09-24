import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { calcularHuecos, huecoSigueLibre } from '../src/services/reservaOnline/disponibilidad.js';
import { crearPaciente, vaciarBaseDeDatos } from './utilidades.js';

// Domingo por la tarde: el lunes 5 de octubre de 2026 es el primer día con horario
const AHORA = new Date('2026-10-04T18:00:00');
const LUNES = '2026-10-05';

async function configurar(extra: Partial<{ fechasBloqueadas: string[] }> = {}) {
  await prisma.configuracionCalendario.create({
    data: {
      id: 'singleton',
      horariosPorTipo: JSON.stringify({ dermo: { lunes: ['09:00-11:00'] } }),
      duracionPorTipo: JSON.stringify({ dermo: 45 }),
      fechasBloqueadas: JSON.stringify(extra.fechasBloqueadas ?? []),
    },
  });
}

const opciones = { diasVista: 7, antelacionMinimaHoras: 0, ahora: AHORA };

describe('huecos que se publican en la reserva online', () => {
  beforeEach(vaciarBaseDeDatos);

  it('solo ofrece sesiones enteras dentro del horario del servicio', async () => {
    await configurar();
    const { servicios, huecos } = await calcularHuecos(opciones);
    expect(servicios.map((s) => s.id)).toEqual(['dermo']);
    // 10:30 + 45 min se pasaría de las 11:00
    expect(huecos.dermo[LUNES]).toEqual({ '09:00': 1, '09:45': 1 });
  });

  it('una cita de cualquier servicio ocupa los huecos con los que se solapa', async () => {
    await configurar();
    const paciente = await crearPaciente();
    await prisma.cita.create({ data: { titulo: 'Bio', pacienteId: paciente.id, fecha: LUNES, hora: '09:30', tipo: 'bio' } });
    const { huecos } = await calcularHuecos(opciones);
    // Bio dura 30 min por defecto (09:30-10:00): pisa 09:00-09:45 y 09:45-10:30
    expect(huecos.dermo[LUNES]).toBeUndefined();
  });

  it('las citas canceladas no ocupan hueco', async () => {
    await configurar();
    const paciente = await crearPaciente();
    await prisma.cita.create({
      data: { titulo: 'X', pacienteId: paciente.id, fecha: LUNES, hora: '09:00', tipo: 'dermo', estado: 'cancelada' },
    });
    const { huecos } = await calcularHuecos(opciones);
    expect(Object.keys(huecos.dermo[LUNES])).toContain('09:00');
  });

  it('respeta los días cerrados y la antelación mínima', async () => {
    await configurar({ fechasBloqueadas: [LUNES] });
    expect((await calcularHuecos(opciones)).huecos.dermo[LUNES]).toBeUndefined();

    await vaciarBaseDeDatos();
    await configurar();
    // Con 15 h de antelación desde el domingo a las 18:30 (lunes 09:30), las 09:00 quedan fuera
    const { huecos } = await calcularHuecos({ ...opciones, ahora: new Date('2026-10-04T18:30:00'), antelacionMinimaHoras: 15 });
    expect(huecos.dermo[LUNES]).toEqual({ '09:45': 1 });
  });

  it('los eventos ofrecen las plazas que quedan', async () => {
    await configurar();
    const evento = await prisma.evento.create({
      data: { nombre: 'Taller', fechas: JSON.stringify([LUNES]), horas: JSON.stringify(['17:00-18:00']), duracion: 60, maxAsistentes: 2 },
    });
    const paciente = await crearPaciente();
    const tipo = `evento:${evento.id}`;
    await prisma.cita.create({ data: { titulo: 'Taller', pacienteId: paciente.id, fecha: LUNES, hora: '17:00', tipo } });
    expect((await calcularHuecos(opciones)).huecos[tipo][LUNES]).toEqual({ '17:00': 1 });
    expect(await huecoSigueLibre(tipo, LUNES, '17:00')).toBe(true);

    await prisma.cita.create({ data: { titulo: 'Taller', pacienteId: paciente.id, fecha: LUNES, hora: '17:00', tipo } });
    expect(await huecoSigueLibre(tipo, LUNES, '17:00')).toBe(false);
  });
});
