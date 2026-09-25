import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Crea la base de datos de pruebas aplicando todas las migraciones desde cero */
export default function prepararBaseDeDatos() {
  const url = process.env.DATABASE_URL!;
  const fichero = url.replace(/^file:/, '');
  fs.rmSync(fichero, { force: true });
  execFileSync(
    process.execPath,
    [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' }
  );
  return () => fs.rmSync(fichero, { force: true });
}
