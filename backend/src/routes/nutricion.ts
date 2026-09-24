import { Router } from 'express';
import {
  obtenerProgramas,
  obtenerPrograma,
  crearPrograma,
  actualizarPrograma,
  obtenerVisita,
  crearVisita,
  actualizarVisita,
  eliminarVisita,
  crearRegistro,
  actualizarRegistro,
  eliminarRegistro,
} from '../controllers/nutricion.js';

export const nutricionRouter = Router();

// Programas (un proceso de nutrición por paciente)
nutricionRouter.get('/programas', obtenerProgramas); // ?pacienteId=
nutricionRouter.post('/programas', crearPrograma);
nutricionRouter.get('/programas/:id', obtenerPrograma);
nutricionRouter.put('/programas/:id', actualizarPrograma);

// Visitas (inicial y seguimiento)
nutricionRouter.post('/visitas', crearVisita);
nutricionRouter.get('/visitas/:id', obtenerVisita);
nutricionRouter.put('/visitas/:id', actualizarVisita);
nutricionRouter.delete('/visitas/:id', eliminarVisita);

// Registro de alimentación
nutricionRouter.post('/registros', crearRegistro);
nutricionRouter.put('/registros/:id', actualizarRegistro);
nutricionRouter.delete('/registros/:id', eliminarRegistro);
