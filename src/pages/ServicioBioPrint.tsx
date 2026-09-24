import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalisisBio } from "@/hooks/useAnalisisBio";
import { usePacientes } from "@/hooks/usePacientes";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { getColoresParaConfig } from "@/lib/coloresMarca";

/**
 * Formatea una fecha ISO a formato dd/mm/aaaa
 */
const formatearFechaPrint = (fecha: string): string => {
  if (!fecha) return "";
  try {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const año = date.getFullYear();
    return `${dia} / ${mes} / ${año}`;
  } catch {
    return fecha;
  }
};

export default function ServicioBioPrint() {
  const [searchParams] = useSearchParams();
  const analisisId = searchParams.get("id");
  const { data: analisis } = useAnalisisBio(analisisId || undefined);
  const { data: pacientes = [] } = usePacientes();
  const { data: config } = useConfiguracion();

  const nombreFarmacia = config?.farmaciaNombre || 'Farmacia';
  const direccionFarmacia = config?.farmaciaDireccion || '';
  const ciudadFarmacia = config?.farmaciaCiudad || '';
  const telefonoFarmacia = config?.farmaciaTelefono || '';
  const logoUrl = config?.farmaciaLogo || "/logo.png";

  const paciente = analisis?.pacienteId
    ? pacientes.find((p) => p.id === analisis.pacienteId)
    : null;

  const colores = getColoresParaConfig(config);

  // Auto-imprimir cuando se carga la página (solo si viene de la opción de imprimir)
  useEffect(() => {
    if (analisis) {
      // Solo auto-imprimir si no viene de una descarga de PDF
      const isPDFDownload = sessionStorage.getItem('pdfDownload');
      if (!isPDFDownload) {
        // Pequeño delay para asegurar que todo se renderice
        setTimeout(() => {
          window.print();
        }, 500);
      } else {
        // Limpiar la bandera
        sessionStorage.removeItem('pdfDownload');
      }
    }
  }, [analisis]);

  if (!analisis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando análisis...</p>
      </div>
    );
  }

  return (
    <div className="print-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&display=swap');
        
        .print-page {
          font-family: 'Montserrat', sans-serif;
          background-color: ${colores.fondo ?? "#f3f4f6"};
          color: ${colores.texto ?? "#333333"};
          padding: 20px;
          min-height: 100vh;
        }

        .page-container {
          max-width: 850px;
          margin: 0 auto;
          background: white;
          padding: 40px 50px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .logo-img {
          max-height: 70px;
          width: auto;
          display: block;
        }

        .header-title {
          text-align: right;
          color: ${colores.primario};
        }

        .header-title h1 {
          font-size: 2.2rem;
          font-weight: 300;
          line-height: 1;
        }

        .section-header {
          color: white;
          background-color: ${colores.secundario};
          font-weight: 600;
          font-size: 0.9rem;
          padding: 6px 15px;
          margin-top: 25px;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 2px;
        }

        .block-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: ${colores.primario};
          text-transform: uppercase;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid ${colores.linea ?? colores.primario};
        }

        .param-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .param-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #333;
        }

        .param-value {
          font-size: 0.9rem;
          color: #555;
          min-width: 100px;
          text-align: right;
        }

        .param-unit {
          font-size: 0.75rem;
          color: #999;
          margin-left: 4px;
        }

        .accent-box {
          background-color: #f0f5f7;
          border-left: 4px solid ${colores.secundario};
          padding: 15px;
        }

        .print-textarea {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 0;
          min-height: 40px;
        }

        .grid-2cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .footer-line {
          border-top: 1px solid ${colores.linea ?? colores.primario};
          margin-top: 40px;
          padding-top: 15px;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #555;
        }

        @media print {
          body { 
            background: white; 
            padding: 0; 
          }
          .print-page {
            background: white;
            padding: 0;
          }
          .page-container { 
            box-shadow: none; 
            width: 100%; 
            max-width: none; 
            padding: 30px; 
          }
          .section-header { 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="page-container">
        {/* Encabezado con Logo */}
        <div className="flex justify-between items-center mb-8">
          <div className="logo-container">
            <img
              src={logoUrl}
              alt={`${nombreFarmacia} Logo`}
              className="logo-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "block";
              }}
            />
            <div style={{ display: "none" }} className="brand-text">
              <div
                style={{
                  color: colores.primario,
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  textTransform: "uppercase",
                }}
              >
                {nombreFarmacia}
              </div>
            </div>
          </div>
          <div className="header-title">
            <h1>
              Análisis<br />
              <strong>Bioquímico</strong>
            </h1>
          </div>
        </div>

        {/* Datos de Usuario */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Nombre</label>
            <div className="text-sm">{paciente?.name || ""}</div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Teléfono</label>
            <div className="text-sm">{paciente?.phone || ""}</div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Email</label>
            <div className="text-sm">{paciente?.email || ""}</div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Fecha</label>
            <div className="text-sm">{formatearFechaPrint(analisis.fecha)}</div>
          </div>
        </div>

        {/* Parámetros Básicos - Siempre visible */}
        <div className="section-header">Parámetros Básicos</div>
        <div className="space-y-2 mb-6">
          <div className="param-row">
            <span className="param-label">Glucemia</span>
            <span className="param-value">
              {analisis.glucemia ?? ""}
              {analisis.glucemia != null ? (
                <span className="param-unit">mg/dL</span>
              ) : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Colesterol Total</span>
            <span className="param-value">
              {analisis.cholesterol || ""}
              {analisis.cholesterol != null ? <span className="param-unit">mg/dL</span> : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Colesterol HDL</span>
            <span className="param-value">
              {analisis.cholesterolHDL || ""}
              {analisis.cholesterolHDL != null ? <span className="param-unit">mg/dL</span> : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Colesterol LDL</span>
            <span className="param-value">
              {analisis.cholesterolLDL || ""}
              {analisis.cholesterolLDL != null ? <span className="param-unit">mg/dL</span> : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Triglicéridos</span>
            <span className="param-value">
              {analisis.triglycerides || ""}
              {analisis.triglycerides != null ? <span className="param-unit">mg/dL</span> : null}
            </span>
          </div>
        </div>

        {/* Parámetros Avanzados - Siempre visible */}
        <div className="section-header">Parámetros Avanzados</div>
        <div className="space-y-2 mb-6">
          <div className="param-row">
            <span className="param-label">Hemoglobina Glucosilada (HbA1c)</span>
            <span className="param-value">
              {analisis.hemoglobinaGlucosilada || ""}
              {analisis.hemoglobinaGlucosilada != null ? <span className="param-unit">%</span> : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Proteína C Reactiva (PCR)</span>
            <span className="param-value">
              {analisis.proteinaCReactiva || ""}
              {analisis.proteinaCReactiva != null ? <span className="param-unit">mg/L</span> : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Vitamina D</span>
            <span className="param-value">
              {analisis.vitaminaD || ""}
              {analisis.vitaminaD != null ? <span className="param-unit">ng/mL</span> : null}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">Ferritina</span>
            <span className="param-value">
              {analisis.ferritina || ""}
              {analisis.ferritina != null ? <span className="param-unit">ng/mL</span> : null}
            </span>
          </div>
        </div>

        {/* Tensión Arterial y Pulsaciones - Siempre visible */}
        <div className="section-header">Tensión Arterial y Pulsaciones</div>
        <div className="grid-2cols mb-6">
          <div className="space-y-2">
            <div className="param-row">
              <span className="param-label">Sistólica</span>
              <span className="param-value">
                {analisis.systolic || ""}
                {analisis.systolic != null ? <span className="param-unit">mmHg</span> : null}
              </span>
            </div>
            <div className="param-row">
              <span className="param-label">Diastólica</span>
              <span className="param-value">
                {analisis.diastolic || ""}
                {analisis.diastolic != null ? <span className="param-unit">mmHg</span> : null}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="param-row">
              <span className="param-label">Pulsaciones</span>
              <span className="param-value">
                {analisis.pulsaciones || ""}
                {analisis.pulsaciones != null ? <span className="param-unit">lpm</span> : null}
              </span>
            </div>
          </div>
        </div>

        {/* Medidas Corporales - Siempre visible */}
        <div className="section-header">Medidas Corporales</div>
        <div className="grid-2cols mb-6">
          <div className="space-y-2">
            <div className="param-row">
              <span className="param-label">Peso</span>
              <span className="param-value">
                {analisis.peso || ""}
                {analisis.peso != null ? <span className="param-unit">kg</span> : null}
              </span>
            </div>
            <div className="param-row">
              <span className="param-label">Altura</span>
              <span className="param-value">
                {analisis.altura || ""}
                {analisis.altura != null ? <span className="param-unit">cm</span> : null}
              </span>
            </div>
            {analisis.cintura != null && (
              <div className="param-row">
                <span className="param-label">Perímetro abdominal</span>
                <span className="param-value">
                  {analisis.cintura}
                  <span className="param-unit">cm</span>
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="param-row">
              <span className="param-label">Índice de Masa Corporal (IMC)</span>
              <span className="param-value">
                {analisis.imc || ""}
                {analisis.imc != null ? <span className="param-unit">kg/m²</span> : null}
              </span>
            </div>
            {analisis.imc && (
              <div className="param-row">
                <span className="param-label">Clasificación IMC</span>
                <span className="param-value">
                  {analisis.imc < 18.5
                    ? "Bajo peso"
                    : analisis.imc < 25
                    ? "Normal"
                    : analisis.imc < 30
                    ? "Sobrepeso"
                    : "Obesidad"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Observaciones - Siempre visible */}
        <div className="section-header">Observaciones</div>
        <div className="accent-box mb-4">
          <div className="text-sm whitespace-pre-wrap" style={{ minHeight: "44px" }}>
            {analisis.observaciones || "—"}
          </div>
        </div>

        {/* Recomendaciones - Apartado destacado como en informe dermocosmético */}
        <div className="section-header">Recomendaciones</div>
        <div className="accent-box mb-6">
          <div className="text-sm whitespace-pre-wrap" style={{ minHeight: "60px" }}>
            {analisis.recomendaciones || "—"}
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="footer-line">
          <div>
            <strong style={{ color: colores.primario }}>{nombreFarmacia}</strong>
            <br />
            {direccionFarmacia}
            <br />
            {ciudadFarmacia}
          </div>
          <div className="text-right">
            {telefonoFarmacia && <>Tlf. {telefonoFarmacia}<br /></>}
            {config?.farmaciaEmail && <>{config.farmaciaEmail}<br /></>}
            {config?.farmaciaWeb && <>{config.farmaciaWeb}</>}
          </div>
        </div>
      </div>
    </div>
  );
}
