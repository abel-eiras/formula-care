import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalisisDermo } from "@/hooks/useAnalisisDermo";
import { usePacientes } from "@/hooks/usePacientes";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { getColoresParaConfig } from "@/lib/coloresMarca";

// Opciones de valoración de la piel
const VALORACION_PIEL_LABELS: Record<string, string> = {
  piel_grasa: "Piel grasa",
  flacidez: "Flacidez",
  sensibilidad_rojeces: "Sensibilidad / Rojeces",
  piel_seca: "Piel seca",
  arrugas: "Arrugas",
  pigmentacion_manchas: "Pigmentación / Manchas",
  piel_mixta: "Piel mixta",
  falta_elasticidad: "Falta de elasticidad",
  poros_abiertos: "Poros abiertos",
  piel_deshidratada: "Piel deshidratada",
};

const HABITOS_LABELS: Record<string, string> = {
  sueño_irregular: "Sueño irregular",
  estrés: "Estrés",
  problemas_digestivos: "Problemas digestivos",
  ejercicio: "Ejercicio",
  dieta_equilibrada: "Dieta equilibrada",
  tabaco_alcohol: "Tabaco / Alcohol",
};

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

export default function ServicioDermoPrint() {
  const [searchParams] = useSearchParams();
  const analisisId = searchParams.get("id");
  const { data: analisis } = useAnalisisDermo(analisisId || undefined);
  const { data: pacientes = [] } = usePacientes();
  const { data: config } = useConfiguracion();

  const nombreFarmacia = config?.farmaciaNombre || 'Farmacia';
  const direccionFarmacia = config?.farmaciaDireccion || '';
  const ciudadFarmacia = config?.farmaciaCiudad || '';
  const telefonoFarmacia = config?.farmaciaTelefono || '';
  const logoUrl = config?.farmaciaLogo
    ? (config.farmaciaLogo.startsWith("data:") ? config.farmaciaLogo : `/microcaya/${config.farmaciaLogo}`)
    : "/logo.png";

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

        .grid-checks {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px 20px;
        }

        .check-item {
          display: flex;
          align-items: center;
          font-size: 0.85rem;
          position: relative;
          padding-left: 26px;
          min-height: 20px;
        }

        .checkmark {
          position: absolute;
          top: 2px;
          left: 0;
          height: 18px;
          width: 18px;
          border: 1.5px solid ${colores.primario};
          background-color: transparent;
          border-radius: 2px;
        }

        .check-item.checked .checkmark {
          background-color: ${colores.primario};
        }

        .check-item.checked .checkmark:after {
          content: "";
          position: absolute;
          display: block;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .routine-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .routine-title {
          background-color: ${colores.primario};
          color: white;
          text-align: center;
          padding: 8px;
          font-size: 0.9rem;
          font-weight: 400;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .step-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: ${colores.secundario};
          text-transform: uppercase;
          display: block;
          margin-top: 10px;
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

        .signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
        }

        .accent-box {
          background-color: #f0f5f7;
          border-left: 4px solid ${colores.secundario};
          padding: 15px;
        }

        .print-field {
          width: 100%;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          outline: none;
          background: transparent;
          padding: 2px 0;
          font-size: 0.9rem;
        }

        .print-textarea {
          width: 100%;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          outline: none;
          background: transparent;
          padding: 2px 0;
          font-size: 0.9rem;
          resize: none;
          min-height: 20px;
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
          .checkmark { 
            border: 1.5px solid ${colores.primario} !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .check-item.checked .checkmark { 
            background-color: ${colores.primario} !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .routine-title, .section-header { 
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
              Consulta<br />
              <strong>dermocosmética</strong>
            </h1>
          </div>
        </div>

        {/* Datos de Usuario */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Nombre</label>
            <div className="print-field">{paciente?.name || ""}</div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Teléfono</label>
            <div className="print-field">{paciente?.phone || ""}</div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Email</label>
            <div className="print-field">{paciente?.email || ""}</div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-gray-400">Fecha</label>
            <div className="print-field">{formatearFechaPrint(analisis.fecha)}</div>
          </div>
        </div>

        {/* Motivo de consulta - Siempre visible */}
        <div className="mb-6">
          <label className="text-[10px] font-bold uppercase text-gray-400">
            Motivo / Objetivo de la consulta:
          </label>
          <div className="print-textarea whitespace-pre-wrap">{analisis.motivoConsulta || ""}</div>
        </div>

        {/* Valoración de la piel - Siempre visible */}
        <div className="section-header">Valoración de la piel</div>
        <div className="grid-checks mb-6">
          {Object.keys(VALORACION_PIEL_LABELS).map((valor) => {
            const isChecked = analisis.valoracionPiel?.includes(valor) || false;
            return (
              <div key={valor} className={`check-item ${isChecked ? "checked" : ""}`}>
                <span className="checkmark"></span>
                <span>{VALORACION_PIEL_LABELS[valor]}</span>
              </div>
            );
          })}
        </div>

        {/* Hábitos y Salud - Siempre visible */}
        <div className="section-header">Hábitos y Salud</div>
        <div className="grid-checks mb-6">
          {Object.keys(HABITOS_LABELS).map((habito) => {
            const isChecked = analisis.habitos?.includes(habito) || false;
            return (
              <div key={habito} className={`check-item ${isChecked ? "checked" : ""}`}>
                <span className="checkmark"></span>
                <span>{HABITOS_LABELS[habito]}</span>
              </div>
            );
          })}
        </div>

        {/* Medicación, Patologías, Etapa Hormonal - Siempre visible */}
        <div className="grid grid-cols-2 gap-x-8 mb-6">
          <div>
            <label className="step-label">Medicación habitual</label>
            <div className="print-textarea whitespace-pre-wrap">{analisis.medicacionHabitual || ""}</div>
          </div>
          <div>
            <label className="step-label">Patologías</label>
            <div className="print-textarea whitespace-pre-wrap">{analisis.patologias || ""}</div>
          </div>
          <div className="col-span-2">
            <label className="step-label">Mujer - Etapa Hormonal</label>
            <div className="print-textarea whitespace-pre-wrap">{analisis.etapaHormonal || ""}</div>
          </div>
        </div>

        {/* Pauta Dermocosmética - Siempre visible */}
        <div className="section-header">Pauta Dermocosmética</div>

        <div className="routine-grid">
          {/* Rutina de Día - Siempre visible */}
          <div>
            <div className="routine-title">Rutina de Día</div>
            <div>
              <label className="step-label">1. Higiene</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaDia?.higiene || ""}</div>
            </div>
            <div>
              <label className="step-label">2. Contorno de ojos</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaDia?.contornoOjos || ""}</div>
            </div>
            <div>
              <label className="step-label">3. Producto intensivo</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaDia?.productoIntensivo || ""}</div>
            </div>
            <div>
              <label className="step-label">4. Hidratación</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaDia?.hidratacion || ""}</div>
            </div>
            <div>
              <label className="step-label">5. Protección Solar</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaDia?.proteccionSolar || ""}</div>
            </div>
          </div>

          {/* Rutina de Noche - Siempre visible */}
          <div>
            <div className="routine-title">Rutina de Noche</div>
            <div>
              <label className="step-label">1. Limpieza / Doble Limpieza</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaNoche?.limpieza || ""}</div>
            </div>
            <div>
              <label className="step-label">2. Contorno de ojos</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaNoche?.contornoOjos || ""}</div>
            </div>
            <div>
              <label className="step-label">3. Producto intensivo</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaNoche?.productoIntensivo || ""}</div>
            </div>
            <div>
              <label className="step-label">4. Hidratación</label>
              <div className="print-textarea whitespace-pre-wrap">{analisis.rutinaNoche?.hidratacion || ""}</div>
            </div>
          </div>
        </div>

        {/* Cuidados Semanales y Suplementación - Siempre visible */}
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div className="accent-box">
            <div className="text-[10px] font-bold uppercase mb-2" style={{ color: colores.secundario }}>Cuidados Semanales</div>
            <div>
              <label className="step-label" style={{ color: colores.primario }}>
                Exfoliante
              </label>
              <div className="print-textarea whitespace-pre-wrap" style={{ borderBottomColor: colores.secundario }}>
                {analisis.cuidadosSemanales?.exfoliante || ""}
              </div>
            </div>
            <div>
              <label className="step-label" style={{ color: colores.primario }}>
                Mascarilla
              </label>
              <div className="print-textarea whitespace-pre-wrap" style={{ borderBottomColor: colores.secundario }}>
                {analisis.cuidadosSemanales?.mascarilla || ""}
              </div>
            </div>
          </div>
          <div className="accent-box">
            <div className="text-[10px] font-bold uppercase mb-2" style={{ color: colores.secundario }}>Suplementación oral</div>
            <div className="print-textarea whitespace-pre-wrap italic" style={{ minHeight: "120px" }}>
              {analisis.suplementacionOral || ""}
            </div>
          </div>
        </div>

        {/* Firmas - Siempre visible */}
        <div className="signature-area text-sm">
          <div className="flex items-center">
            <span className="font-semibold uppercase text-xs mr-2" style={{ color: colores.primario }}>Próxima Revisión:</span>
            <div className="print-field" style={{ width: "75%" }}>
              {analisis.proximaRevision ? formatearFechaPrint(analisis.proximaRevision) : ""}
            </div>
          </div>
          <div className="text-right">
            <span className="font-semibold uppercase text-xs" style={{ color: colores.primario }}>Farmacéutico/a:</span>
            <div className="print-field" style={{ width: "75%" }}>
              {analisis.farmaceutico || ""}
            </div>
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
