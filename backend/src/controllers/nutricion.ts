import { Request, Response } from 'express';
import { z } from 'zod';
import type { ProgramaNutricion, VisitaNutricion, RegistroAlimentacion } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getParamString, getQueryString } from '../lib/queryHelpers.js';
import { crearNotificacionRevision } from '../services/notificacionesService.js';

// ==========================================
// VALIDACIÓN
// ==========================================
// Los catálogos (antecedentes, efectos secundarios, causas de picoteo...) viven
// en el frontend; aquí solo se limita el tamaño de los ids para no aceptar basura.
const idCatalogo = z.string().min(1).max(60);
const textoOpcional = z.string().max(5000).nullish();
const escala0a10 = z.number().int().min(0).max(10).nullish();

const programaSchema = z.object({
  pacienteId: z.string().min(1, 'El ID del paciente es requerido'),
  fechaInicio: z.string().min(1),
  estado: z.enum(['activo', 'pausado', 'finalizado']).default('activo'),
  fechaFin: z.string().nullish(),
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
  fecha: z.string().min(1),
  evolucionSubjetiva: z.enum(['muy_buena', 'buena', 'regular', 'dificultosa']).nullish(),
  adherencia: escala0a10,
  motivacion: escala0a10,
  medicacionHabitual: textoOpcional,
  suplementacion: textoOpcional,
  glp1Activo: z.boolean().default(false),
  glp1Farmaco: idCatalogo.nullish(),
  glp1Dosis: z.string().max(100).nullish(),
  glp1FechaInicio: z.string().nullish(),
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
  peso: z.number().positive().max(400).nullish(),
  altura: z.number().positive().max(250).nullish(),
  cintura: z.number().positive().max(300).nullish(),
  cadera: z.number().positive().max(300).nullish(),
  porcentajeGrasa: z.number().min(0).max(100).nullish(),
  masaGrasa: z.number().min(0).max(400).nullish(),
  masaMagra: z.number().min(0).max(400).nullish(),
  systolic: z.number().int().positive().max(300).nullish(),
  diastolic: z.number().int().positive().max(200).nullish(),
  dificultades: textoOpcional,
  observaciones: textoOpcional,
  objetivosProximaSesion: textoOpcional,
  recomendaciones: textoOpcional,
  proximaRevision: z.string().nullish(),
  farmaceutico: textoOpcional,
});

const registroSchema = z.object({
  programaId: z.string().min(1, 'El ID del programa es requerido'),
  fecha: z.string().min(1),
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

function serializarVisita(visita: VisitaNutricion) {
  return {
    ...visita,
    efectosSecundarios: parsearArray<{ id: string; intensidad: string }>(visita.efectosSecundarios),
    picoteoCausas: parsearArray<string>(visita.picoteoCausas),
    ejercicioTipos: parsearArray<string>(visita.ejercicioTipos),
  };
}

function serializarRegistro(registro: RegistroAlimentacion) {
  return { ...registro, sensaciones: parsearArray<string>(registro.sensaciones) };
}

/**
 * IMC e ICC se calculan en el servidor para que el dato guardado sea
 * coherente aunque el cliente no los envíe.
 */
function calcularDerivados(peso?: number | null, altura?: number | null, cintura?: number | null, cadera?: number | null) {
  const imc = peso && altura ? Number((peso / (altura / 100) ** 2).toFixed(1)) : null;
  const icc = cintura && cadera ? Number((cintura / cadera).toFixed(2)) : null;
  return { imc, icc };
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
    const pacienteId = getQueryString(req.query.pacienteId);
    const programas = await prisma.programaNutricion.findMany({
      where: pacienteId ? { pacienteId } : {},
      include: {
        visitas: { orderBy: { fecha: 'asc' } },
        _count: { select: { registros: true } },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    res.json(
      programas.map(({ visitas, _count, ...programa }) => ({
        ...serializarPrograma(programa),
        visitas: visitas.map(serializarVisita),
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
        visitas: { orderBy: { fecha: 'asc' } },
        registros: { orderBy: [{ fecha: 'asc' }, { hora: 'asc' }] },
      },
    });

    if (!programa) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    const { visitas, registros, ...datos } = programa;
    res.json({
      ...serializarPrograma(datos),
      visitas: visitas.map(serializarVisita),
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
    const visita = await prisma.visitaNutricion.findUnique({ where: { id } });

    if (!visita) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    res.json(serializarVisita(visita));
  } catch (error) {
    responderError(res, error, 'Error al obtener la visita');
  }
}

/**
 * Crear una visita. El tipo lo decide el servidor: la primera del programa
 * es la inicial (referencia para la evolución) y el resto son de seguimiento.
 */
export async function crearVisita(req: Request, res: Response) {
  try {
    const datos = visitaSchema.parse(req.body);

    const [programa, visitasPrevias] = await Promise.all([
      prisma.programaNutricion.findUnique({ where: { id: datos.programaId }, select: { pacienteId: true } }),
      prisma.visitaNutricion.count({ where: { programaId: datos.programaId } }),
    ]);

    if (!programa) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    const visita = await prisma.visitaNutricion.create({
      data: {
        ...datos,
        tipo: visitasPrevias === 0 ? 'inicial' : 'seguimiento',
        ...calcularDerivados(datos.peso, datos.altura, datos.cintura, datos.cadera),
        efectosSecundarios: JSON.stringify(datos.efectosSecundarios),
        picoteoCausas: JSON.stringify(datos.picoteoCausas),
        ejercicioTipos: JSON.stringify(datos.ejercicioTipos),
      },
    });

    if (visita.proximaRevision) {
      crearNotificacionRevision(visita.id, programa.pacienteId, visita.proximaRevision).catch((err) =>
        console.error('Error al crear notificación:', err)
      );
    }

    res.status(201).json(serializarVisita(visita));
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

    // Recalcular derivados con los valores nuevos o, si no llegan, los guardados
    const valor = <K extends 'peso' | 'altura' | 'cintura' | 'cadera'>(campo: K) =>
      datos[campo] !== undefined ? datos[campo] : existente[campo];

    const visita = await prisma.visitaNutricion.update({
      where: { id },
      data: {
        ...datos,
        ...calcularDerivados(valor('peso'), valor('altura'), valor('cintura'), valor('cadera')),
        efectosSecundarios: datos.efectosSecundarios ? JSON.stringify(datos.efectosSecundarios) : undefined,
        picoteoCausas: datos.picoteoCausas ? JSON.stringify(datos.picoteoCausas) : undefined,
        ejercicioTipos: datos.ejercicioTipos ? JSON.stringify(datos.ejercicioTipos) : undefined,
      },
    });

    if (visita.proximaRevision) {
      crearNotificacionRevision(visita.id, existente.programa.pacienteId, visita.proximaRevision).catch((err) =>
        console.error('Error al crear notificación:', err)
      );
    }

    res.json(serializarVisita(visita));
  } catch (error) {
    responderError(res, error, 'Error al actualizar la visita');
  }
}

/**
 * Eliminar una visita. Si era la inicial, la siguiente pasa a serlo para que
 * el programa siempre tenga una referencia.
 */
export async function eliminarVisita(req: Request, res: Response) {
  try {
    const id = getParamString(req.params.id);
    const visita = await prisma.visitaNutricion.findUnique({ where: { id } });
    if (!visita) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.visitaNutricion.delete({ where: { id } });
      if (visita.tipo === 'inicial') {
        const siguiente = await tx.visitaNutricion.findFirst({
          where: { programaId: visita.programaId },
          orderBy: { fecha: 'asc' },
        });
        if (siguiente) {
          await tx.visitaNutricion.update({ where: { id: siguiente.id }, data: { tipo: 'inicial' } });
        }
      }
    });

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
