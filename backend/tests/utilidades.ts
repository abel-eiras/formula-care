import { prisma } from '../src/lib/prisma.js';

/** Deja vacías las tablas que usan los tests (en orden por las claves foráneas) */
export async function vaciarBaseDeDatos(): Promise<void> {
  await prisma.$transaction([
    prisma.notificacion.deleteMany(),
    prisma.cita.deleteMany(),
    prisma.solicitudOnline.deleteMany(),
    prisma.analisisDermo.deleteMany(),
    prisma.analisisBio.deleteMany(),
    prisma.medicion.deleteMany(),
    prisma.programaNutricion.deleteMany(),
    prisma.paciente.deleteMany(),
    prisma.evento.deleteMany(),
    prisma.configuracionCalendario.deleteMany(),
    prisma.configuracion.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);
}

let contador = 0;
export async function crearPaciente(datos: Partial<{ name: string; email: string; phone: string; createdAt: Date }> = {}) {
  contador++;
  const name = datos.name ?? `Paciente ${contador}`;
  const phone = datos.phone ?? `6000000${String(contador).padStart(2, '0')}`;
  return prisma.paciente.create({
    data: {
      name,
      phone,
      email: datos.email ?? null,
      sex: 'F',
      birthDate: '1980-01-01',
      textoBusqueda: `${name} ${phone} ${datos.email ?? ''}`.toLowerCase(),
      ...(datos.createdAt ? { createdAt: datos.createdAt } : {}),
    },
  });
}
