import { beforeEach, describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import { prisma } from '../src/lib/prisma.js';
import {
  actualizarConfigCorreo,
  obtenerConfigCorreo,
  obtenerConfiguracion,
} from '../src/controllers/configuracion.js';
import { vaciarBaseDeDatos } from './utilidades.js';

/** Llama a un controlador con un cuerpo dado y devuelve lo que respondió */
async function llamar(
  controlador: (req: Request, res: Response) => Promise<unknown>,
  body: unknown = {}
): Promise<{ estado: number; cuerpo: Record<string, unknown> }> {
  let estado = 200;
  let cuerpo: Record<string, unknown> = {};
  const res = {
    status(codigo: number) { estado = codigo; return this; },
    json(datos: Record<string, unknown>) { cuerpo = datos; return this; },
  } as unknown as Response;
  await controlador({ body } as Request, res);
  return { estado, cuerpo };
}

describe('configuración de correo', () => {
  beforeEach(vaciarBaseDeDatos);

  it('guarda las credenciales pero nunca las devuelve', async () => {
    const guardado = await llamar(actualizarConfigCorreo, {
      emailProvider: 'smtp',
      smtpHost: 'smtp.ejemplo.es',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'farmacia@ejemplo.es',
      smtpPass: 'secreta',
    });
    expect(guardado.estado).toBe(200);
    expect(guardado.cuerpo.smtpPassGuardada).toBe(true);
    expect(JSON.stringify(guardado.cuerpo)).not.toContain('secreta');

    const leido = await llamar(obtenerConfigCorreo);
    expect(JSON.stringify(leido.cuerpo)).not.toContain('secreta');

    const general = await llamar(obtenerConfiguracion);
    expect(JSON.stringify(general.cuerpo)).not.toContain('secreta');
    expect(general.cuerpo).not.toHaveProperty('smtpPass');
    expect(general.cuerpo).not.toHaveProperty('backupCifradoClave');
  });

  it('una contraseña vacía conserva la guardada', async () => {
    await llamar(actualizarConfigCorreo, { emailProvider: 'smtp', smtpUser: 'a@b.es', smtpPass: 'secreta' });
    await llamar(actualizarConfigCorreo, { emailProvider: 'smtp', smtpUser: 'a@b.es', smtpPass: '', smtpHost: 'smtp.b.es' });
    const fila = await prisma.configuracion.findUnique({ where: { id: 'singleton' } });
    expect(fila?.smtpPass).toBe('secreta');
    expect(fila?.smtpHost).toBe('smtp.b.es');
  });

  it('rechaza un remitente que no es un email', async () => {
    const { estado } = await llamar(actualizarConfigCorreo, { emailProvider: 'smtp', emailRemitente: 'no-es-email' });
    expect(estado).toBe(400);
  });
});
