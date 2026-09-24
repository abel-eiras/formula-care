import { memo } from "react";
import { AlertTriangle, Check, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getColoresParaConfig,
  revisarContraste,
  TEMA_PERSONALIZADO,
  TEMAS_PRECONFIGURADOS,
} from "@/lib/coloresMarca";
import { esHexValido, textoSobre } from "@/lib/contraste";
import type { ColoresMarca } from "@/types";

export interface ValorTema {
  temaActivo: string;
  coloresMarca?: ColoresMarca;
}

interface SelectorTemaProps {
  valor: ValorTema;
  onChange: (valor: ValorTema) => void;
}

/** Campos editables del tema personalizado, con su uso en la app e informes */
const CAMPOS_COLOR: { campo: keyof ColoresMarca; label: string; ayuda: string }[] = [
  { campo: "primario", label: "Primario", ayuda: "Barra lateral, títulos y cabeceras" },
  { campo: "secundario", label: "Secundario", ayuda: "Botones secundarios y bloques de informes" },
  { campo: "acento", label: "Acento", ayuda: "Resaltados y elementos activos" },
  { campo: "linea", label: "Líneas", ayuda: "Divisores y bordes de marca" },
  { campo: "fondo", label: "Fondo", ayuda: "Fondo de la app y de los informes" },
  { campo: "texto", label: "Texto principal", ayuda: "Texto general" },
  { campo: "textoSecundario", label: "Texto secundario", ayuda: "Subtítulos y descripciones" },
];

/** Miniatura de un tema: barra lateral, acento, línea y texto sobre el fondo */
const MuestraTema = memo(function MuestraTema({ colores }: { colores: ColoresMarca }) {
  const c = getColoresParaConfig({ temaActivo: TEMA_PERSONALIZADO, coloresMarca: colores });
  return (
    <div className="flex h-20 overflow-hidden rounded-md border" aria-hidden>
      <div className="flex w-1/4 flex-col gap-1 p-1.5" style={{ backgroundColor: c.primario }}>
        <span className="h-1.5 w-3/4 rounded-full opacity-70" style={{ backgroundColor: textoSobre(c.primario!) }} />
        <span className="h-3 rounded-sm" style={{ backgroundColor: c.acento }} />
        <span className="h-1.5 w-2/3 rounded-full opacity-50" style={{ backgroundColor: textoSobre(c.primario!) }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2" style={{ backgroundColor: c.fondo }}>
        <span className="h-2 w-2/3 rounded-full" style={{ backgroundColor: c.texto }} />
        <span className="h-0.5 w-full" style={{ backgroundColor: c.linea }} />
        <span className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: c.textoSecundario }} />
        <span
          className="mt-auto h-3.5 w-12 rounded-sm text-[7px] leading-[14px] text-center font-semibold"
          style={{ backgroundColor: c.secundario, color: textoSobre(c.secundario!) }}
        >
          Aa
        </span>
      </div>
    </div>
  );
});

function TarjetaTema({
  nombre,
  descripcion,
  colores,
  seleccionado,
  onClick,
  icono,
}: {
  nombre: string;
  descripcion: string;
  colores: ColoresMarca;
  seleccionado: boolean;
  onClick: () => void;
  icono?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionado}
      onClick={onClick}
      className={cn(
        "relative space-y-2 rounded-lg border-2 p-2 text-left transition-colors hover:border-primary/50",
        seleccionado ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {seleccionado && (
        <span className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-3 w-3" />
        </span>
      )}
      <MuestraTema colores={colores} />
      <div className="px-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {icono}
          {nombre}
        </p>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      </div>
    </button>
  );
}

/**
 * Selector de tema: temas preconfigurados como tarjetas con su paleta, y un
 * tema personalizado que parte de los colores del tema elegido y avisa si
 * alguna combinación no se lee bien.
 */
export function SelectorTema({ valor, onChange }: SelectorTemaProps) {
  const esPersonalizado = valor.temaActivo === TEMA_PERSONALIZADO;
  // Colores efectivos actuales (del tema o personalizados), completos
  const coloresActuales = getColoresParaConfig(valor);
  const avisos = esPersonalizado ? revisarContraste(coloresActuales) : [];

  const elegirTema = (id: string) => onChange({ temaActivo: id, coloresMarca: TEMAS_PRECONFIGURADOS[id].colores });

  // Al pasar a personalizado se parte de lo que se ve ahora, no de cero
  const personalizar = () => {
    if (!esPersonalizado) onChange({ temaActivo: TEMA_PERSONALIZADO, coloresMarca: coloresActuales });
  };

  const cambiarColor = (campo: keyof ColoresMarca, color: string) =>
    onChange({ temaActivo: TEMA_PERSONALIZADO, coloresMarca: { ...coloresActuales, [campo]: color } });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Tema</Label>
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Object.entries(TEMAS_PRECONFIGURADOS).map(([id, tema]) => (
            <TarjetaTema
              key={id}
              nombre={tema.nombre}
              descripcion={tema.descripcion}
              colores={tema.colores}
              seleccionado={valor.temaActivo === id || (!valor.temaActivo && id === "default")}
              onClick={() => elegirTema(id)}
            />
          ))}
          <TarjetaTema
            nombre="Personalizado"
            descripcion={esPersonalizado ? "Tus propios colores" : "Parte del tema actual y ajústalo"}
            colores={coloresActuales}
            seleccionado={esPersonalizado}
            onClick={personalizar}
            icono={<Palette className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {esPersonalizado && (
        <div className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS_COLOR.map(({ campo, label, ayuda }) => {
              const color = coloresActuales[campo] ?? "#000000";
              const conAviso = avisos.some((a) => a.campo === campo);
              return (
                <div key={campo} className="space-y-1.5">
                  <Label htmlFor={`color-${campo}`}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`color-${campo}`}
                      type="color"
                      className="h-10 w-14 cursor-pointer p-1"
                      value={esHexValido(color) ? color : "#000000"}
                      onChange={(e) => cambiarColor(campo, e.target.value)}
                    />
                    <Input
                      aria-label={`${label} (hexadecimal)`}
                      className={cn("flex-1 font-mono text-sm", conAviso && "border-warning")}
                      value={color}
                      maxLength={7}
                      onChange={(e) => cambiarColor(campo, e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{ayuda}</p>
                </div>
              );
            })}
          </div>

          {avisos.length > 0 && (
            <div className="space-y-1 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                Algunas combinaciones pueden leerse con dificultad
              </p>
              <ul className="list-disc space-y-0.5 pl-6 text-foreground">
                {avisos.map((a) => (
                  <li key={a.campo}>{a.mensaje}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Puedes guardarlo igualmente; el texto sobre los colores de marca se elige automáticamente (blanco u oscuro).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
