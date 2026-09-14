/**
 * Servicio de encriptación para datos sensibles de pacientes/clientes.
 * Usa AES-256-GCM para encriptación y SHA-256 para hashing.
 *
 * Reutilizado (sin cambios funcionales) del backend original: es tenant-agnostic.
 *
 * Los campos encriptados son:
 * - SolicitudCita: nombreCliente, emailCliente, telefonoCliente
 * - Cita: nombreCliente, emailCliente, telefonoCliente
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCODING = 'hex';

/**
 * Obtiene la clave de encriptación desde las variables de entorno.
 * La clave debe ser de 32 bytes (64 caracteres hexadecimales).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada. ' +
        'Genera una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (32 bytes). Actual: ${key.length} caracteres`
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encripta un texto usando AES-256-GCM.
 * Resultado: iv:authTag:cipherText (todo en hex)
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const authTag = cipher.getAuthTag();

  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
}

/**
 * Desencripta un texto encriptado con AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  if (!encryptedText.includes(':')) {
    return encryptedText;
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText;
  }

  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = parts;

  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Genera un hash SHA-256 de un email (normalizado a minúsculas).
 * Útil para búsquedas exactas sin exponer el email real.
 */
export function hashEmail(email: string): string {
  if (!email) return '';
  const normalizedEmail = email.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
}

interface ContactoData {
  nombreCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
}

/**
 * Encripta los campos sensibles de una solicitud/cita.
 */
export function encryptContactoData<T extends ContactoData>(
  data: T
): T & { emailClienteHash?: string } {
  const result = { ...data } as T & { emailClienteHash?: string };

  if (data.nombreCliente) {
    result.nombreCliente = encrypt(data.nombreCliente);
  }

  if (data.emailCliente) {
    result.emailClienteHash = hashEmail(data.emailCliente);
    result.emailCliente = encrypt(data.emailCliente);
  }

  if (data.telefonoCliente) {
    result.telefonoCliente = encrypt(data.telefonoCliente);
  }

  return result;
}

/**
 * Desencripta los campos sensibles de una solicitud/cita.
 */
export function decryptContactoData<T extends ContactoData>(data: T): T {
  const result = { ...data };

  if (data.nombreCliente) {
    result.nombreCliente = decrypt(data.nombreCliente);
  }

  if (data.emailCliente) {
    result.emailCliente = decrypt(data.emailCliente);
  }

  if (data.telefonoCliente) {
    result.telefonoCliente = decrypt(data.telefonoCliente);
  }

  return result;
}
