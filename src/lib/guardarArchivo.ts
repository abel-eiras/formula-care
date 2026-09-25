import { isTauri } from "@tauri-apps/api/core";

/**
 * Guarda un fichero generado por el servidor donde elija el usuario.
 * En la app de escritorio el webview no descarga ficheros: se abre el diálogo
 * "Guardar como" y el servidor local escribe el fichero en esa ruta. En un
 * navegador (desarrollo), se descarga con un enlace temporal.
 * Devuelve la ruta elegida, o null si se canceló.
 */
export async function guardarArchivo(opciones: {
  nombreSugerido: string;
  extension: string;
  descripcion: string;
  /** Escribe el fichero en la ruta elegida (app de escritorio) */
  escribirEn: (ruta: string) => Promise<unknown>;
  /** Obtiene el contenido para descargarlo (navegador) */
  obtenerContenido: () => Promise<string | Blob>;
}): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const ruta = await save({
      defaultPath: opciones.nombreSugerido,
      filters: [{ name: opciones.descripcion, extensions: [opciones.extension] }],
    });
    if (!ruta) return null;
    await opciones.escribirEn(ruta);
    return ruta;
  }
  const contenido = await opciones.obtenerContenido();
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const enlace = Object.assign(document.createElement("a"), { href: url, download: opciones.nombreSugerido });
  enlace.click();
  URL.revokeObjectURL(url);
  return opciones.nombreSugerido;
}

/** Nombre de fichero seguro a partir de un texto ("María López" → "maria-lopez") */
export function nombreFichero(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
