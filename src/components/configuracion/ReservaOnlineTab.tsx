import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Globe, KeyRound, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useActualizarConfiguracionCalendario, useConfiguracionCalendario } from "@/hooks/useConfiguracion";
import {
  useActualizarConfigReservaOnline,
  useConfigReservaOnline,
  useRegenerarTokenReserva,
  useSincronizarReservaOnline,
  type ConfigReservaOnline,
} from "@/hooks/useReservaOnline";
import { hoyISO, parsearFecha } from "@/lib/fechas";

const SERVICIOS = [
  { id: "dermo", nombre: "Dermocosmética", duracion: 45 },
  { id: "bio", nombre: "Análisis bioquímico", duracion: 20 },
  { id: "nutricion", nombre: "Nutrición", duracion: 45 },
  { id: "consulta", nombre: "Consulta farmacéutica", duracion: 20 },
] as const;

const DIAS = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miércoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
] as const;

const RANGO = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/;

/** "09:00-14:00, 16:00-19:00" ↔ ["09:00-14:00", "16:00-19:00"] */
const aTexto = (rangos: string[] = []) => rangos.join(", ");
const aRangos = (texto: string) =>
  texto
    .split(",")
    .map((r) => r.replace(/\s+/g, ""))
    .filter(Boolean);

function mensajeError(error: unknown, porDefecto: string): string {
  return error instanceof Error ? error.message : porDefecto;
}

/** Conexión con booking-web: direcciones, token y estado de la sincronización */
function TarjetaConexion({ config }: { config: ConfigReservaOnline }) {
  const actualizar = useActualizarConfigReservaOnline();
  const regenerarToken = useRegenerarTokenReserva();
  const sincronizar = useSincronizarReservaOnline();
  const [form, setForm] = useState({
    activa: config.activa,
    urlPublica: config.urlPublica ?? "",
    urlApi: config.urlApi ?? "",
    diasVista: config.diasVista,
    antelacionMinimaHoras: config.antelacionMinimaHoras,
  });
  const [verToken, setVerToken] = useState(false);

  const guardar = async () => {
    try {
      await actualizar.mutateAsync(form);
      toast.success(form.activa ? "Reserva online guardada; sincronizando…" : "Reserva online guardada");
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido guardar"));
    }
  };

  const sincronizarAhora = async () => {
    try {
      const r = await sincronizar.mutateAsync();
      if (r.ok && !r.omitida) {
        toast.success("Sincronizado", {
          description: `${r.solicitudesNuevas ?? 0} solicitud(es) nueva(s), ${r.cancelaciones ?? 0} cancelación(es).`,
        });
      } else {
        toast.error(r.error ?? r.omitida ?? "No se ha podido sincronizar");
      }
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido sincronizar"));
    }
  };

  const copiarToken = async () => {
    if (!config.tokenSincronizacion) return;
    await navigator.clipboard.writeText(config.tokenSincronizacion);
    toast.success("Token copiado");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Reserva online
          </CardTitle>
          <CardDescription>
            Los pacientes piden cita en tu página de reserva (booking-web); sus datos llegan cifrados y solo esta app puede
            leerlos. La app publica tus huecos libres y recoge las solicitudes cada 2 minutos.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="reserva-activa" className="text-sm">
            Activa
          </Label>
          <Switch id="reserva-activa" checked={form.activa} onCheckedChange={(activa) => setForm({ ...form, activa })} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="url-publica">Página de reserva (la que verán los pacientes)</Label>
            <Input
              id="url-publica"
              placeholder="https://citas.tufarmacia.es"
              value={form.urlPublica}
              onChange={(e) => setForm({ ...form, urlPublica: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url-api">Dirección del servidor de reservas (API)</Label>
            <Input
              id="url-api"
              placeholder="https://citas.tufarmacia.es/api"
              value={form.urlApi}
              onChange={(e) => setForm({ ...form, urlApi: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dias-vista">Días que se pueden reservar por adelantado</Label>
            <Input
              id="dias-vista"
              type="number"
              min={1}
              max={180}
              value={form.diasVista}
              onChange={(e) => setForm({ ...form, diasVista: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="antelacion">Antelación mínima (horas)</Label>
            <Input
              id="antelacion"
              type="number"
              min={0}
              value={form.antelacionMinimaHoras}
              onChange={(e) => setForm({ ...form, antelacionMinimaHoras: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Token de sincronización</Label>
          <div className="flex gap-2">
            <Input
              id="token"
              readOnly
              type={verToken ? "text" : "password"}
              value={config.tokenSincronizacion ?? ""}
              placeholder="Genera uno y cópialo en SYNC_TOKEN del servidor de reservas"
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={() => setVerToken(!verToken)} aria-label={verToken ? "Ocultar token" : "Mostrar token"}>
              {verToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={copiarToken} disabled={!config.tokenSincronizacion} aria-label="Copiar token">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => regenerarToken.mutate()} disabled={regenerarToken.isPending}>
              <KeyRound className="h-4 w-4" />
              {config.tokenSincronizacion ? "Generar otro" : "Generar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Es la contraseña entre esta app y el servidor de reservas: ponlo en la variable SYNC_TOKEN al desplegarlo. Si
            generas otro, actualízalo también allí.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Última sincronización: </span>
            {config.ultimaSincronizacion ? new Date(config.ultimaSincronizacion).toLocaleString("es-ES") : "nunca"}
          </p>
          {config.huellaClave && (
            <p>
              <span className="text-muted-foreground">Huella de la clave de cifrado: </span>
              <span className="font-mono">{config.huellaClave}</span>
            </p>
          )}
          {config.ultimoError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{config.ultimoError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="gap-2" onClick={sincronizarAhora} disabled={!config.activa || sincronizar.isPending}>
            <RefreshCw className={sincronizar.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Sincronizar ahora
          </Button>
          <Button className="gap-2" onClick={guardar} disabled={actualizar.isPending}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Servicios que se ofrecen online, su duración y su horario semanal */
function TarjetaServicios() {
  const { data: calendario, isLoading } = useConfiguracionCalendario();
  const actualizar = useActualizarConfiguracionCalendario();
  const [horarios, setHorarios] = useState<Record<string, Record<string, string>>>({});
  const [duraciones, setDuraciones] = useState<Record<string, number>>({});
  const [ofrecidos, setOfrecidos] = useState<Record<string, boolean>>({});
  const [autoAceptar, setAutoAceptar] = useState(false);

  useEffect(() => {
    if (!calendario) return;
    const texto: Record<string, Record<string, string>> = {};
    const activos: Record<string, boolean> = {};
    for (const s of SERVICIOS) {
      const semana = calendario.horariosPorTipo?.[s.id] ?? {};
      texto[s.id] = Object.fromEntries(DIAS.map(([dia]) => [dia, aTexto(semana[dia])]));
      activos[s.id] = Object.values(semana).some((r) => r.length > 0);
    }
    setHorarios(texto);
    setOfrecidos(activos);
    setDuraciones(Object.fromEntries(SERVICIOS.map((s) => [s.id, calendario.duracionPorTipo?.[s.id] ?? s.duracion])));
    setAutoAceptar(calendario.autoAceptar);
  }, [calendario]);

  const guardar = async () => {
    const horariosPorTipo: Record<string, Record<string, string[]>> = {};
    for (const s of SERVICIOS) {
      if (!ofrecidos[s.id]) continue;
      const semana: Record<string, string[]> = {};
      for (const [dia, nombreDia] of DIAS) {
        const rangos = aRangos(horarios[s.id]?.[dia] ?? "");
        const malo = rangos.find((r) => !RANGO.test(r));
        if (malo) {
          toast.error(`${s.nombre}, ${nombreDia}: "${malo}" no es un horario válido`, { description: "Usa el formato 09:00-14:00, 16:00-19:00" });
          return;
        }
        if (rangos.length) semana[dia] = rangos;
      }
      horariosPorTipo[s.id] = semana;
    }
    try {
      await actualizar.mutateAsync({ horariosPorTipo, duracionPorTipo: duraciones, autoAceptar });
      toast.success("Horarios guardados");
    } catch (error) {
      toast.error(mensajeError(error, "No se han podido guardar los horarios"));
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servicios y horarios online</CardTitle>
        <CardDescription>
          Solo se ofrecen los servicios activados, en sus horarios. Un hueco deja de ofrecerse si coincide con cualquier cita de
          la agenda. Los talleres y eventos se configuran en la pestaña Calendario.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {SERVICIOS.map((s) => (
          <div key={s.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  id={`ofrecer-${s.id}`}
                  checked={!!ofrecidos[s.id]}
                  onCheckedChange={(v) => setOfrecidos({ ...ofrecidos, [s.id]: v })}
                />
                <Label htmlFor={`ofrecer-${s.id}`} className="font-semibold">
                  {s.nombre}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`duracion-${s.id}`} className="text-sm text-muted-foreground">
                  Duración (min)
                </Label>
                <Input
                  id={`duracion-${s.id}`}
                  type="number"
                  min={5}
                  className="w-20"
                  value={duraciones[s.id] ?? s.duracion}
                  onChange={(e) => setDuraciones({ ...duraciones, [s.id]: Number(e.target.value) || s.duracion })}
                />
              </div>
            </div>
            {ofrecidos[s.id] && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {DIAS.map(([dia, nombreDia]) => (
                  <div key={dia} className="space-y-1">
                    <Label htmlFor={`${s.id}-${dia}`} className="text-xs text-muted-foreground">
                      {nombreDia}
                    </Label>
                    <Input
                      id={`${s.id}-${dia}`}
                      placeholder="Cerrado"
                      value={horarios[s.id]?.[dia] ?? ""}
                      onChange={(e) => setHorarios({ ...horarios, [s.id]: { ...horarios[s.id], [dia]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div>
            <Label htmlFor="auto-aceptar" className="font-semibold">
              Aceptar solicitudes automáticamente
            </Label>
            <p className="text-sm text-muted-foreground">
              Si el hueco sigue libre y el paciente se identifica sin dudas, la cita se confirma sola al recogerla. Si no, queda
              pendiente en el Calendario.
            </p>
          </div>
          <Switch id="auto-aceptar" checked={autoAceptar} onCheckedChange={setAutoAceptar} />
        </div>

        <div className="flex justify-end">
          <Button className="gap-2" onClick={guardar} disabled={actualizar.isPending}>
            <Save className="h-4 w-4" />
            Guardar horarios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Festivos, vacaciones... días en que no se ofrece ningún hueco */
function TarjetaDiasCerrados() {
  const { data: calendario } = useConfiguracionCalendario();
  const actualizar = useActualizarConfiguracionCalendario();
  const [nueva, setNueva] = useState("");
  const fechas = [...(calendario?.fechasBloqueadas ?? [])].sort();
  const futuras = fechas.filter((f) => f >= hoyISO());

  const guardar = async (lista: string[]) => {
    try {
      await actualizar.mutateAsync({ fechasBloqueadas: lista });
    } catch (error) {
      toast.error(mensajeError(error, "No se ha podido guardar"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Días cerrados</CardTitle>
        <CardDescription>Festivos y vacaciones: esos días no se ofrece ninguna cita online.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input type="date" min={hoyISO()} value={nueva} onChange={(e) => setNueva(e.target.value)} className="w-48" aria-label="Día cerrado" />
          <Button
            variant="outline"
            className="gap-2"
            disabled={!nueva || fechas.includes(nueva)}
            onClick={async () => {
              await guardar([...fechas, nueva]);
              setNueva("");
            }}
          >
            <Plus className="h-4 w-4" /> Añadir
          </Button>
        </div>
        {futuras.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay días cerrados próximos.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {futuras.map((f) => (
              <Badge key={f} variant="secondary" className="gap-1 py-1">
                {parsearFecha(f).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                <button
                  type="button"
                  className="ml-1 rounded hover:text-destructive"
                  aria-label={`Quitar ${f}`}
                  onClick={() => guardar(fechas.filter((x) => x !== f))}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReservaOnlineTab() {
  const { data: config, isLoading } = useConfigReservaOnline();
  if (isLoading || !config) return <LoadingSpinner />;
  return (
    <div className="space-y-6">
      <TarjetaConexion config={config} />
      <TarjetaServicios />
      <TarjetaDiasCerrados />
    </div>
  );
}
