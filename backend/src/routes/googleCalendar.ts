import { Router } from 'express';
import {
  iniciarOAuth,
  callbackOAuth,
  obtenerEstado,
  listarCalendarios,
  configurarCalendario,
  desconectar,
} from '../controllers/googleCalendar.js';

export const googleCalendarRouter = Router();

googleCalendarRouter.get('/auth', iniciarOAuth);
googleCalendarRouter.get('/callback', callbackOAuth);
googleCalendarRouter.get('/estado', obtenerEstado);
googleCalendarRouter.get('/calendarios', listarCalendarios);
googleCalendarRouter.post('/calendario', configurarCalendario);
googleCalendarRouter.post('/desconectar', desconectar);
