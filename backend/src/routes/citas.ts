import { Router } from 'express';
import { obtenerCitas, obtenerCita, crearCita, actualizarCita, eliminarCita } from '../controllers/citas.js';

export const citasRouter = Router();

// GET /api/citas - Obtener citas (con filtro de fecha opcional)
citasRouter.get('/', obtenerCitas);

// GET /api/citas/:id - Obtener una cita específica
citasRouter.get('/:id', obtenerCita);

// POST /api/citas - Crear nueva cita
citasRouter.post('/', crearCita);

// PUT /api/citas/:id - Actualizar cita
citasRouter.put('/:id', actualizarCita);

// DELETE /api/citas/:id - Eliminar cita
citasRouter.delete('/:id', eliminarCita);
