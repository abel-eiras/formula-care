import { z } from 'zod';

/**
 * Publicación que envía la app de escritorio (ver
 * backend/src/services/reservaOnline/sincronizacion.ts en la raíz del repo).
 * Todo su contenido es público: marca, textos legales, clave pública y huecos.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const tipo = z.string().regex(/^(dermo|bio|nutricion|consulta|evento:[\w-]+)$/);
const texto = (max: number) => z.string().max(max).nullable();

export const publicacionSchema = z.object({
  version: z.literal(1),
  generadaEn: z.string(),
  zonaHoraria: z.string().max(64),
  farmacia: z.object({
    nombre: texto(200),
    direccion: texto(300),
    ciudad: texto(200),
    telefono: texto(40),
    email: texto(200),
    whatsapp: texto(40),
    web: texto(300),
    logo: texto(1_500_000), // data: URI
    colorPrimario: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  legal: z.object({
    avisoLegal: texto(100_000),
    privacidad: texto(100_000),
    cookies: texto(100_000),
  }),
  clavePublica: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: z.string(), y: z.string() }),
  servicios: z.array(z.object({ id: tipo, nombre: z.string().max(100), duracion: z.number().int().positive() })).max(20),
  eventos: z
    .array(z.object({ id: z.string().max(64), nombre: z.string().max(200), descripcion: texto(2000), duracion: z.number().int().positive() }))
    .max(50),
  // tipo → fecha → hora → plazas libres
  huecos: z.record(tipo, z.record(fecha, z.record(hora, z.number().int().min(0)))),
});

export type Publicacion = z.infer<typeof publicacionSchema>;
export type Huecos = Publicacion['huecos'];

/** Fecha "YYYY-MM-DD" y minuto del día actuales en la zona horaria de la farmacia */
function ahoraEnZona(zonaHoraria: string, ahora = new Date()): { fecha: string; minuto: number } {
  let partes: Intl.DateTimeFormatPart[];
  try {
    partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(ahora);
  } catch {
    partes = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora);
  }
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? '00';
  return { fecha: `${valor('year')}-${valor('month')}-${valor('day')}`, minuto: Number(valor('hour')) * 60 + Number(valor('minute')) };
}

const aMinutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/**
 * Huecos que se pueden ofrecer ahora: sin los que ya han pasado (la
 * publicación puede tener horas si la app está apagada) y descontando las
 * solicitudes que la app aún no ha recogido.
 */
export function huecosVigentes(
  pub: Publicacion,
  solicitudesSinRecoger: { tipo: string; fecha: string; hora: string }[],
  ahora = new Date()
): Huecos {
  const { fecha: hoy, minuto } = ahoraEnZona(pub.zonaHoraria, ahora);
  const ocupadas = new Map<string, number>();
  for (const s of solicitudesSinRecoger) {
    const clave = `${s.tipo}|${s.fecha}|${s.hora}`;
    ocupadas.set(clave, (ocupadas.get(clave) ?? 0) + 1);
  }

  const resultado: Huecos = {};
  for (const [t, porFecha] of Object.entries(pub.huecos)) {
    const fechas: Huecos[string] = {};
    for (const [f, porHora] of Object.entries(porFecha)) {
      if (f < hoy) continue;
      const horas: Record<string, number> = {};
      for (const [h, plazas] of Object.entries(porHora)) {
        if (f === hoy && aMinutos(h) <= minuto) continue;
        const libres = plazas - (ocupadas.get(`${t}|${f}|${h}`) ?? 0);
        if (libres > 0) horas[h] = libres;
      }
      if (Object.keys(horas).length) fechas[f] = horas;
    }
    resultado[t] = fechas;
  }
  return resultado;
}
