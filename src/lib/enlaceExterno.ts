import { isTauri } from "@tauri-apps/api/core";

/**
 * Abre un enlace externo (WhatsApp, web...) en el navegador del sistema.
 * En la app de escritorio el webview no abre ventanas externas con
 * window.open, así que se delega en el plugin shell de Tauri (permiso
 * "shell:allow-open", que solo admite http(s), mailto y tel).
 */
export async function abrirEnlaceExterno(url: string): Promise<void> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}
