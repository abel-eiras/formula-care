import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

/**
 * Pruebas de extremo a extremo: la app compilada (vite preview) contra el
 * backend real, con una base de datos nueva en cada ejecución. Recorren la
 * app como lo haría un farmacéutico (primer arranque, pacientes,
 * importación, análisis, ayuda, seguridad).
 */
const PUERTO_API = 4578;
const PUERTO_APP = 4174;
const BD = path.join(os.tmpdir(), `formula-care-e2e-${Date.now()}.db`);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PUERTO_APP}`,
    viewport: { width: 1400, height: 1000 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    // En local puede usarse un Chromium ya instalado (E2E_CHROMIUM=/ruta/al/binario)
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  webServer: [
    {
      command: 'npx prisma migrate deploy && npx tsx src/server.ts',
      cwd: 'backend',
      url: `http://localhost:${PUERTO_API}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: `file:${BD}`,
        JWT_SECRET: 'clave-solo-para-las-pruebas-e2e-0123456789abcdef',
        NODE_ENV: 'production',
        PORT: String(PUERTO_API),
        CORS_ORIGIN: `http://127.0.0.1:${PUERTO_APP}`,
      },
    },
    {
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PUERTO_APP} --strictPort`,
      url: `http://127.0.0.1:${PUERTO_APP}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_API_URL: `http://localhost:${PUERTO_API}/api` },
    },
  ],
});
