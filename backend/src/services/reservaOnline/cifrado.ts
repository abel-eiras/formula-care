import { webcrypto } from 'node:crypto';

/**
 * Cifrado del buzón de la reserva online (formato v1).
 *
 * El navegador del paciente cifra sus datos con la clave pública de la
 * farmacia usando una clave efímera (ECDH P-256 → HKDF-SHA256 → AES-256-GCM),
 * así que booking-web solo guarda texto cifrado que no puede leer. La fecha,
 * hora y servicio van en claro (el servidor los necesita para reservar el
 * hueco) pero se autentican como datos asociados: si se alteran, el
 * descifrado falla. booking-web/frontend/src/lib/cifrado.ts es la otra mitad
 * y debe mantenerse idéntica en algoritmos y parámetros.
 */

const { subtle } = webcrypto;
const CURVA = { name: 'ECDH', namedCurve: 'P-256' } as const;
const INFO_HKDF = new TextEncoder().encode('formula-care/reserva/v1');

export interface SobreCifrado {
  v: 1;
  epk: webcrypto.JsonWebKey; // Clave pública efímera del navegador
  sal: string; // base64, 16 bytes
  iv: string; // base64, 12 bytes
  datos: string; // base64: texto cifrado + etiqueta GCM
}

/** Datos personales que viajan cifrados en una solicitud */
export interface DatosSolicitud {
  nombre: string;
  email: string;
  telefono: string;
  fechaNacimiento?: string;
  sexo?: 'M' | 'F' | 'O';
  notas?: string;
}

/** Datos asociados: vinculan el sobre a la cita solicitada */
export function datosAsociados(tipo: string, fecha: string, hora: string): Uint8Array {
  return new TextEncoder().encode(`${tipo}|${fecha}|${hora}`);
}

/** Solo las componentes públicas de una clave EC (sin "d" ni metadatos) */
function clavePublicaMinima(jwk: webcrypto.JsonWebKey): webcrypto.JsonWebKey {
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
}

export async function generarParClaves(): Promise<{ publica: webcrypto.JsonWebKey; privada: webcrypto.JsonWebKey }> {
  const par = await subtle.generateKey(CURVA, true, ['deriveBits']);
  const [publica, privada] = await Promise.all([
    subtle.exportKey('jwk', par.publicKey),
    subtle.exportKey('jwk', par.privateKey),
  ]);
  return { publica: clavePublicaMinima(publica), privada };
}

/** Huella corta de la clave pública, para comprobar a ojo que web y app coinciden */
export async function huellaClave(publica: webcrypto.JsonWebKey): Promise<string> {
  const texto = new TextEncoder().encode(`${publica.x}.${publica.y}`);
  const resumen = new Uint8Array(await subtle.digest('SHA-256', texto));
  return [...resumen.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

async function derivarClaveAes(
  privada: webcrypto.CryptoKey,
  publica: webcrypto.CryptoKey,
  sal: Uint8Array,
  usos: webcrypto.KeyUsage[]
): Promise<webcrypto.CryptoKey> {
  const secreto = await subtle.deriveBits({ name: 'ECDH', public: publica }, privada, 256);
  const base = await subtle.importKey('raw', secreto, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: sal, info: INFO_HKDF },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    usos
  );
}

const aBase64 = (datos: Uint8Array) => Buffer.from(datos).toString('base64');
const deBase64 = (texto: string) => new Uint8Array(Buffer.from(texto, 'base64'));

/** Cifra como lo hace el navegador (se usa en las pruebas y para verificar la clave) */
export async function cifrarSolicitud(
  datos: DatosSolicitud,
  publicaFarmacia: webcrypto.JsonWebKey,
  aad: Uint8Array
): Promise<SobreCifrado> {
  const [efimera, publica] = await Promise.all([
    subtle.generateKey(CURVA, true, ['deriveBits']),
    subtle.importKey('jwk', clavePublicaMinima(publicaFarmacia), CURVA, false, []),
  ]);
  const sal = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const clave = await derivarClaveAes(efimera.privateKey, publica, sal, ['encrypt']);
  const cifrado = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    clave,
    new TextEncoder().encode(JSON.stringify(datos))
  );
  return {
    v: 1,
    epk: clavePublicaMinima(await subtle.exportKey('jwk', efimera.publicKey)),
    sal: aBase64(sal),
    iv: aBase64(iv),
    datos: aBase64(new Uint8Array(cifrado)),
  };
}

/** Descifra un sobre; lanza un error si la clave, los datos asociados o el contenido no cuadran */
export async function descifrarSolicitud(
  sobre: SobreCifrado,
  privadaFarmacia: webcrypto.JsonWebKey,
  aad: Uint8Array
): Promise<DatosSolicitud> {
  if (sobre.v !== 1) throw new Error(`Versión de sobre no soportada: ${String(sobre.v)}`);
  const [privada, efimera] = await Promise.all([
    subtle.importKey('jwk', privadaFarmacia, CURVA, false, ['deriveBits']),
    subtle.importKey('jwk', clavePublicaMinima(sobre.epk), CURVA, false, []),
  ]);
  const clave = await derivarClaveAes(privada, efimera, deBase64(sobre.sal), ['decrypt']);
  const claro = await subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64(sobre.iv), additionalData: aad },
    clave,
    deBase64(sobre.datos)
  );
  const datos = JSON.parse(new TextDecoder().decode(claro)) as Partial<DatosSolicitud>;
  if (!datos.nombre || !datos.email || !datos.telefono) throw new Error('Solicitud incompleta');
  return {
    nombre: String(datos.nombre).slice(0, 200),
    email: String(datos.email).slice(0, 200),
    telefono: String(datos.telefono).slice(0, 40),
    fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/.test(String(datos.fechaNacimiento ?? '')) ? datos.fechaNacimiento : undefined,
    sexo: datos.sexo === 'M' || datos.sexo === 'F' || datos.sexo === 'O' ? datos.sexo : undefined,
    notas: datos.notas ? String(datos.notas).slice(0, 2000) : undefined,
  };
}
