import { Router } from 'express';
import {
  obtenerPacientes,
  obtenerPaciente,
  obtenerMedicionesPaciente,
  crearPaciente,
  actualizarPaciente,
  eliminarPaciente,
} from '../controllers/pacientes.js';
import { exportarPaciente, listarRetencionVencida, registrarConsentimiento } from '../controllers/rgpd.js';

export const pacientesRouter = Router();

// GET /api/pacientes - Obtener todos los pacientes
pacientesRouter.get('/', obtenerPacientes);

// Protección de datos (antes de /:id para que "retencion" no se tome como id)
pacientesRouter.get('/retencion', listarRetencionVencida);
pacientesRouter.post('/:id/consentimiento', registrarConsentimiento);
pacientesRouter.get('/:id/exportar', exportarPaciente);
pacientesRouter.post('/:id/exportar', exportarPaciente);

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
