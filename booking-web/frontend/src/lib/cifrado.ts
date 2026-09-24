/**
 * Cifrado de la solicitud en el navegador (formato v1). Es la otra mitad de
 * backend/src/services/reservaOnline/cifrado.ts de la app de escritorio:
 * mismos algoritmos y parámetros.
 *
 * Se genera una clave efímera ECDH P-256, se deriva un secreto con la clave
 * pública de la farmacia (HKDF-SHA256) y se cifra con AES-256-GCM. Servicio,
 * fecha y hora van en claro (el servidor los necesita para reservar el
 * hueco), pero autenticados: alterarlos invalida el sobre. El servidor de
 * reservas no puede leer los datos personales.
 */

const CURVA = { name: 'ECDH', namedCurve: 'P-256' } as const;
const INFO_HKDF = new TextEncoder().encode('formula-care/reserva/v1');

export interface ClavePublicaFarmacia {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
}

export interface DatosPersonales {
  nombre: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  sexo: 'M' | 'F' | 'O';
  notas?: string;
}

export interface SobreCifrado {
  v: 1;
  epk: ClavePublicaFarmacia;
  sal: string;
  iv: string;
  datos: string;
}

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario);
}

export async function cifrarSolicitud(
  datos: DatosPersonales,
  clavePublica: ClavePublicaFarmacia,
  cita: { tipo: string; fecha: string; hora: string }
): Promise<SobreCifrado> {
  const { subtle } = globalThis.crypto;
  const [efimera, publica] = await Promise.all([
    subtle.generateKey(CURVA, true, ['deriveBits']),
    subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: clavePublica.x, y: clavePublica.y }, CURVA, false, []),
  ]);
  const sal = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const secreto = await subtle.deriveBits({ name: 'ECDH', public: publica }, efimera.privateKey, 256);
  const base = await subtle.importKey('raw', secreto, 'HKDF', false, ['deriveKey']);
  const clave = await subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: sal, info: INFO_HKDF },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const cifrado = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${cita.tipo}|${cita.fecha}|${cita.hora}`) },
    clave,
    new TextEncoder().encode(JSON.stringify(datos))
  );
  const epk = (await subtle.exportKey('jwk', efimera.publicKey)) as JsonWebKey;
  return {
    v: 1,
    epk: { kty: 'EC', crv: 'P-256', x: epk.x!, y: epk.y! },
    sal: aBase64(sal),
    iv: aBase64(iv),
    datos: aBase64(new Uint8Array(cifrado)),
  };
}
