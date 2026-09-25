import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { constanciaConsentimiento, exportarDatosPaciente, pacientesFueraDeRetencion } from '../src/services/rgpdService.js';
import { crearPaciente, vaciarBaseDeDatos } from './utilidades.js';

const haceAnios = (n: number) => new Date(Date.now() - n * 365 * 86_400_000);

describe('protección de datos', () => {
  beforeEach(vaciarBaseDeDatos);

  it('la constancia del consentimiento usa la versión vigente del texto', async () => {
    await prisma.configuracion.create({ data: { id: 'singleton', consentimientoVersion: 'v2.1' } });
    const constancia = await constanciaConsentimiento();
    expect(constancia.consentimientoVersion).toBe('v2.1');
    expect(Date.now() - constancia.consentimientoFecha.getTime()).toBeLessThan(5000);
  });

  it('la exportación incluye los datos del paciente pero no campos internos', async () => {
    const paciente = await crearPaciente({ name: 'Ana Export' });
    await prisma.cita.create({ data: { titulo: 'C', pacienteId: paciente.id, fecha: '2026-01-10', hora: '10:00', tipo: 'consulta' } });
    const exportado = await exportarDatosPaciente(paciente.id);
    expect(exportado?.paciente.name).toBe('Ana Export');
    expect(exportado?.paciente.citas).toHaveLength(1);
    expect(exportado?.paciente).not.toHaveProperty('textoBusqueda');
    expect(await exportarDatosPaciente('no-existe')).toBeNull();
  });

  it('solo marca como vencidos a los pacientes sin actividad reciente', async () => {
    await prisma.configuracion.create({ data: { id: 'singleton', retencionDatosMeses: 60 } });
    const olvidado = await crearPaciente({ name: 'Sin actividad', createdAt: haceAnios(7) });
    const conCita = await crearPaciente({ name: 'Con cita reciente', createdAt: haceAnios(7) });
    await crearPaciente({ name: 'Alta reciente' });
    await prisma.cita.create({
      data: { titulo: 'C', pacienteId: conCita.id, fecha: new Date().toISOString().slice(0, 10), hora: '10:00', tipo: 'consulta' },
    });
    const { pacientes } = await pacientesFueraDeRetencion();
    expect(pacientes.map((p) => p.id)).toEqual([olvidado.id]);
  });
});
