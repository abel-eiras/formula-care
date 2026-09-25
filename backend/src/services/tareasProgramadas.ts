import { verificarYEjecutarBackupProgramado } from './backupService.js';
import { generarAvisosCumpleanos } from './cumpleanosService.js';
import { enviarRecordatoriosCitas, generarAvisosRevisiones } from './notificacionesService.js';
import { podarRegistroAccesos } from './registroAccesos.js';

/**
 * Tareas periódicas de la app de escritorio. Se ejecutan al arrancar (por si
 * la app llevaba tiempo cerrada) y cada hora mientras esté abierta. Cada una
 * es idempotente y un fallo en una no impide las demás.
 */
const TAREAS: { nombre: string; ejecutar: () => Promise<unknown> }[] = [
  { nombre: 'copia de seguridad', ejecutar: verificarYEjecutarBackupProgramado },
  { nombre: 'avisos de cumpleaños', ejecutar: generarAvisosCumpleanos },
  { nombre: 'avisos de revisiones', ejecutar: generarAvisosRevisiones },
  { nombre: 'recordatorios de citas', ejecutar: enviarRecordatoriosCitas },
  { nombre: 'limpieza del registro de accesos', ejecutar: podarRegistroAccesos },
];

const INTERVALO_MS = 60 * 60 * 1000;

export async function ejecutarTareasPeriodicas(): Promise<void> {
  for (const tarea of TAREAS) {
    try {
      await tarea.ejecutar();
    } catch (error) {
      console.error(`Error en la tarea periódica "${tarea.nombre}":`, error);
    }
  }
}

export function iniciarTareasPeriodicas(): void {
  void ejecutarTareasPeriodicas();
  setInterval(() => void ejecutarTareasPeriodicas(), INTERVALO_MS);
}
