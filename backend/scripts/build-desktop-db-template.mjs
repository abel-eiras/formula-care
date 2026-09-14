/**
 * Genera prisma/desktop-template.db: una base de datos SQLite ya migrada
 * (sin datos) que se empaqueta como recurso de la app de escritorio.
 * En el primer arranque, Tauri copia este fichero al directorio de datos
 * del usuario si aún no existe una base de datos ahí.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const backendDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const templatePath = path.join(backendDir, 'prisma', 'desktop-template.db');

fs.rmSync(templatePath, { force: true });

execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: `file:${templatePath}` },
  // En Windows, "npx" es en realidad "npx.cmd": CreateProcess no lo
  // encuentra sin pasar por un shell (a diferencia de Linux/macOS, donde
  // execFileSync ya funciona directo). shell:true resuelve esto en las
  // tres plataformas.
  shell: true,
});

console.log(`✅ Plantilla de base de datos generada en ${templatePath}`);
