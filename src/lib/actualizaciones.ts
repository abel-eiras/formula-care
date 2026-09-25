import { invoke, isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type { Update };

/**
 * Consulta si hay una versión nueva publicada en GitHub. Devuelve null si no
 * la hay o si no se puede comprobar (sin internet, fuera de la app de
 * escritorio…): quien llama decide si eso merece un aviso.
 */
export async function buscarActualizacion(): Promise<Update | null> {
  if (!isTauri()) return null;
  return check();
}

/**
 * Descarga e instala la actualización y reinicia la app.
 *
 * El backend se para después de descargar (así, si la descarga falla, la app
 * sigue funcionando) y justo antes de instalar. En Windows el instalador
 * cierra la app y la vuelve a abrir él mismo; en macOS y Linux la reiniciamos.
 */
export async function instalarActualizacion(
  actualizacion: Update,
  alProgresar: (porcentaje: number | null) => void
): Promise<void> {
  let total = 0;
  let descargado = 0;
  await actualizacion.download((evento) => {
    if (evento.event === "Started") {
      total = evento.data.contentLength ?? 0;
      alProgresar(total ? 0 : null);
    } else if (evento.event === "Progress") {
      descargado += evento.data.chunkLength;
      alProgresar(total ? Math.min(100, Math.round((descargado / total) * 100)) : null);
    }
  });

  await invoke("detener_backend");
  try {
    await actualizacion.install();
  } finally {
    // Tanto si ha ido bien como si no, reiniciar: con el backend parado la
    // app no puede seguir funcionando, y al reiniciar arranca uno nuevo.
    await relaunch();
  }
}
