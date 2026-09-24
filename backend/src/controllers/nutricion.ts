import { Request, Response } from 'express';
import { z } from 'zod';
import type { Medicion, ProgramaNutricion, VisitaNutricion, RegistroAlimentacion } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getParamString, getQueryString } from '../lib/queryHelpers.js';
import { crearNotificacionRevision } from '../services/notificacionesService.js';
import { aplanarMedicion, guardarMedicion, medicionSchema, separarMedicion } from '../services/medicionService.js';

// ==========================================
// VALIDACIÓN
// ==========================================
// Los catálogos (antecedentes, efectos secundarios, causas de picoteo...) viven
// en el frontend; aquí solo se limita el tamaño de los ids para no aceptar basura.
const idCatalogo = z.string().min(1).max(60);
// Fechas siempre "YYYY-MM-DD": se guardan como texto y así ordenan correctamente
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD');
const textoOpcional = z.string().max(5000).nullish();
const escala0a10 = z.number().int().min(0).max(10).nullish();

const programaSchema = z.object({
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fechaInicio: fecha,
  estado: z.enum(['activo', 'pausado', 'finalizado']).default('activo'),
  fechaFin: fecha.nullish(),
  motivoConsulta: textoOpcional,
  objetivoPrincipal: textoOpcional,
  pesoObjetivo: z.number().positive().max(400).nullish(),
  dietasPrevias: textoOpcional,
  antecedentes: z.array(idCatalogo).max(50).default([]),
  otrosProblemasMedicos: textoOpcional,
  antecedentesFamiliares: textoOpcional,
  tabaco: z.enum(['no', 'exfumador', 'si']).nullish(),
  alcohol: z.enum(['nunca', 'ocasional', 'semanal', 'diario']).nullish(),
  glp1Previo: z.boolean().default(false),
  glp1PrevioFarmaco: textoOpcional,
  glp1PrevioMotivoAbandono: textoOpcional,
  medicoPrescriptor: textoOpcional,
  otroTratamientoPeso: textoOpcional,
  farmaceutico: textoOpcional,
});

const efectoSecundarioSchema = z.object({
  id: idCatalogo,
  intensidad: z.enum(['leve', 'moderada', 'grave']),
});

const visitaSchema = z.object({
  programaId: z.string().min(1, 'El ID del programa es requerido'),
  fecha,
  evolucionSubjetiva: z.enum(['muy_buena', 'buena', 'regular', 'dificultosa']).nullish(),
  adherencia: escala0a10,
  motivacion: escala0a10,
  medicacionHabitual: textoOpcional,
  suplementacion: textoOpcional,
  glp1Activo: z.boolean().default(false),
  glp1Farmaco: idCatalogo.nullish(),
  glp1Dosis: z.string().max(100).nullish(),
  glp1FechaInicio: fecha.nullish(),
  glp1DosisOlvidadas: z.number().int().min(0).max(100).nullish(),
  efectosSecundarios: z.array(efectoSecundarioSchema).max(30).default([]),
  toleranciaObservaciones: textoOpcional,
  cambioDieteticoIniciado: z.boolean().nullish(),
  pautaDietetica: textoOpcional,
  comidasDia: z.number().int().min(0).max(15).nullish(),
  racionesProteinaDia: z.number().int().min(0).max(15).nullish(),
  racionesFrutaVerduraDia: z.number().int().min(0).max(20).nullish(),
  picoteo: z.boolean().nullish(),
  picoteoFrecuencia: z.enum(['ocasional', 'diario', 'varias_diarias']).nullish(),
  picoteoCausas: z.array(idCatalogo).max(20).default([]),
  aguaLitros: z.number().min(0).max(15).nullish(),
  suenoHoras: z.number().min(0).max(24).nullish(),
  suenoCalidad: z.enum(['buena', 'regular', 'mala']).nullish(),
  estres: z.enum(['bajo', 'moderado', 'alto']).nullish(),
  ejercicio: z.enum(['no', 'parcial', 'si']).nullish(),
  ejercicioTipos: z.array(idCatalogo).max(20).default([]),
  ejercicioDiasSemana: z.number().int().min(0).max(7).nullish(),
  ejercicioMinutosSesion: z.number().int().min(0).max(600).nullish(),
  ejercicioDetalle: textoOpcional,
  dificultades: textoOpcional,
  observaciones: textoOpcional,
  objetivosProximaSesion: textoOpcional,
  recomendaciones: textoOpcional,
  proximaRevision: fecha.nullish(),
  farmaceutico: textoOpcional,
}).merge(medicionSchema); // medidas: se guardan en la tabla única Medicion

const registroSchema = z.object({
  programaId: z.string().min(1, 'El ID del programa es requerido'),
  fecha,
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora HH:mm').nullish(),
  momento: z.enum(['desayuno', 'media_manana', 'comida', 'merienda', 'cena', 'recena', 'picoteo']),
  descripcion: z.string().min(1, 'Indica qué se ha comido').max(2000),
  cantidad: z.enum(['pequena', 'normal', 'grande']).nullish(),
  hambreAntes: escala0a10,
  saciedadDespues: escala0a10,
  sensaciones: z.array(idCatalogo).max(20).default([]),
  compania: z.enum(['solo', 'familia', 'amigos', 'trabajo']).nullish(),
  lugar: z.enum(['casa', 'trabajo', 'fuera', 'otro']).nullish(),
  causaPicoteo: idCatalogo.nullish(),
  notas: textoOpcional,
});

// ==========================================
// SERIALIZACIÓN
// ==========================================
// SQLite no tiene tipo JSON: los arrays se guardan como texto y se devuelven parseados.
function parsearArray<T>(valor: string): T[] {
  try {
    const parsed: unknown = JSON.parse(valor);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function serializarPrograma(programa: ProgramaNutricion) {
  return { ...programa, antecedentes: parsearArray<string>(programa.antecedentes) };
}

type TipoVisita = 'inicial' | 'seguimiento';

type VisitaConMedicion = VisitaNutricion & { medicion: Medicion | null };

function serializarVisita(visita: VisitaConMedicion, tipo: TipoVisita) {
  const { medicion, ...datos } = visita;
  return {
    ...datos,
    ...aplanarMedicion(medicion),
    tipo,
    efectosSecundarios: parsearArray<{ id: string; intensidad: string }>(visita.efectosSecundarios),
    picoteoCausas: parsearArray<string>(visita.picoteoCausas),
    ejercicioTipos: parsearArray<string>(visita.ejercicioTipos),
  };
}

// Orden canónico de las visitas: por fecha y, en el mismo día, por creación
const ORDEN_VISITAS = [{ fecha: 'asc' as const }, { createdAt: 'asc' as const }];
const CON_MEDICION = { medicion: true } as const;

/** Serializa las visitas de un programa (ya ordenadas): la primera es la inicial */
function serializarVisitas(visitasOrdenadas: VisitaConMedicion[]) {
  return visitasOrdenadas.map((v, i) => serializarVisita(v, i === 0 ? 'inicial' : 'seguimiento'));
}

/** Serializa una visita suelta consultando cuál es la inicial de su programa */
async function serializarVisitaSuelta(visita: VisitaConMedicion) {
  const primera = await prisma.visitaNutricion.findFirst({
    where: { programaId: visita.programaId },
    orderBy: ORDEN_VISITAS,
    select: { id: true },
  });
  return serializarVisita(visita, primera?.id === visita.id ? 'inicial' : 'seguimiento');
}

function serializarRegistro(registro: RegistroAlimentacion) {
  return { ...registro, sensaciones: parsearArray<string>(registro.sensaciones) };
}

function responderError(res: Response, error: unknown, mensaje: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors });
  }
  console.error(`${mensaje}:`, error);
  return res.status(500).json({ error: mensaje });
}

// ==========================================
// PROGRAMAS
// ==========================================

/**
 * Listar programas (opcionalmente de un paciente) con un resumen de visitas
 */
export async function obtenerProgramas(req: Request, res: Response) {
  try {
    // Siempre por paciente: sin filtro devolvería todas las visitas de la farmacia
    const pacienteId = getQueryString(req.query.pacienteId);
    if (!pacienteId) {
      return res.status(400).json({ error: 'El parámetro pacienteId es requerido' });
    }
    const programas = await prisma.programaNutricion.findMany({
      where: { pacienteId },
      include: {
        visitas: { orderBy: ORDEN_VISITAS, include: CON_MEDICION },
        _count: { select: { registros: true } },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    res.json(
      programas.map(({ visitas, _count, ...programa }) => ({
        ...serializarPrograma(programa),
        visitas: serializarVisitas(visitas),
        totalRegistros: _count.registros,
      }))
    );
  } catch (error) {
    responderError(res, error, 'Error al obtener programas de nutrición');
  }
}

/**
 * Obtener un programa con sus visitas y su registro de alimentación
 */
export async function obtenerPrograma(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const programa = await prisma.programaNutricion.findUnique({
      where: { id },
      include: {
        visitas: { orderBy: ORDEN_VISITAS, include: CON_MEDICION },
        registros: { orderBy: [{ fecha: 'asc' }, { hora: 'asc' }] },
      },
    });

    if (!programa) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    const { visitas, registros, ...datos } = programa;
    res.json({
      ...serializarPrograma(datos),
      visitas: serializarVisitas(visitas),
      registros: registros.map(serializarRegistro),
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener el programa de nutrición');
  }
}

/**
 * Crear un programa. Solo puede haber uno activo por paciente para que
 * la evolución no se mezcle entre procesos distintos.
 */
export async function crearPrograma(req: Request, res: Response) {
  try {
    const datos = programaSchema.parse(req.body);

    const [paciente, programaActivo] = await Promise.all([
      prisma.paciente.findUnique({ where: { id: datos.pacienteId }, select: { id: true } }),
      prisma.programaNutricion.findFirst({
        where: { pacienteId: datos.pacienteId, estado: 'activo' },
        select: { id: true },
      }),
    ]);

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    if (programaActivo && datos.estado === 'activo') {
      return res.status(409).json({
        error: 'El paciente ya tiene un programa de nutrición activo',
        programaId: programaActivo.id,
      });
    }

    const programa = await prisma.programaNutricion.create({
      data: { ...datos, antecedentes: JSON.stringify(datos.antecedentes) },
    });

    res.status(201).json(serializarPrograma(programa));
  } catch (error) {
    responderError(res, error, 'Error al crear el programa de nutrición');
  }
}

/**
 * Actualizar un programa (datos de partida o estado)
 */
export async function actualizarPrograma(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    // El paciente de un programa no se puede cambiar
    const { pacienteId: _pacienteId, ...datos } = programaSchema.partial().parse(req.body);

    const existente = await prisma.programaNutricion.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    // Reactivar un programa no puede dejar dos activos para el mismo paciente
    if (datos.estado === 'activo' && existente.estado !== 'activo') {
      const otroActivo = await prisma.programaNutricion.findFirst({
        where: { pacienteId: existente.pacienteId, estado: 'activo', NOT: { id } },
        select: { id: true },
      });
      if (otroActivo) {
        return res.status(409).json({
          error: 'El paciente ya tiene otro programa de nutrición activo',
          programaId: otroActivo.id,
        });
      }
    }

    const programa = await prisma.programaNutricion.update({
      where: { id },
      data: {
        ...datos,
        antecedentes: datos.antecedentes ? JSON.stringify(datos.antecedentes) : undefined,
      },
    });

    res.json(serializarPrograma(programa));
  } catch (error) {
    responderError(res, error, 'Error al actualizar el programa de nutrición');
  }
}

// ==========================================
// VISITAS
// ==========================================

export async function obtenerVisita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const visita = await prisma.visitaNutricion.findUnique({ where: { id }, include: CON_MEDICION });

    if (!visita) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    res.json(await serializarVisitaSuelta(visita));
  } catch (error) {
    responderError(res, error, 'Error al obtener la visita');
  }
}

export async function crearVisita(req: Request, res: Response) {
  try {
    const datos = visitaSchema.parse(req.body);

    const programa = await prisma.programaNutricion.findUnique({
      where: { id: datos.programaId },
      select: { pacienteId: true },
    });
    if (!programa) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    const { medicion, resto } = separarMedicion(datos);

    // Visita y medición se guardan juntas o no se guarda ninguna
    const visita = await prisma.$transaction(async (tx) => {
      const creada = await tx.visitaNutricion.create({
        data: {
          ...resto,
          efectosSecundarios: JSON.stringify(resto.efectosSecundarios),
          picoteoCausas: JSON.stringify(resto.picoteoCausas),
          ejercicioTipos: JSON.stringify(resto.ejercicioTipos),
        },
      });
      const medicionGuardada = await guardarMedicion(
        tx,
        { origen: 'nutricion', visitaNutricionId: creada.id, pacienteId: programa.pacienteId, fecha: creada.fecha },
        medicion
      );
      return { ...creada, medicion: medicionGuardada };
    });

    if (visita.proximaRevision) {
      crearNotificacionRevision(visita.id, programa.pacienteId, visita.proximaRevision).catch((err) =>
        console.error('Error al crear notificación:', err)
      );
    }

    res.status(201).json(await serializarVisitaSuelta(visita));
  } catch (error) {
    responderError(res, error, 'Error al crear la visita');
  }
}

export async function actualizarVisita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    // Una visita no cambia de programa
    const { programaId: _programaId, ...datos } = visitaSchema.partial().parse(req.body);

    const existente = await prisma.visitaNutricion.findUnique({
      where: { id },
      include: { programa: { select: { pacienteId: true } } },
    });
    if (!existente) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    const { medicion, resto } = separarMedicion(datos);

    const visita = await prisma.$transaction(async (tx) => {
      const actualizada = await tx.visitaNutricion.update({
        where: { id },
        data: {
          ...resto,
          efectosSecundarios: resto.efectosSecundarios ? JSON.stringify(resto.efectosSecundarios) : undefined,
          picoteoCausas: resto.picoteoCausas ? JSON.stringify(resto.picoteoCausas) : undefined,
          ejercicioTipos: resto.ejercicioTipos ? JSON.stringify(resto.ejercicioTipos) : undefined,
        },
      });
      // Siempre se llama: aunque no cambien las medidas, la fecha de la visita puede haber cambiado
      const medicionGuardada = await guardarMedicion(
        tx,
        {
          origen: 'nutricion',
          visitaNutricionId: id,
          pacienteId: existente.programa.pacienteId,
          fecha: actualizada.fecha,
        },
        medicion
      );
      return { ...actualizada, medicion: medicionGuardada };
    });

    if (visita.proximaRevision) {
      crearNotificacionRevision(visita.id, existente.programa.pacienteId, visita.proximaRevision).catch((err) =>
        console.error('Error al crear notificación:', err)
      );
    }

    res.json(await serializarVisitaSuelta(visita));
  } catch (error) {
    responderError(res, error, 'Error al actualizar la visita');
  }
}

/**
 * Eliminar una visita. Si era la inicial, la siguiente por fecha pasa a
 * serlo automáticamente (el tipo se deriva, no se guarda).
 */
export async function eliminarVisita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const visita = await prisma.visitaNutricion.findUnique({ where: { id }, select: { id: true } });
    if (!visita) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    await prisma.visitaNutricion.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    responderError(res, error, 'Error al eliminar la visita');
  }
}

// ==========================================
// REGISTRO DE ALIMENTACIÓN
// ==========================================

export async function crearRegistro(req: Request, res: Response) {
  try {
    const datos = registroSchema.parse(req.body);

    const programa = await prisma.programaNutricion.findUnique({
      where: { id: datos.programaId },
      select: { id: true },
    });
    if (!programa) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    const registro = await prisma.registroAlimentacion.create({
      data: {
        ...datos,
        // La causa del picoteo solo tiene sentido en los picoteos
        causaPicoteo: datos.momento === 'picoteo' ? datos.causaPicoteo : null,
        sensaciones: JSON.stringify(datos.sensaciones),
      },
    });

    res.status(201).json(serializarRegistro(registro));
  } catch (error) {
    responderError(res, error, 'Error al guardar el registro de alimentación');
  }
}

export async function actualizarRegistro(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const { programaId: _programaId, ...datos } = registroSchema.partial().parse(req.body);

    const existente = await prisma.registroAlimentacion.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const momento = datos.momento ?? existente.momento;
    const registro = await prisma.registroAlimentacion.update({
      where: { id },
      data: {
        ...datos,
        causaPicoteo: momento === 'picoteo' ? datos.causaPicoteo : null,
        sensaciones: datos.sensaciones ? JSON.stringify(datos.sensaciones) : undefined,
      },
    });

    res.json(serializarRegistro(registro));
  } catch (error) {
    responderError(res, error, 'Error al actualizar el registro de alimentación');
  }
}

export async function eliminarRegistro(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const existente = await prisma.registroAlimentacion.findUnique({ where: { id }, select: { id: true } });
    if (!existente) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    await prisma.registroAlimentacion.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    responderError(res, error, 'Error al eliminar el registro de alimentación');
  }
}
