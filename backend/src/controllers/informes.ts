import { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { enviarInformePaciente } from '../services/emailService.js';

/** PDF en base64 (sin la cabecera data:) y con un tamaño razonable */
const pdfBase64 = z
  .string()
  .transform((s) => s.replace(/^data:application\/pdf;[^,]*,/, ''))
  .refine((s) => /^[A-Za-z0-9+/=\s]+$/.test(s), 'PDF no válido')
  .refine((s) => s.length < 20 * 1024 * 1024, 'El informe es demasiado grande');

function aBuffer(base64: string): Buffer {
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new z.ZodError([{ code: 'custom', path: ['pdf'], message: 'PDF no válido' }]);
  return buffer;
}

/**
 * Envía a un paciente, por email, el informe en PDF de un servicio
 * POST /api/informes/enviar
 */
export async function enviarInforme(req: Request, res: Response) {
  try {
    const datos = z
      .object({
        pacienteId: z.string().min(1),
        titulo: z.string().trim().min(1).max(150),
        nombreFichero: z.string().trim().regex(/^[\w.-]+\.pdf$/i, 'Nombre de fichero no válido'),
        pdf: pdfBase64,
      })
      .parse(req.body);

    const paciente = await prisma.paciente.findUnique({
      where: { id: datos.pacienteId },
      select: { name: true, email: true },
    });
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    if (!paciente.email) return res.status(400).json({ error: 'El paciente no tiene email' });

    const ok = await enviarInformePaciente(paciente.email, {
      nombreCliente: paciente.name,
      tituloInforme: datos.titulo,
      adjunto: { nombre: datos.nombreFichero, contenido: aBuffer(datos.pdf) },
    });
    if (!ok) {
      return res.status(502).json({ error: 'No se ha podido enviar el email. Revisa la configuración de correo.' });
    }
    res.json({ mensaje: `Informe enviado a ${paciente.email}` });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0]?.message ?? 'Datos no válidos' });
    console.error('Error al enviar el informe:', error);
    res.status(500).json({ error: 'Error al enviar el informe' });
  }
}

/**
 * Guarda un PDF generado en la app donde elija el usuario (el webview de
 * escritorio no descarga ficheros)
 * POST /api/informes/guardar
 */
export async function guardarPdf(req: Request, res: Response) {
  try {
    const { destino, pdf } = z
      .object({ destino: z.string().refine((d) => path.isAbsolute(d), 'Ruta no válida'), pdf: pdfBase64 })
      .parse(req.body);
    const final = destino.toLowerCase().endsWith('.pdf') ? destino : `${destino}.pdf`;
    fs.writeFileSync(final, aBuffer(pdf));
    res.json({ ruta: final });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0]?.message ?? 'Datos no válidos' });
    console.error('Error al guardar el PDF:', error);
    res.status(500).json({ error: `No se pudo guardar el PDF: ${(error as Error).message}` });
  }
}
