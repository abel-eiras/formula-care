import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { BackupError, crearBackup, importarBackup } from '../src/services/backupService.js';
import { crearPaciente, vaciarBaseDeDatos } from './utilidades.js';

const carpetaCopias = path.join(path.dirname(process.env.DATABASE_URL!.replace(/^file:/, '')), 'backups');

describe('copias de seguridad', () => {
  beforeEach(vaciarBaseDeDatos);
  afterAll(() => fs.rmSync(carpetaCopias, { recursive: true, force: true }));

  it('restaurar devuelve los datos y la configuración al momento de la copia', async () => {
    await prisma.configuracion.create({ data: { id: 'singleton', farmaciaNombre: 'Farmacia Original' } });
    await crearPaciente({ name: 'Antes de la copia' });
    const copia = await crearBackup();

    await crearPaciente({ name: 'Después de la copia' });
    await prisma.configuracion.update({ where: { id: 'singleton' }, data: { farmaciaNombre: 'Cambiada' } });

    await importarBackup(path.join(carpetaCopias, copia.nombre));
    const nombres = (await prisma.paciente.findMany()).map((p) => p.name);
    expect(nombres).toEqual(['Antes de la copia']);
    expect((await prisma.configuracion.findUnique({ where: { id: 'singleton' } }))?.farmaciaNombre).toBe('Farmacia Original');
  });

  it('rechaza un fichero que no es una copia', async () => {
    const falso = path.join(carpetaCopias, 'falso.fcbackup');
    fs.mkdirSync(carpetaCopias, { recursive: true });
    fs.writeFileSync(falso, 'no soy una copia');
    await expect(importarBackup(falso)).rejects.toBeInstanceOf(BackupError);
  });
});
