import { Router } from 'express';
import { obtenerPacientes, obtenerPaciente, crearPaciente, actualizarPaciente, eliminarPaciente } from '../controllers/pacientes.js';

export const pacientesRouter = Router();

// GET /api/pacientes - Obtener todos los pacientes
pacientesRouter.get('/', obtenerPacientes);

// GET /api/pacientes/:id - Obtener un paciente específico
pacientesRouter.get('/:id', obtenerPaciente);

// POST /api/pacientes - Crear nuevo paciente
pacientesRouter.post('/', crearPaciente);

// PUT /api/pacientes/:id - Actualizar paciente
pacientesRouter.put('/:id', actualizarPaciente);

// DELETE /api/pacientes/:id - Eliminar paciente
pacientesRouter.delete('/:id', eliminarPaciente);
