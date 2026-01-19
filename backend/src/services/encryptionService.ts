/**
 * Servicio de encriptación para datos sensibles de pacientes
 * Usa AES-256-GCM para encriptación y SHA-256 para hashing
 * 
 * Los campos encriptados son:
 * - Paciente: name, phone, email
 * - SolicitudCita: nombreCliente, emailCliente, telefonoCliente
 */

import crypto from 'crypto';

// Configuración del algoritmo
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes para GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes para el tag de autenticación
const ENCODING = 'hex';

/**
 * Obtiene la clave de encriptación desde las variables de entorno
 * La clave debe ser de 32 bytes (64 caracteres hexadecimales)
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
 * Encripta un texto usando AES-256-GCM
 * El resultado incluye IV + AuthTag + CipherText en formato hexadecimal
 * 
 * @param text - Texto a encriptar
 * @returns Texto encriptado en formato: iv:authTag:cipherText (hex)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encryptedData (todo en hex)
  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
}

/**
 * Desencripta un texto encriptado con AES-256-GCM
 * 
 * @param encryptedText - Texto encriptado en formato: iv:authTag:cipherText
 * @returns Texto original desencriptado
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // Si el texto no tiene el formato esperado, devolverlo tal cual
  // (útil para datos antiguos no encriptados durante la migración)
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // No es un formato encriptado válido, devolver original
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
 * Genera un hash SHA-256 de un email (normalizado a minúsculas)
 * Útil para búsquedas exactas sin exponer el email real
 * 
 * @param email - Email a hashear
 * @returns Hash SHA-256 en formato hexadecimal
 */
export function hashEmail(email: string): string {
  if (!email) return '';
  
  // Normalizar a minúsculas para consistencia
  const normalizedEmail = email.toLowerCase().trim();
  
  return crypto
    .createHash('sha256')
    .update(normalizedEmail)
    .digest('hex');
}

/**
 * Encripta los campos sensibles de un objeto paciente
 * 
 * @param data - Objeto con los datos del paciente
 * @returns Objeto con campos sensibles encriptados y emailHash generado
 */
export function encryptPacienteData<T extends { name?: string; phone?: string; email?: string | null }>(
  data: T
): T & { emailHash?: string } {
  const result = { ...data } as T & { emailHash?: string };
  
  if (data.name) {
    result.name = encrypt(data.name);
  }
  
  if (data.phone) {
    result.phone = encrypt(data.phone);
  }
  
  if (data.email) {
    result.emailHash = hashEmail(data.email);
    result.email = encrypt(data.email);
  }
  
  return result;
}

/**
 * Desencripta los campos sensibles de un objeto paciente
 * 
 * @param data - Objeto con datos encriptados del paciente
 * @returns Objeto con campos sensibles desencriptados
 */
export function decryptPacienteData<T extends { name?: string; phone?: string; email?: string | null }>(
  data: T
): T {
  const result = { ...data };
  
  if (data.name) {
    result.name = decrypt(data.name);
  }
  
  if (data.phone) {
    result.phone = decrypt(data.phone);
  }
  
  if (data.email) {
    result.email = decrypt(data.email);
  }
  
  return result;
}

/**
 * Encripta los campos sensibles de una solicitud de cita
 * 
 * @param data - Objeto con los datos de la solicitud
 * @returns Objeto con campos sensibles encriptados y emailClienteHash generado
 */
export function encryptSolicitudData<T extends { nombreCliente?: string; emailCliente?: string; telefonoCliente?: string }>(
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
 * Desencripta los campos sensibles de una solicitud de cita
 * 
 * @param data - Objeto con datos encriptados de la solicitud
 * @returns Objeto con campos sensibles desencriptados
 */
export function decryptSolicitudData<T extends { nombreCliente?: string; emailCliente?: string; telefonoCliente?: string }>(
  data: T
): T {
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

/**
 * Desencripta una lista de pacientes
 * Útil para búsquedas en memoria después de obtener de la BD
 * 
 * @param pacientes - Array de pacientes con datos encriptados
 * @returns Array de pacientes con datos desencriptados
 */
export function decryptPacientesList<T extends { name?: string; phone?: string; email?: string | null }>(
  pacientes: T[]
): T[] {
  return pacientes.map(p => decryptPacienteData(p));
}

/**
 * Desencripta una lista de solicitudes
 * 
 * @param solicitudes - Array de solicitudes con datos encriptados
 * @returns Array de solicitudes con datos desencriptados
 */
export function decryptSolicitudesList<T extends { nombreCliente?: string; emailCliente?: string; telefonoCliente?: string }>(
  solicitudes: T[]
): T[] {
  return solicitudes.map(s => decryptSolicitudData(s));
}
