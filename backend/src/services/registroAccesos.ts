/**
 * Registro de accesos a datos de pacientes.
 *
 * Los datos de salud son una categoría especial del RGPD: hay que poder
 * responder «quién consultó o cambió esta ficha y cuándo». El middleware
 * anota, al terminar cada petición con éxito, las consultas de fichas y
 * análisis concretos, las altas, cambios y borrados, y las exportaciones.
 * Los listados no se anotan (serían ruido y no revelan datos de salud).
 */
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Se conservan dos años de registro; lo anterior se borra en las tareas periódicas
export const DIAS_CONSERVACION_REGISTRO = 730;

export interface DescripcionAcceso {
  accion: 'ver' | 'crear' | 'editar' | 'borrar' | 'exportar' | 'importar' | 'enviar' | 'guardar' | 'restaurar';
  recurso: 'paciente' | 'dermo' | 'bio' | 'programa-nutricion' | 'visita-nutricion' | 'registro-alimentacion' | 'informe' | 'listado' | 'copia';
  /** Id del elemento (paciente, análisis…) si viene en la URL */
  id?: string;
  detalle?: string;
}

const ACCION_POR_METODO: Record<string, DescripcionAcceso['accion'] | undefined> = {
  GET: 'ver',
  POST: 'crear',
  PUT: 'editar',
  PATCH: 'editar',
  DELETE: 'borrar',
};

/**
 * Decide si una petición se anota y cómo. Devuelve null si no se anota.
 * Función pura (se prueba en tests/registro-accesos.test.ts).
 */
export function describirAcceso(metodo: string, url: string): DescripcionAcceso | null {
  const ruta = url.split('?')[0].replace(/\/+$/, '');
  const accion = ACCION_POR_METODO[metodo];
  let m: RegExpMatchArray | null;

  // Pacientes
  if ((m = ruta.match(/^\/api\/pacientes\/([^/]+)\/exportar$/))) return { accion: 'exportar', recurso: 'paciente', id: m[1] };
  if ((m = ruta.match(/^\/api\/pacientes\/([^/]+)\/consentimiento$/))) return { accion: 'editar', recurso: 'paciente', id: m[1], detalle: 'consentimiento' };
  if (ruta === '/api/pacientes/importar' && metodo === 'POST') return { accion: 'importar', recurso: 'listado', detalle: 'pacientes desde Excel' };
  if (ruta === '/api/pacientes' && metodo === 'POST') return { accion: 'crear', recurso: 'paciente' };
  if ((m = ruta.match(/^\/api\/pacientes\/([^/]+)$/)) && accion && !['retencion', 'importar', 'plantilla-importacion'].includes(m[1])) {
    return { accion, recurso: 'paciente', id: m[1] };
  }

  // Análisis dermocosmético y bioquímico
  if ((m = ruta.match(/^\/api\/servicios\/(dermo|bio)$/)) && metodo === 'POST') return { accion: 'crear', recurso: m[1] as 'dermo' | 'bio' };
  if ((m = ruta.match(/^\/api\/servicios\/(dermo|bio)\/([^/]+)$/)) && accion && m[2] !== 'paciente') {
    return { accion, recurso: m[1] as 'dermo' | 'bio', id: m[2] };
  }

  // Nutrición
  const recursosNutricion = {
    programas: 'programa-nutricion',
    visitas: 'visita-nutricion',
    registros: 'registro-alimentacion',
  } as const;
  if ((m = ruta.match(/^\/api\/nutricion\/(programas|visitas|registros)(?:\/([^/]+))?$/)) && accion) {
    const recurso = recursosNutricion[m[1] as keyof typeof recursosNutricion];
    if (!m[2]) return metodo === 'POST' ? { accion: 'crear', recurso } : null;
    return { accion, recurso, id: m[2] };
  }

  // Informes enviados por email o guardados en PDF
  if (ruta === '/api/informes/enviar') return { accion: 'enviar', recurso: 'informe' };
  if (ruta === '/api/informes/guardar') return { accion: 'guardar', recurso: 'informe' };

  // Exportaciones de listados completos (CSV)
  if ((m = ruta.match(/^\/api\/exportar\/([^/]+)$/))) return { accion: 'exportar', recurso: 'listado', detalle: m[1] };

  // Copias de seguridad: contienen todos los datos
  if (ruta === '/api/backups/import' && metodo === 'POST') return { accion: 'restaurar', recurso: 'copia' };
  if ((m = ruta.match(/^\/api\/backups\/([^/]+)\/exportar$/))) return { accion: 'exportar', recurso: 'copia', detalle: decodeURIComponent(m[1]) };

  return null;
}

/** Averigua a qué paciente pertenece el elemento tocado (para poder filtrar por paciente) */
async function resolverPaciente(
  recurso: DescripcionAcceso['recurso'],
  id: string | undefined,
  cuerpo: Record<string, unknown>
): Promise<string | undefined> {
  const texto = (valor: unknown) => (typeof valor === 'string' ? valor : undefined);
  switch (recurso) {
    case 'paciente':
      return id;
    case 'informe':
      return texto(cuerpo.pacienteId);
    case 'dermo':
      return id
        ? (await prisma.analisisDermo.findUnique({ where: { id }, select: { pacienteId: true } }))?.pacienteId
        : texto(cuerpo.pacienteId);
    case 'bio':
      return id
        ? (await prisma.analisisBio.findUnique({ where: { id }, select: { pacienteId: true } }))?.pacienteId
        : texto(cuerpo.pacienteId);
    case 'programa-nutricion':
      return id
        ? (await prisma.programaNutricion.findUnique({ where: { id }, select: { pacienteId: true } }))?.pacienteId
        : texto(cuerpo.pacienteId);
    case 'visita-nutricion':
    case 'registro-alimentacion': {
      const programaId = id
        ? recurso === 'visita-nutricion'
          ? (await prisma.visitaNutricion.findUnique({ where: { id }, select: { programaId: true } }))?.programaId
          : (await prisma.registroAlimentacion.findUnique({ where: { id }, select: { programaId: true } }))?.programaId
        : texto(cuerpo.programaId);
      if (!programaId) return undefined;
      return (await prisma.programaNutricion.findUnique({ where: { id: programaId }, select: { pacienteId: true } }))?.pacienteId;
    }
    default:
      return undefined;
  }
}

interface DatosRegistro {
  usuarioId?: string | null;
  usuarioNombre: string;
  accion: string;
  recurso: string;
  pacienteId?: string | null;
  pacienteNombre?: string | null;
  detalle?: string | null;
}

/** Anota un acceso. Nunca lanza: un fallo del registro no debe romper la petición */
export async function anotarAcceso(datos: DatosRegistro): Promise<void> {
  try {
    await prisma.registroAcceso.create({ data: datos });
  } catch (error) {
    console.error('No se pudo anotar el acceso en el registro:', error);
  }
}

/**
 * Middleware: anota el acceso cuando la respuesta termina bien. Guarda el id
 * que devuelve una creación (el cuerpo de la respuesta) para enlazarlo con el
 * paciente. Al borrar, el paciente ya no existe: su nombre se busca antes.
 */
export function registrarAccesos(req: Request, res: Response, next: NextFunction) {
  const descripcion = describirAcceso(req.method, req.originalUrl);
  if (!descripcion) return next();

  let cuerpoRespuesta: unknown;
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo: unknown) => {
    cuerpoRespuesta = cuerpo;
    return jsonOriginal(cuerpo);
  };

  // Al borrar un paciente hay que leer su nombre antes de que desaparezca
  const nombrePrevio =
    descripcion.recurso === 'paciente' && descripcion.accion === 'borrar' && descripcion.id
      ? prisma.paciente.findUnique({ where: { id: descripcion.id }, select: { name: true } }).then((p) => p?.name)
      : Promise.resolve(undefined);

  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.usuario) return;
    const usuario = req.usuario;
    void (async () => {
      const cuerpo = (req.body ?? {}) as Record<string, unknown>;
      const idCreado =
        descripcion.accion === 'crear' && cuerpoRespuesta && typeof cuerpoRespuesta === 'object'
          ? ((cuerpoRespuesta as { id?: unknown }).id as string | undefined)
          : undefined;
      const idElemento = descripcion.id ?? idCreado;
      const pacienteId = await resolverPaciente(descripcion.recurso, idElemento, cuerpo).catch(() => undefined);
      const pacienteNombre = pacienteId
        ? ((await nombrePrevio) ??
          (await prisma.paciente.findUnique({ where: { id: pacienteId }, select: { name: true } }))?.name)
        : undefined;

      await anotarAcceso({
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        accion: descripcion.accion,
        recurso: descripcion.recurso,
        pacienteId: pacienteId ?? null,
        pacienteNombre: pacienteNombre ?? null,
        detalle: descripcion.detalle ?? null,
      });
    })();
  });

  next();
}

/** Borra las entradas más antiguas que el periodo de conservación */
export async function podarRegistroAccesos(): Promise<number> {
  const limite = new Date(Date.now() - DIAS_CONSERVACION_REGISTRO * 24 * 60 * 60 * 1000);
  const { count } = await prisma.registroAcceso.deleteMany({ where: { fecha: { lt: limite } } });
  return count;
}
