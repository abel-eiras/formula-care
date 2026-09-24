import { Router } from 'express';
import {
  obtenerPacientes,
  obtenerPaciente,
  obtenerMedicionesPaciente,
  crearPaciente,
  actualizarPaciente,
  eliminarPaciente,
} from '../controllers/pacientes.js';

export const pacientesRouter = Router();

// GET /api/pacientes - Obtener todos los pacientes
pacientesRouter.get('/', obtenerPacientes);

// GET /api/pacientes/:id - Obtener un paciente específico
pacientesRouter.get('/:id', obtenerPaciente);

// GET /api/pacientes/:id/mediciones - Historial único de medidas (todos los servicios)
pacientesRouter.get('/:id/mediciones', obtenerMedicionesPaciente);

// POST /api/pacientes - Crear nuevo paciente
pacientesRouter.post('/', crearPaciente);

// PUT /api/pacientes/:id - Actualizar paciente
pacientesRouter.put('/:id', actualizarPaciente);

// DELETE /api/pacientes/:id - Eliminar paciente
pacientesRouter.delete('/:id', eliminarPaciente);
