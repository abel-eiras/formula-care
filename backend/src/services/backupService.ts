/**
 * Copias de seguridad: genera, lista, borra e importa copias que incluyen
 * la base de datos completa (datos + configuración). Los datos de pacientes
 * se guardan en claro en la base de datos local, así que la copia es
 * restaurable en cualquier equipo; para protegerla fuera del equipo, el
 * usuario puede cifrarla con contraseña.
 *
 * Formato del fichero (.fcbackup): [manifest JSON][.db] empaquetados con un
 * contenedor de longitud-prefijada y comprimidos con gzip. Si el usuario
 * activó el cifrado, ese gzip se cifra con AES-256-GCM usando una clave
 * derivada (scrypt) de su contraseña; la cabecera indica si está cifrado
 * antes de intentar descomprimir nada.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const CONFIG_ID = 'singleton';
const MAGIC_PLAIN = 'FCB1';
const MAGIC_ENCRYPTED = 'FCE1';
const ALGORITHM = 'aes-256-gcm';
const SCRYPT_KEYLEN = 32;

// Prisma resuelve las rutas sqlite relativas de DATABASE_URL respecto al
// directorio de prisma/schema.prisma, no respecto al cwd del proceso — hay
// que replicar esa misma convención aquí para apuntar al mismo fichero que
// usa el cliente Prisma ya conectado. Este módulo vive en backend/src/services
// (dev, vía tsx) o backend/dist/services (empaquetado); en ambos casos
// prisma/ está dos niveles por encima.
const PRISMA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prisma');

export class BackupError extends Error {}

/** Ruta absoluta del fichero SQLite actual, a partir de DATABASE_URL (file:...). */
function getDbPath(): string {
  const url = process.env.DATABASE_URL || '';
  const raw = url.replace(/^file:/, '');
  if (!raw) {
    throw new BackupError('DATABASE_URL no está configurada');
  }
  return path.isAbsolute(raw) ? raw : path.resolve(PRISMA_DIR, raw);
}

/** Directorio de datos de esta instalación: mismo directorio que la BD (y, en producción, que secrets.json). */
function getDataDir(): string {
  return path.dirname(getDbPath());
}

function getBackupsDir(): string {
  const dir = path.join(getDataDir(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
}

/** Empaqueta manifest + bytes de la BD en un contenedor simple (longitud-prefijada) y lo gzipea. */
function pack(manifest: Record<string, unknown>, dbBytes: Buffer): Buffer {
  const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8');
  const manifestLen = Buffer.alloc(4);
  manifestLen.writeUInt32BE(manifestBytes.length);
  const dbLen = Buffer.alloc(4);
  dbLen.writeUInt32BE(dbBytes.length);
  const container = Buffer.concat([manifestLen, manifestBytes, dbLen, dbBytes]);
  return zlib.gzipSync(container);
}

function unpack(gzipped: Buffer): { manifest: Record<string, unknown>; dbBytes: Buffer } {
  const container = zlib.gunzipSync(gzipped);
  const manifestLen = container.readUInt32BE(0);
  const manifestBytes = container.subarray(4, 4 + manifestLen);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const dbLenOffset = 4 + manifestLen;
  const dbLen = container.readUInt32BE(dbLenOffset);
  const dbBytes = container.subarray(dbLenOffset + 4, dbLenOffset + 4 + dbLen);
  return { manifest, dbBytes };
}

/** Genera un snapshot consistente de la BD actual (VACUUM INTO evita corrupción por WAL a medio escribir). */
async function snapshotDb(destPath: string): Promise<void> {
  fs.rmSync(destPath, { force: true });
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
}

interface ConfigBackup {
  backupPeriodicidad: string;
  backupCifrado: boolean;
  backupCifradoClave: string | null;
  backupCifradoSalt: string | null;
  backupUltimaEjecucion: Date | null;
}

async function getConfig(): Promise<ConfigBackup> {
  const config = await prisma.configuracion.findUnique({ where: { id: CONFIG_ID } });
  return {
    backupPeriodicidad: config?.backupPeriodicidad || 'diaria',
    backupCifrado: config?.backupCifrado ?? false,
    backupCifradoClave: config?.backupCifradoClave ?? null,
    backupCifradoSalt: config?.backupCifradoSalt ?? null,
    backupUltimaEjecucion: config?.backupUltimaEjecucion ?? null,
  };
}

export interface BackupInfo {
  nombre: string;
  fecha: string;
  tamanoBytes: number;
}

export function listarBackups(): BackupInfo[] {
  const dir = getBackupsDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.fcbackup'))
    .map((nombre) => {
      const stat = fs.statSync(path.join(dir, nombre));
      return { nombre, fecha: stat.mtime.toISOString(), tamanoBytes: stat.size };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function borrarBackup(nombre: string): void {
  // Evita path traversal: solo nombres de fichero simples dentro de la carpeta de backups.
  if (nombre.includes('/') || nombre.includes('\\') || nombre.includes('..')) {
    throw new BackupError('Nombre de fichero inválido');
  }
  const filePath = path.join(getBackupsDir(), nombre);
  if (!fs.existsSync(filePath)) {
    throw new BackupError('La copia de seguridad no existe');
  }
  fs.rmSync(filePath);
}

/** Crea una copia de seguridad ahora mismo, según la configuración de cifrado actual. */
export async function crearBackup(): Promise<BackupInfo> {
  const config = await getConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tmpDbPath = path.join(getBackupsDir(), `.tmp-${timestamp}.db`);

  try {
    await snapshotDb(tmpDbPath);
    const dbBytes = fs.readFileSync(tmpDbPath);

    const manifest = {
      formatVersion: 1,
      createdAt: new Date().toISOString(),
    };

    const packed = pack(manifest, dbBytes);
    const nombre = `backup-${timestamp}.fcbackup`;
    const destPath = path.join(getBackupsDir(), nombre);

    if (config.backupCifrado && config.backupCifradoClave) {
      const key = Buffer.from(config.backupCifradoClave, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      const ciphertext = Buffer.concat([cipher.update(packed), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const salt = Buffer.from(config.backupCifradoSalt || '', 'hex');
      const out = Buffer.concat([
        Buffer.from(MAGIC_ENCRYPTED, 'utf8'),
        salt,
        iv,
        authTag,
        ciphertext,
      ]);
      fs.writeFileSync(destPath, out);
    } else {
      fs.writeFileSync(destPath, Buffer.concat([Buffer.from(MAGIC_PLAIN, 'utf8'), packed]));
    }

    // upsert, no update: en una instalación recién creada todavía no existe
    // ninguna fila de Configuracion (se crea de forma perezosa al abrir la
    // pantalla de Configuración) y esta comprobación se ejecuta ya en el
    // primer arranque, antes de que el usuario haya entrado ahí.
    await prisma.configuracion.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, backupUltimaEjecucion: new Date() },
      update: { backupUltimaEjecucion: new Date() },
    });

    const stat = fs.statSync(destPath);
    return { nombre, fecha: stat.mtime.toISOString(), tamanoBytes: stat.size };
  } finally {
    fs.rmSync(tmpDbPath, { force: true });
  }
}

function esperaSegunPeriodicidad(periodicidad: string): number | null {
  switch (periodicidad) {
    case 'diaria':
      return 24 * 60 * 60 * 1000;
    case 'semanal':
      return 7 * 24 * 60 * 60 * 1000;
    case 'mensual':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return null; // "desactivada"
  }
}

/** Comprueba si toca backup automático según la periodicidad configurada, y lo ejecuta si es así. */
export async function verificarYEjecutarBackupProgramado(): Promise<void> {
  try {
    const config = await getConfig();
    const intervalo = esperaSegunPeriodicidad(config.backupPeriodicidad);
    if (intervalo === null) return;

    const ultima = config.backupUltimaEjecucion;
    if (ultima && Date.now() - ultima.getTime() < intervalo) return;

    console.log(`⏳ Generando copia de seguridad automática (${config.backupPeriodicidad})...`);
    await crearBackup();
    console.log('✅ Copia de seguridad automática completada');
  } catch (error) {
    console.error('Error al ejecutar la copia de seguridad automática:', error);
  }
}

/**
 * Importa una copia de seguridad: valida y descifra si hace falta, hace una
 * copia de seguridad de la BD actual por si algo sale mal, y sustituye la
 * BD y la clave de cifrado de esta instalación por las de la copia.
 * El proceso debe reiniciarse después (Prisma no se reconecta en caliente).
 */
export async function importarBackup(filePath: string, password?: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new BackupError('El fichero de copia de seguridad no existe');
  }
  const raw = fs.readFileSync(filePath);
  const magic = raw.subarray(0, 4).toString('utf8');

  let packed: Buffer;
  if (magic === MAGIC_ENCRYPTED) {
    if (!password) {
      throw new BackupError('Esta copia de seguridad está cifrada: hace falta la contraseña');
    }
    const salt = raw.subarray(4, 20);
    const iv = raw.subarray(20, 36);
    const authTag = raw.subarray(36, 52);
    const ciphertext = raw.subarray(52);
    const key = deriveKey(password, salt);
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      packed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new BackupError('Contraseña incorrecta o copia de seguridad corrupta');
    }
  } else if (magic === MAGIC_PLAIN) {
    packed = raw.subarray(4);
  } else {
    throw new BackupError('El fichero no es una copia de seguridad de Formula Care válida');
  }

  const { dbBytes } = unpack(packed);

  // Copia de seguridad de la BD actual antes de tocar nada, por si hay que deshacer.
  const safetyPath = path.join(
    getBackupsDir(),
    `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
  );
  await snapshotDb(safetyPath);

  await prisma.$disconnect();

  const dbPath = getDbPath();
  const tmpPath = `${dbPath}.restoring`;
  fs.writeFileSync(tmpPath, dbBytes);
  fs.renameSync(tmpPath, dbPath);
  // El modo WAL puede dejar ficheros -wal/-shm del estado anterior; el snapshot restaurado no los necesita.
  fs.rmSync(`${dbPath}-wal`, { force: true });
  fs.rmSync(`${dbPath}-shm`, { force: true });
}

/**
 * Deriva y guarda la clave de cifrado de copias a partir de una contraseña nueva.
 * La sal es nueva en cada copia generada (ver crearBackup), pero se guarda una
 * clave+sal "activas" para poder cifrar automáticamente sin volver a pedir la
 * contraseña en cada copia programada.
 */
export function derivarClaveCifrado(password: string): { clave: string; salt: string } {
  const salt = crypto.randomBytes(16);
  const clave = deriveKey(password, salt);
  return { clave: clave.toString('hex'), salt: salt.toString('hex') };
}
