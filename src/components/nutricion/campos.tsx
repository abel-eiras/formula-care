import { memo, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Opcion } from "@/lib/nutricion/catalogos";
import type { Clasificacion } from "@/lib/nutricion/metricas";

/**
 * Campos de formulario compartidos por todos los formularios de nutrición
 * (programa, visita y registro de alimentación), para que tengan el mismo
 * aspecto y comportamiento.
 */

// ==========================================
// CONTENEDORES
// ==========================================

export function SeccionFormulario({
  titulo,
  descripcion,
  children,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">{titulo}</h3>
            {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
          </div>
          {accion}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ==========================================
// CAMPOS
// ==========================================

export function CampoTexto({
  id,
  label,
  value,
  onChange,
  multilinea = false,
  placeholder,
  filas = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  multilinea?: boolean;
  placeholder?: string;
  filas?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {multilinea ? (
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          rows={filas}
          className="resize-y"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function CampoNumero({
  id,
  label,
  unidad,
  value,
  onChange,
  step = "any",
  min = 0,
  ayuda,
}: {
  id: string;
  label: string;
  unidad?: string;
  value: string;
  onChange: (valor: string) => void;
  step?: string;
  min?: number;
  /** Texto bajo el campo, p. ej. la comparación con la visita inicial */
  ayuda?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {unidad && <span className="text-muted-foreground font-normal"> ({unidad})</span>}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

/**
 * Selección única con botones. Pulsar la opción elegida la desmarca,
 * para poder dejar el dato vacío si no se preguntó.
 */
function OpcionesUnicasBase<T extends string>({
  label,
  opciones,
  value,
  onChange,
}: {
  label: string;
  opciones: readonly Opcion<T>[];
  value: T | null | undefined;
  onChange: (valor: T | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {opciones.map((opcion) => {
          const activa = value === opcion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onChange(activa ? null : opcion.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                activa
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export const OpcionesUnicas = memo(OpcionesUnicasBase) as typeof OpcionesUnicasBase;

/** Selección múltiple con etiquetas (chips) */
export const OpcionesMultiples = memo(function OpcionesMultiples({
  label,
  opciones,
  value,
  onChange,
}: {
  label: string;
  opciones: readonly Opcion[];
  value: readonly string[];
  onChange: (valor: string[]) => void;
}) {
  const alternar = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const activa = value.includes(opcion.id);
          return (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={activa}
              onClick={() => alternar(opcion.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                activa
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const OPCIONES_SI_NO: Opcion<"si" | "no">[] = [
  { id: "si", label: "Sí" },
  { id: "no", label: "No" },
];

/** Sí / No / sin responder */
export function CampoSiNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (valor: boolean | null) => void;
}) {
  const actual = value == null ? null : value ? "si" : "no";
  return (
    <OpcionesUnicas
      label={label}
      opciones={OPCIONES_SI_NO}
      value={actual}
      onChange={(v) => onChange(v == null ? null : v === "si")}
    />
  );
}

const VALORES_ESCALA = Array.from({ length: 11 }, (_, i) => i);

/** Escala 0-10 con botones (más rápida que un slider en consulta) */
export function Escala0a10({
  label,
  value,
  onChange,
  extremos,
}: {
  label: string;
  value: number | null;
  onChange: (valor: number | null) => void;
  /** Etiquetas de los extremos, p. ej. ["Nada", "Muchísima"] */
  extremos?: [string, string];
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {value != null && <span className="ml-2 font-semibold text-primary">{value}/10</span>}
      </Label>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {VALORES_ESCALA.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "h-8 w-8 rounded-md border text-sm transition-colors",
              value === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {extremos && (
        <div className="flex justify-between text-xs text-muted-foreground max-w-[396px]">
          <span>{extremos[0]}</span>
          <span>{extremos[1]}</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// INDICADORES
// ==========================================

const CLASES_NIVEL: Record<Clasificacion["nivel"], string> = {
  normal: "bg-success-soft text-success border-success/20",
  advertencia: "bg-warning-soft text-warning border-warning/20",
  critico: "bg-destructive-soft text-destructive border-destructive/20",
};

export function BadgeClasificacion({ clasificacion }: { clasificacion: Clasificacion }) {
  return <Badge className={cn("text-xs", CLASES_NIVEL[clasificacion.nivel])}>{clasificacion.texto}</Badge>;
}
