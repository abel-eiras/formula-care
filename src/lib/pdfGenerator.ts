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
 * Muestra un toast de carga
 */
function showLoadingToast(message: string = 'Generando PDF...'): () => void {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-[9999] flex items-center gap-2';
  toast.innerHTML = `
    <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  return () => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  };
}

/**
 * Genera un PDF a partir de un elemento HTML
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const {
    filename = 'documento.pdf',
    format = 'a4',
    orientation = 'portrait',
    quality = 2, // Aumentar calidad por defecto
    margin = 10,
  } = options;

  const removeToast = showLoadingToast();

  try {
    // Esperar un momento para que los estilos se apliquen
    await new Promise(resolve => setTimeout(resolve, 100));

    // Configurar canvas con mejor calidad
    const canvas = await html2canvas(element, {
      scale: quality,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      allowTaint: false,
      removeContainer: false,
    });

    // Calcular dimensiones del PDF
    const imgWidth = format === 'a4' ? 210 : 216; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF({
      orientation: orientation === 'portrait' ? 'p' : 'l',
      unit: 'mm',
      format: format,
    });

    // Agregar márgenes
    const marginMm = margin;
    const pageHeight = format === 'a4' ? 297 : 279;
    const contentWidth = imgWidth - marginMm * 2;
    const contentHeight = (imgHeight * contentWidth) / imgWidth;
    const availableHeight = pageHeight - marginMm * 2;

    // Calcular posición inicial
    let heightLeft = contentHeight;
    let position = marginMm;
    let pageNumber = 1;

    // Agregar primera página
    pdf.addImage(
      canvas.toDataURL('image/png', 1.0),
      'PNG',
      marginMm,
      position,
      contentWidth,
      Math.min(contentHeight, availableHeight)
    );

    heightLeft -= availableHeight;

    // Agregar páginas adicionales si es necesario
    while (heightLeft > 0) {
      pdf.addPage();
      pageNumber++;
      position = -((pageNumber - 1) * availableHeight) + marginMm;
      
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0),
        'PNG',
        marginMm,
        position,
        contentWidth,
        contentHeight
      );
      
      heightLeft -= availableHeight;
    }

    // Descargar PDF
    pdf.save(filename);
    removeToast();
  } catch (error) {
    removeToast();
    console.error('Error al generar PDF:', error);
    throw new Error('Error al generar el PDF. Por favor, intenta usar la opción de impresión del navegador.');
  }
}

/**
 * Genera un PDF a partir de múltiples elementos HTML
 */
export async function generatePDFFromElements(
  elements: HTMLElement[],
  options: PDFOptions = {}
): Promise<void> {
  const {
    filename = 'documento.pdf',
    format = 'a4',
    orientation = 'portrait',
    quality = 1,
    margin = 10,
  } = options;

  try {
    const loadingToast = document.createElement('div');
    loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
    loadingToast.textContent = 'Generando PDF...';
    document.body.appendChild(loadingToast);

    const pdf = new jsPDF({
      orientation: orientation === 'portrait' ? 'p' : 'l',
      unit: 'mm',
      format: format,
    });

    const imgWidth = format === 'a4' ? 210 : 216;
    const marginMm = margin;
    const contentWidth = imgWidth - marginMm * 2;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const canvas = await html2canvas(element, {
        scale: quality,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const contentHeight = (imgHeight * contentWidth) / imgWidth;

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        canvas.toDataURL('image/png', 1.0),
        'PNG',
        marginMm,
        marginMm,
        contentWidth,
        contentHeight
      );
    }

    pdf.save(filename);
    document.body.removeChild(loadingToast);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw new Error('Error al generar el PDF.');
  }
}

/**
 * Genera un nombre de archivo para el PDF basado en el tipo de servicio y fecha
 */
export function generatePDFFilename(
  tipo: 'dermo' | 'bio',
  pacienteNombre?: string,
  fecha?: string
): string {
  const tipoLabel = tipo === 'dermo' ? 'dermo' : 'bio';
  const paciente = pacienteNombre
    ? pacienteNombre.replace(/\s+/g, '_').toLowerCase()
    : 'paciente';
  const fechaStr = fecha
    ? new Date(fecha).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return `informe_${tipoLabel}_${paciente}_${fechaStr}.pdf`;
}
