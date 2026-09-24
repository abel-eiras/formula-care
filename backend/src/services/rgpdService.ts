import { prisma } from '../lib/prisma.js';
import { obtenerUltimasVisitas } from './ultimaVisitaService.js';

/**
 * Protección de datos: constancia del consentimiento, exportación de los
 * datos de un paciente (derecho de acceso y portabilidad) y pacientes que
 * han superado el periodo de retención configurado.
 */

/** Fecha y versión del texto de consentimiento vigente, para guardarlas en el paciente */
export async function constanciaConsentimiento(): Promise<{ consentimientoFecha: Date; consentimientoVersion: string }> {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'singleton' },
    select: { consentimientoVersion: true },
  });
  return { consentimientoFecha: new Date(), consentimientoVersion: config?.consentimientoVersion || 'v1.0' };
}

/** Todo lo que la farmacia guarda de un paciente, en un único documento */
export async function exportarDatosPaciente(id: string) {
  const [paciente, farmacia] = await Promise.all([
    prisma.paciente.findUnique({
      where: { id },
      include: {
        mediciones: { orderBy: { fecha: 'asc' } },
        analisisDermo: { orderBy: { fecha: 'asc' } },
        analisisBio: { orderBy: { fecha: 'asc' } },
        programasNutricion: {
          orderBy: { fechaInicio: 'asc' },
          include: { visitas: { orderBy: { fecha: 'asc' } }, registros: { orderBy: { fecha: 'asc' } } },
        },
        citas: { orderBy: [{ fecha: 'asc' }, { hora: 'asc' }] },
        felicitaciones: { orderBy: { anio: 'asc' } },
      },
    }),
    prisma.configuracion.findUnique({
      where: { id: 'singleton' },
      select: { farmaciaNombre: true, rgpdRazonSocial: true, rgpdCif: true, rgpdEmailContacto: true },
    }),
  ]);
  if (!paciente) return null;

  // Campo interno de búsqueda: no es un dato del paciente
  const { textoBusqueda: _texto, ...datos } = paciente;
  return {
    exportadoEn: new Date().toISOString(),
    responsable: {
      nombre: farmacia?.rgpdRazonSocial || farmacia?.farmaciaNombre || null,
      cif: farmacia?.rgpdCif || null,
      contacto: farmacia?.rgpdEmailContacto || null,
    },
    paciente: datos,
  };
}

export interface PacienteRetencion {
  id: string;
  name: string;
  ultimaActividad: string; // YYYY-MM-DD
}

/**
 * Pacientes sin actividad (servicios, citas ni altas) desde hace más del
 * periodo de retención. No se borran solos: la farmacia decide.
 */
export async function pacientesFueraDeRetencion(): Promise<{ meses: number; limite: string; pacientes: PacienteRetencion[] }> {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'singleton' },
    select: { retencionDatosMeses: true },
  });
  const meses = config?.retencionDatosMeses ?? 60;
  const limiteFecha = new Date();
  limiteFecha.setMonth(limiteFecha.getMonth() - meses);
  const limite = limiteFecha.toISOString().slice(0, 10);

  // Candidatos: dados de alta antes del límite (los recientes no pueden estar vencidos)
  const candidatos = await prisma.paciente.findMany({
    where: { createdAt: { lt: limiteFecha } },
    select: { id: true, name: true, createdAt: true },
  });
  if (candidatos.length === 0) return { meses, limite, pacientes: [] };

  const ids = candidatos.map((p) => p.id);
  const [visitas, citas] = await Promise.all([
    obtenerUltimasVisitas(ids),
    prisma.cita.groupBy({ by: ['pacienteId'], where: { pacienteId: { in: ids } }, _max: { fecha: true } }),
  ]);
  const ultimaCita = new Map(citas.map((c) => [c.pacienteId, c._max.fecha?.slice(0, 10) ?? '']));

  const pacientes = candidatos
    .map((p) => {
      const fechas = [p.createdAt.toISOString().slice(0, 10), visitas.get(p.id)?.fecha ?? '', ultimaCita.get(p.id) ?? ''];
      return { id: p.id, name: p.name, ultimaActividad: fechas.sort().at(-1)! };
    })
    .filter((p) => p.ultimaActividad < limite)
    .sort((a, b) => a.ultimaActividad.localeCompare(b.ultimaActividad));
  return { meses, limite, pacientes };
}
