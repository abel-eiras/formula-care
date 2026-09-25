import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Opciones para generar PDF
 */
export interface PDFOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
  margin?: number;
}

/**
 * Muestra un toast de carga.
 * El mensaje se inserta por textContent para evitar XSS si en el futuro se pasa texto de usuario.
 */
function showLoadingToast(message: string = 'Generando PDF...'): () => void {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-[9999] flex items-center gap-2';
  const spinner = document.createElement('div');
  spinner.className = 'animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent';
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(spinner);
  toast.appendChild(text);
  document.body.appendChild(toast);

  return () => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  };
}

/**
 * Crea el PDF de un elemento HTML (sin descargarlo): captura el HTML
 * renderizado y lo pagina en A4. Sirve para descargarlo o enviarlo por email.
 */
export async function crearPdf(element: HTMLElement, options: PDFOptions = {}): Promise<jsPDF> {
  const {
    format = 'a4',
    orientation = 'portrait',
    quality = 2,
    margin = 5,
  } = options;

  const removeToast = showLoadingToast();

  try {
    // Esperar un momento para que los estilos se apliquen
    await new Promise(resolve => setTimeout(resolve, 200));

    // Dimensiones del PDF en mm
    const pageWidth = format === 'a4' ? 210 : 216;
    const pageHeight = format === 'a4' ? 297 : 279;
    const marginMm = margin;
    const contentWidth = pageWidth - marginMm * 2;
    const contentHeight = pageHeight - marginMm * 2;

    // Crear el PDF
    const pdf = new jsPDF({
      orientation: orientation === 'portrait' ? 'p' : 'l',
      unit: 'mm',
      format: format,
    });

    // Calcular el ancho del elemento en píxeles para A4 (aprox 794px a 96dpi para 210mm)
    const targetWidthPx = Math.round((contentWidth / 25.4) * 96 * quality);
    
    // Capturar el elemento completo con alta calidad
    const canvas = await html2canvas(element, {
      scale: quality,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      allowTaint: true,
    });

    // JPEG en lugar de PNG: el PDF pesa mucho menos (importante para enviarlo por email)
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Altura disponible por página en la misma escala que la imagen
    const pageContentHeightScaled = contentHeight;
    
    // Número de páginas necesarias
    const totalPages = Math.ceil(imgHeight / pageContentHeightScaled);

    // Generar cada página
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Calcular la posición Y para esta página
      // La imagen se posiciona de forma que la parte correcta sea visible
      const yPosition = marginMm - (page * pageContentHeightScaled);

      // Agregar la imagen completa, pero desplazada para mostrar la sección correcta
      pdf.addImage(
        imgData,
        'JPEG',
        marginMm,
        yPosition,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
    }

    removeToast();
    return pdf;
  } catch (error) {
    removeToast();
    console.error('Error al generar PDF:', error);
    throw new Error('Error al generar el PDF. Prueba con el botón Imprimir y elige «Guardar como PDF».');
  }
}
