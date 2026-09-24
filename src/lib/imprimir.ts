/**
 * Imprime una de las vistas de impresión (/servicios/.../print) sin abrir
 * pestañas: el webview de la app de escritorio no abre ventanas nuevas con
 * window.open. La vista se carga en un iframe fuera de pantalla y ella misma
 * lanza window.print() al tener los datos, que imprime solo el iframe.
 */
const ID_MARCO = "marco-impresion";

export function imprimirRuta(ruta: string): void {
  document.getElementById(ID_MARCO)?.remove();

  const marco = document.createElement("iframe");
  marco.id = ID_MARCO;
  marco.title = "Vista de impresión";
  marco.setAttribute("aria-hidden", "true");
  // Tamaño A4 real (no 0×0) para que tablas y gráficas se maqueten bien
  Object.assign(marco.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "210mm",
    height: "297mm",
    border: "0",
  });
  marco.addEventListener("load", () => {
    marco.contentWindow?.addEventListener("afterprint", () => setTimeout(() => marco.remove(), 0));
  });
  marco.src = ruta;
  document.body.appendChild(marco);
}
