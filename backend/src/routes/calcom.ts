import { Router } from 'express';
import { recibirWebhook } from '../controllers/calcom.js';

export const calcomRouter = Router();

// Webhook de Cal.com (sin autenticación por ahora, se verifica con firma)
calcomRouter.post('/webhook', recibirWebhook);
