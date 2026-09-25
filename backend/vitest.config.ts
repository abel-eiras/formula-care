import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

// Base de datos SQLite temporal: tests/preparar-bd.ts la crea desde cero con
// las migraciones (así también se comprueba que todas aplican en orden)
const bd = path.join(os.tmpdir(), `formula-care-test-${process.pid}.db`);
process.env.DATABASE_URL = `file:${bd}`;

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/preparar-bd.ts'],
    env: { DATABASE_URL: `file:${bd}`, NODE_ENV: 'test', TZ: 'Europe/Madrid' },
    // Todos los ficheros comparten la base de datos: uno detrás de otro
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
});
