import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { quedariaSinAdministrador } from '../src/controllers/auth.js';
import { vaciarBaseDeDatos } from './utilidades.js';

async function usuario(email: string, rol: string, activo = true) {
  return prisma.usuario.create({ data: { email, nombre: email, password: 'x', rol, activo } });
}

describe('siempre queda un administrador activo', () => {
  beforeEach(vaciarBaseDeDatos);

  it('no se puede degradar, desactivar ni borrar al único administrador', async () => {
    const admin = await usuario('admin@f.es', 'admin');
    await usuario('farma@f.es', 'farmaceutico');
    expect(await quedariaSinAdministrador(admin.id, false)).toBe(true);
    expect(await quedariaSinAdministrador(admin.id, true)).toBe(false);
  });

  it('con otro administrador activo sí se puede', async () => {
    const admin = await usuario('admin@f.es', 'admin');
    await usuario('admin2@f.es', 'admin');
    expect(await quedariaSinAdministrador(admin.id, false)).toBe(false);
  });

  it('un administrador desactivado no cuenta', async () => {
    const admin = await usuario('admin@f.es', 'admin');
    await usuario('admin2@f.es', 'admin', false);
    expect(await quedariaSinAdministrador(admin.id, false)).toBe(true);
  });
});
