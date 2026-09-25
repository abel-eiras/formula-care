import { isTauri } from "@tauri-apps/api/core";
import { api } from "@/lib/api";
import { hoyISO } from "@/lib/fechas";
import { nombreFichero } from "@/lib/guardarArchivo";

/**
 * Informes en PDF a partir de las vistas de impresión (/servicios/.../print):
 * se cargan en un iframe oculto, se capturan y se convierten a PDF para
 * guardarlos o enviarlos por email al paciente.
 */

const cargarGenerador = () => import("@/lib/pdfGenerator");
const TIEMPO_MAXIMO_MS = 15_000;

/** Espera a que la vista de impresión tenga contenido y devuelve su elemento principal */
async function cargarVista(ruta: string): Promise<{ elemento: HTMLElement; quitar: () => void }> {
  const marco = document.createElement("iframe");
  Object.assign(marco.style, { position: "fixed", left: "-10000px", top: "0", width: "210mm", height: "297mm", border: "0" });
  // La vista no lanza el diálogo de impresión si sabe que es para un PDF
  sessionStorage.setItem("pdfDownload", "true");
  const quitar = () => {
    marco.remove();
    sessionStorage.removeItem("pdfDownload");
  };
  marco.src = ruta;
  document.body.appendChild(marco);

  const inicio = Date.now();
  while (Date.now() - inicio < TIEMPO_MAXIMO_MS) {
    await new Promise((r) => setTimeout(r, 250));
    const elemento = marco.contentDocument?.querySelector<HTMLElement>(".print-page");
    // Hay datos cuando la vista ya no muestra el indicador de carga
    if (elemento && !elemento.querySelector(".animate-spin") && elemento.innerText.trim().length > 50) {
      await new Promise((r) => setTimeout(r, 600)); // gráficas y fuentes
      return { elemento, quitar };
    }
  }
  quitar();
  throw new Error("No se ha podido preparar el informe");
}

/** PDF (en base64) de una vista de impresión */
export async function pdfDeVista(ruta: string): Promise<string> {
  const [{ crearPdf }, { elemento, quitar }] = await Promise.all([cargarGenerador(), cargarVista(ruta)]);
  try {
    const pdf = await crearPdf(elemento, { quality: 2, format: "a4", margin: 10 });
    return pdf.output("datauristring").split(",")[1];
  } finally {
    quitar();
  }
}

/**
 * Guarda el informe donde elija el usuario. En la app de escritorio, con el
 * diálogo "Guardar como" (el webview no descarga ficheros); en el navegador,
 * como descarga normal. Devuelve la ruta o null si se canceló.
 */
export async function guardarInforme(ruta: string, nombreFichero: string): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const destino = await save({ defaultPath: nombreFichero, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!destino) return null;
    const pdf = await pdfDeVista(ruta);
    const { ruta: final } = await api.post<{ ruta: string }>("/informes/guardar", { destino, pdf });
    return final;
  }
  const pdf = await pdfDeVista(ruta);
  const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  Object.assign(document.createElement("a"), { href: url, download: nombreFichero }).click();
  URL.revokeObjectURL(url);
  return nombreFichero;
}

/** Envía el informe por email al paciente (devuelve el mensaje del servidor) */
export async function enviarInformePorEmail(datos: {
  ruta: string;
  pacienteId: string;
  titulo: string;
  nombreFichero: string;
}): Promise<string> {
  const pdf = await pdfDeVista(datos.ruta);
  const { mensaje } = await api.post<{ mensaje: string }>("/informes/enviar", {
    pacienteId: datos.pacienteId,
    titulo: datos.titulo,
    nombreFichero: datos.nombreFichero,
    pdf,
  });
  return mensaje;
}

/** Nombre del PDF sin tildes ni espacios (también se usa como adjunto del email) */
export function nombreInforme(servicio: "dermo" | "bio" | "nutricion", pacienteNombre?: string, fecha?: string): string {
  const paciente = pacienteNombre ? nombreFichero(pacienteNombre).replace(/-/g, "_") : "paciente";
  return `informe_${servicio}_${paciente}_${fecha ? fecha.slice(0, 10) : hoyISO()}.pdf`;
}
