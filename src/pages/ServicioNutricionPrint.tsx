import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { usePacientes } from "@/hooks/usePacientes";
import { useProgramaNutricion, useVisitaNutricion } from "@/hooks/useNutricion";
import { getColoresParaConfig } from "@/lib/coloresMarca";
import {
  CALIDAD_SUENO,
  CANTIDADES,
  CAUSAS_PICOTEO,
  COMPANIAS,
  EFECTOS_SECUNDARIOS,
  etiqueta,
  FARMACOS_GLP1,
  LUGARES,
  MOMENTOS_COMIDA,
  NIVEL_ESTRES,
  SENSACIONES,
  TIPOS_EJERCICIO,
  etiquetas,
} from "@/lib/nutricion/catalogos";
import { minutosEjercicioSemana, numeroSesion, visitaReferencia } from "@/lib/nutricion/metricas";
import { formatearDiferencia, formatearFecha, formatearNumero } from "@/lib/nutricion/formulario";
import type { Configuracion, Paciente, ProgramaNutricionDetalle, VisitaNutricion } from "@/types";

/**
 * Vista de impresión del servicio de nutrición. Dos modos:
 *  - ?visitaId=...                         → informe de la visita para el paciente
 *  - ?tipo=registro[&programaId=...]       → hoja de registro de alimentación en blanco
 *
 * El informe solo incluye lo que es para el paciente (medidas, objetivos y
 * recomendaciones); las observaciones clínicas y las sugerencias internas no se imprimen.
 */

const FILAS_HOJA_REGISTRO = 14;

/** Espera a que haya datos y lanza el diálogo de impresión (salvo descarga de PDF) */
function useAutoImprimir(listo: boolean) {
  useEffect(() => {
    if (!listo) return;
    if (sessionStorage.getItem("pdfDownload")) {
      sessionStorage.removeItem("pdfDownload");
      return;
    }
    const temporizador = setTimeout(() => window.print(), 500);
    return () => clearTimeout(temporizador);
  }, [listo]);
}

// ==========================================
// ESTRUCTURA COMÚN (cabecera, pie y estilos de marca)
// ==========================================

function Documento({
  config,
  titulo,
  subtitulo,
  horizontal = false,
  children,
}: {
  config?: Configuracion;
  titulo: string;
  subtitulo: string;
  horizontal?: boolean;
  children: ReactNode;
}) {
  const colores = getColoresParaConfig(config);
  const nombreFarmacia = config?.farmaciaNombre || "Farmacia";
  const logoUrl = config?.farmaciaLogo || "/logo.png";

  return (
    <div className="print-page">
      <style>{`
        @page { size: A4 ${horizontal ? "landscape" : "portrait"}; margin: 10mm; }
        .print-page {
          font-family: 'Montserrat', system-ui, sans-serif;
          background-color: ${colores.fondo ?? "#f3f4f6"};
          color: ${colores.texto ?? "#333333"};
          padding: 20px;
          min-height: 100vh;
        }
        .page-container {
          max-width: ${horizontal ? "1100px" : "850px"};
          margin: 0 auto;
          background: white;
          padding: 36px 44px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }
        .logo-img { max-height: 64px; width: auto; display: block; }
        .header-title { text-align: right; color: ${colores.primario}; }
        .header-title h1 { font-size: 1.9rem; font-weight: 300; line-height: 1.1; }
        .section-header {
          color: white;
          background-color: ${colores.secundario};
          font-weight: 600;
          font-size: 0.85rem;
          padding: 5px 14px;
          margin: 22px 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 2px;
        }
        .tabla { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .tabla th {
          text-align: left;
          font-size: 0.7rem;
          text-transform: uppercase;
          color: ${colores.primario};
          border-bottom: 2px solid ${colores.linea ?? colores.primario};
          padding: 6px 8px;
        }
        .tabla td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; vertical-align: top; }
        .tabla td.num, .tabla th.num { text-align: right; white-space: nowrap; }
        .tabla-registro td { height: 44px; border: 1px solid #cbd5e1; }
        .tabla-registro th { border: 1px solid #cbd5e1; border-bottom: 2px solid ${colores.linea ?? colores.primario}; }
        .accent-box {
          background-color: #f0f5f7;
          border-left: 4px solid ${colores.secundario};
          padding: 12px 15px;
          font-size: 0.85rem;
          white-space: pre-wrap;
        }
        .dato-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; }
        .leyenda { font-size: 0.72rem; color: #555; line-height: 1.5; }
        .footer-line {
          border-top: 1px solid ${colores.linea ?? colores.primario};
          margin-top: 32px;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #555;
        }
        @media print {
          .print-page { background: white; padding: 0; }
          .page-container { box-shadow: none; max-width: none; padding: 0; }
          .section-header, .accent-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <img
              src={logoUrl}
              alt={`${nombreFarmacia} Logo`}
              className="logo-img"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const alternativo = img.nextElementSibling as HTMLElement | null;
                if (alternativo) alternativo.style.display = "block";
              }}
            />
            <div style={{ display: "none", color: colores.primario, fontWeight: 800, fontSize: "1.4rem", textTransform: "uppercase" }}>
              {nombreFarmacia}
            </div>
          </div>
          <div className="header-title">
            <h1>
              {titulo}
              <br />
              <strong>{subtitulo}</strong>
            </h1>
          </div>
        </div>

        {children}

        <div className="footer-line">
          <div>
            <strong style={{ color: colores.primario }}>{nombreFarmacia}</strong>
            <br />
            {config?.farmaciaDireccion}
            <br />
            {config?.farmaciaCiudad}
          </div>
          <div className="text-right">
            {config?.farmaciaTelefono && (
              <>
                Tlf. {config.farmaciaTelefono}
                <br />
              </>
            )}
            {config?.farmaciaEmail && (
              <>
                {config.farmaciaEmail}
                <br />
              </>
            )}
            {config?.farmaciaWeb}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="dato-label">{label}</span>
      <span className="text-sm">{children || "—"}</span>
    </div>
  );
}

// ==========================================
// INFORME DE VISITA
// ==========================================

type CampoMedida = "peso" | "imc" | "cintura" | "cadera" | "icc" | "porcentajeGrasa" | "masaGrasa" | "masaMagra";

const MEDIDAS: { campo: CampoMedida; label: string; unidad: string }[] = [
  { campo: "peso", label: "Peso", unidad: "kg" },
  { campo: "imc", label: "IMC", unidad: "kg/m²" },
  { campo: "cintura", label: "Cintura", unidad: "cm" },
  { campo: "cadera", label: "Cadera", unidad: "cm" },
  { campo: "icc", label: "Índice cintura-cadera", unidad: "" },
  { campo: "porcentajeGrasa", label: "Grasa corporal", unidad: "%" },
  { campo: "masaGrasa", label: "Masa grasa", unidad: "kg" },
  { campo: "masaMagra", label: "Masa libre de grasa", unidad: "kg" },
];

function InformeVisita({
  visita,
  programa,
  paciente,
  config,
}: {
  visita: VisitaNutricion;
  programa: ProgramaNutricionDetalle;
  paciente?: Paciente;
  config?: Configuracion;
}) {
  const esInicial = visita.tipo === "inicial";
  const referencia = esInicial ? undefined : visitaReferencia(programa.visitas);
  const sesion = numeroSesion(programa.visitas, visita.id);
  const medidas = MEDIDAS.filter((m) => visita[m.campo] != null || referencia?.[m.campo] != null);
  const minutos = minutosEjercicioSemana(visita);
  const porcentajePerdido =
    referencia?.peso && visita.peso != null ? Math.round(((referencia.peso - visita.peso) / referencia.peso) * 1000) / 10 : null;

  const habitos: [string, ReactNode][] = [
    ["Comidas al día", visita.comidasDia],
    ["Raciones de proteína/día", visita.racionesProteinaDia],
    ["Fruta y verdura/día", visita.racionesFrutaVerduraDia],
    ["Agua", visita.aguaLitros != null ? `${visita.aguaLitros.toLocaleString("es-ES")} L/día` : null],
    [
      "Sueño",
      [visita.suenoHoras != null && `${visita.suenoHoras.toLocaleString("es-ES")} h`, etiqueta(CALIDAD_SUENO, visita.suenoCalidad).toLowerCase()]
        .filter(Boolean)
        .join(", "),
    ],
    ["Estrés", etiqueta(NIVEL_ESTRES, visita.estres)],
    [
      "Actividad física",
      visita.ejercicio === "no"
        ? "No realiza"
        : [etiquetas(TIPOS_EJERCICIO, visita.ejercicioTipos), minutos ? `${minutos} min/semana` : null].filter(Boolean).join(" · "),
    ],
  ];

  return (
    <Documento config={config} titulo="Seguimiento" subtitulo={esInicial ? "Nutricional · inicio" : `Nutricional · sesión ${sesion}`}>
      <div className="grid grid-cols-3 gap-x-10 gap-y-3 mb-2">
        <Dato label="Paciente">{paciente?.name}</Dato>
        <Dato label="Fecha">{formatearFecha(visita.fecha)}</Dato>
        <Dato label="Inicio del programa">{formatearFecha(referencia?.fecha ?? programa.fechaInicio)}</Dato>
        {programa.objetivoPrincipal && (
          <div className="col-span-3">
            <Dato label="Objetivo">{programa.objetivoPrincipal}</Dato>
          </div>
        )}
      </div>

      {medidas.length > 0 && (
        <>
          <div className="section-header">Medidas</div>
          <table className="tabla">
            <thead>
              <tr>
                <th>Parámetro</th>
                {referencia && <th className="num">Inicio</th>}
                <th className="num">Hoy</th>
                {referencia && <th className="num">Cambio</th>}
              </tr>
            </thead>
            <tbody>
              {medidas.map((m) => {
                const inicial = referencia?.[m.campo];
                const actual = visita[m.campo];
                const cambio = inicial != null && actual != null ? Math.round((actual - inicial) * 100) / 100 : null;
                return (
                  <tr key={m.campo}>
                    <td>{m.label}</td>
                    {referencia && <td className="num">{inicial != null ? `${formatearNumero(inicial)} ${m.unidad}` : "—"}</td>}
                    <td className="num">{actual != null ? `${formatearNumero(actual)} ${m.unidad}` : "—"}</td>
                    {referencia && <td className="num">{cambio != null ? formatearDiferencia(cambio, m.unidad) : "—"}</td>}
                  </tr>
                );
              })}
              {visita.systolic != null && visita.diastolic != null && (
                <tr>
                  <td>Tensión arterial</td>
                  {referencia && (
                    <td className="num">
                      {referencia.systolic != null ? `${referencia.systolic}/${referencia.diastolic} mmHg` : "—"}
                    </td>
                  )}
                  <td className="num">
                    {visita.systolic}/{visita.diastolic} mmHg
                  </td>
                  {referencia && <td />}
                </tr>
              )}
            </tbody>
          </table>
          {porcentajePerdido != null && porcentajePerdido > 0 && (
            <p className="text-sm mt-3">
              Has perdido un <strong>{porcentajePerdido.toLocaleString("es-ES")} %</strong> de tu peso inicial.
            </p>
          )}
        </>
      )}

      {visita.glp1Activo && (
        <>
          <div className="section-header">Tratamiento</div>
          <div className="grid grid-cols-3 gap-x-10 gap-y-3">
            <Dato label="Fármaco">{etiqueta(FARMACOS_GLP1, visita.glp1Farmaco)}</Dato>
            <Dato label="Dosis">{visita.glp1Dosis}</Dato>
            <Dato label="Efectos secundarios">
              {visita.efectosSecundarios.map((e) => `${etiqueta(EFECTOS_SECUNDARIOS, e.id)} (${e.intensidad})`).join(", ") || "Ninguno"}
            </Dato>
          </div>
        </>
      )}

      <div className="section-header">Hábitos</div>
      <div className="grid grid-cols-4 gap-x-8 gap-y-3">
        {habitos.map(([label, valor]) => (
          <Dato key={label} label={label}>
            {valor}
          </Dato>
        ))}
      </div>

      {visita.objetivosProximaSesion && (
        <>
          <div className="section-header">Objetivos hasta la próxima visita</div>
          <div className="accent-box">{visita.objetivosProximaSesion}</div>
        </>
      )}

      <div className="section-header">Recomendaciones</div>
      <div className="accent-box" style={{ minHeight: 60 }}>
        {visita.recomendaciones || "—"}
      </div>

      <div className="grid grid-cols-2 gap-10 mt-6">
        <Dato label="Próxima revisión">{formatearFecha(visita.proximaRevision)}</Dato>
        <Dato label="Farmacéutico/a">{visita.farmaceutico}</Dato>
      </div>
    </Documento>
  );
}

// ==========================================
// HOJA DE REGISTRO EN BLANCO
// ==========================================

function HojaRegistro({ paciente, config }: { paciente?: Paciente; config?: Configuracion }) {
  const leyenda: [string, string][] = [
    ["Momento", MOMENTOS_COMIDA.map((m) => m.label).join(" · ")],
    ["Cantidad", CANTIDADES.map((c) => c.label).join(" · ")],
    ["Hambre / saciedad", "de 0 (nada) a 10 (muchísima)"],
    ["Sensación", SENSACIONES.map((s) => s.label).join(" · ")],
    ["Con quién / dónde", `${COMPANIAS.map((c) => c.label).join(" · ")} / ${LUGARES.map((l) => l.label).join(" · ")}`],
    ["Motivo del picoteo", CAUSAS_PICOTEO.map((c) => c.label).join(" · ")],
  ];

  return (
    <Documento config={config} titulo="Registro de" subtitulo="alimentación" horizontal>
      <div className="grid grid-cols-3 gap-x-10 mb-3">
        <Dato label="Nombre">{paciente?.name ?? " "}</Dato>
        <Dato label="Semana del">{" "}</Dato>
        <p className="leyenda">
          Apunta todo lo que comas y bebas (salvo agua), también los picoteos, justo después de hacerlo. No hay respuestas
          buenas ni malas: sirve para entender tus hábitos.
        </p>
      </div>
      <table className="tabla tabla-registro">
        <thead>
          <tr>
            <th style={{ width: "7%" }}>Día</th>
            <th style={{ width: "6%" }}>Hora</th>
            <th style={{ width: "10%" }}>Momento</th>
            <th style={{ width: "25%" }}>¿Qué y cuánto como?</th>
            <th style={{ width: "7%" }}>Hambre antes (0-10)</th>
            <th style={{ width: "7%" }}>Saciedad después (0-10)</th>
            <th style={{ width: "13%" }}>¿Cómo me siento después?</th>
            <th style={{ width: "11%" }}>¿Con quién? ¿Dónde?</th>
            <th style={{ width: "14%" }}>Si es picoteo: ¿por qué?</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: FILAS_HOJA_REGISTRO }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: 9 }, (_, j) => (
                <td key={j} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="leyenda mt-3 grid grid-cols-2 gap-x-8">
        {leyenda.map(([titulo, texto]) => (
          <p key={titulo}>
            <strong>{titulo}:</strong> {texto}
          </p>
        ))}
      </div>
    </Documento>
  );
}

// ==========================================
// PÁGINA
// ==========================================

export default function ServicioNutricionPrint() {
  const [searchParams] = useSearchParams();
  const esHojaRegistro = searchParams.get("tipo") === "registro";
  const visitaId = esHojaRegistro ? undefined : searchParams.get("visitaId") ?? undefined;

  const { data: config, isLoading: cargandoConfig } = useConfiguracion();
  const { data: pacientes = [], isLoading: cargandoPacientes } = usePacientes();
  const { data: visita } = useVisitaNutricion(visitaId);
  const programaId = searchParams.get("programaId") ?? visita?.programaId;
  const { data: programa, isLoading: cargandoPrograma } = useProgramaNutricion(programaId);

  const paciente = pacientes.find((p) => p.id === programa?.pacienteId);
  const listo = esHojaRegistro
    ? !cargandoConfig && !cargandoPacientes && !cargandoPrograma
    : !!visita && !!programa && !cargandoConfig && !cargandoPacientes;

  useAutoImprimir(listo);

  if (!listo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  if (esHojaRegistro) {
    return <HojaRegistro paciente={paciente} config={config} />;
  }

  return <InformeVisita visita={visita!} programa={programa!} paciente={paciente} config={config} />;
}
