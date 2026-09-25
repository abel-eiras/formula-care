import fs from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';

/**
 * Registro de la app de escritorio en fichero. Sin él, cuando algo falla en la
 * farmacia no hay forma de saber qué pasó (la consola del backend no se ve).
 * Solo se activa si la app indica la carpeta (CARPETA_REGISTRO); rota a los
 * 5 MB y conserva el fichero anterior (backend.log.1).
 */
const TAMANO_MAXIMO = 5 * 1024 * 1024;

export function rutaRegistro(): string | null {
  const carpeta = process.env.CARPETA_REGISTRO;
  return carpeta ? path.join(carpeta, 'backend.log') : null;
}

function escribir(nivel: string, args: unknown[]): void {
  const ruta = rutaRegistro();
  if (!ruta) return;
  try {
    if (fs.existsSync(ruta) && fs.statSync(ruta).size > TAMANO_MAXIMO) {
      fs.renameSync(ruta, `${ruta}.1`);
    }
    fs.appendFileSync(ruta, `${new Date().toISOString()} [${nivel}] ${format(...args)}\n`);
  } catch {
    // El registro nunca debe tumbar la app
  }
}

export function iniciarRegistro(): void {
  const carpeta = process.env.CARPETA_REGISTRO;
  if (!carpeta) return;
  fs.mkdirSync(carpeta, { recursive: true });
  for (const [metodo, nivel] of [['log', 'INFO'], ['warn', 'AVISO'], ['error', 'ERROR']] as const) {
    const original = console[metodo].bind(console);
    console[metodo] = (...args: unknown[]) => {
      original(...args);
      escribir(nivel, args);
    };
  }
  process.on('uncaughtException', (error) => {
    escribir('ERROR', ['Excepción no capturada:', error]);
    process.exit(1);
  });
  process.on('unhandledRejection', (motivo) => escribir('ERROR', ['Promesa rechazada sin capturar:', motivo]));
}

/** Últimas líneas del registro (para el diagnóstico) */
export function ultimasLineasRegistro(cantidad: number): string {
  const ruta = rutaRegistro();
  if (!ruta || !fs.existsSync(ruta)) return '(sin registro en fichero)';
  const lineas = fs.readFileSync(ruta, 'utf8').split('\n');
  return lineas.slice(-cantidad - 1).join('\n');
}
