/**
 * Seguridad (solo administradores): cierre de sesión por inactividad y
 * registro de quién ha consultado o cambiado datos de pacientes.
 */
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Lock, Save, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { hoyISO } from '@/lib/fechas';
import { guardarArchivo } from '@/lib/guardarArchivo';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import {
  queryFiltros,
  useActualizarSeguridad,
  useRegistroAccesos,
  type EntradaRegistroAcceso,
  type FiltrosRegistroAccesos,
} from '@/hooks/useSeguridad';

const ACCIONES: Record<string, string> = {
  ver: 'Consultó',
  crear: 'Creó',
  editar: 'Modificó',
  borrar: 'Borró',
  exportar: 'Exportó',
  importar: 'Importó',
  enviar: 'Envió por email',
  guardar: 'Guardó en PDF',
  restaurar: 'Restauró',
  login: 'Inició sesión',
  'login-fallido': 'Intento de acceso fallido',
  logout: 'Cerró sesión',
};

const RECURSOS: Record<string, string> = {
  paciente: 'ficha del paciente',
  dermo: 'análisis dermocosmético',
  bio: 'análisis bioquímico',
  'programa-nutricion': 'programa de nutrición',
  'visita-nutricion': 'visita de nutrición',
  'registro-alimentacion': 'registro de alimentación',
  informe: 'informe',
  listado: 'listado',
  copia: 'copia de seguridad',
  sesion: '',
};

/** «Consultó la ficha del paciente», «Exportó el listado (pacientes)»… */
function describir(entrada: EntradaRegistroAcceso): string {
  const accion = ACCIONES[entrada.accion] ?? entrada.accion;
  const recurso = RECURSOS[entrada.recurso] ?? entrada.recurso;
  const detalle = entrada.detalle ? ` (${entrada.detalle})` : '';
  return `${accion}${recurso ? ` ${recurso}` : ''}${detalle}`;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function TarjetaInactividad() {
  const { data: config } = useConfiguracion();
  const actualizar = useActualizarSeguridad();
  const [minutos, setMinutos] = useState('15');

  useEffect(() => {
    if (config) setMinutos(String(config.minutosInactividad ?? 15));
  }, [config]);

  const guardar = async () => {
    try {
      await actualizar.mutateAsync({ minutosInactividad: Number(minutos) || 0 });
      toast.success('Guardado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido guardar');
    }
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Cierre de sesión por inactividad
        </CardTitle>
        <CardDescription>
          Si nadie usa la app durante este tiempo, la sesión se cierra (con un aviso un minuto antes). Así nadie puede
          ver fichas de pacientes si el ordenador se queda desatendido. Escribe 0 para no cerrarla nunca.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="minutos-inactividad">Minutos</Label>
          <Input
            id="minutos-inactividad"
            type="number"
            min={0}
            max={480}
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
            className="w-28"
          />
        </div>
        <Button onClick={guardar} disabled={actualizar.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function TarjetaRegistro() {
  const [filtros, setFiltros] = useState<FiltrosRegistroAccesos>({ pagina: 1 });
  const [texto, setTexto] = useState('');
  const { data, isLoading, isFetching } = useRegistroAccesos(filtros);
  const [exportando, setExportando] = useState(false);

  // Espera a que se deje de escribir para no consultar en cada tecla
  useEffect(() => {
    const temporizador = setTimeout(() => setFiltros((f) => ({ ...f, texto, pagina: 1 })), 300);
    return () => clearTimeout(temporizador);
  }, [texto]);

  const cambiarFecha = (campo: 'desde' | 'hasta', valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor || undefined, pagina: 1 }));

  const exportar = async () => {
    setExportando(true);
    const { pagina: _pagina, ...sinPagina } = filtros;
    const query = queryFiltros(sinPagina);
    try {
      const ruta = await guardarArchivo({
        nombreSugerido: `registro-accesos-${hoyISO()}.csv`,
        extension: 'csv',
        descripcion: 'Hoja de cálculo (CSV)',
        escribirEn: (destino) => api.post(`/registro-accesos/exportar${query}`, { destino }),
        obtenerContenido: () => api.getTexto(`/registro-accesos/exportar${query}`),
      });
      if (ruta) toast.success('Exportado', { description: ruta });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido exportar');
    } finally {
      setExportando(false);
    }
  };

  const pagina = data?.pagina ?? 1;
  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Registro de accesos
        </CardTitle>
        <CardDescription>
          Quién ha consultado, creado, modificado, exportado o borrado datos de pacientes, y los inicios de sesión.
          Se guarda durante dos años, como exige la protección de datos de salud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="registro-texto">Paciente o usuario</Label>
            <Input id="registro-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar…" className="w-56" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registro-desde">Desde</Label>
            <Input id="registro-desde" type="date" value={filtros.desde ?? ''} onChange={(e) => cambiarFecha('desde', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registro-hasta">Hasta</Label>
            <Input id="registro-hasta" type="date" value={filtros.hasta ?? ''} onChange={(e) => cambiarFecha('hasta', e.target.value)} />
          </div>
          <Button variant="outline" className="gap-2" onClick={exportar} disabled={exportando}>
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !data || data.entradas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay accesos con estos filtros.</p>
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Qué hizo</TableHead>
                  <TableHead>Paciente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entradas.map((entrada) => (
                  <TableRow key={entrada.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatearFecha(entrada.fecha)}</TableCell>
                    <TableCell>{entrada.usuarioNombre}</TableCell>
                    <TableCell>{describir(entrada)}</TableCell>
                    <TableCell>{entrada.pacienteNombre ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
              <span>{data.total} accesos</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Página anterior"
                  disabled={pagina <= 1}
                  onClick={() => setFiltros((f) => ({ ...f, pagina: pagina - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  {pagina} / {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Página siguiente"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setFiltros((f) => ({ ...f, pagina: pagina + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SeguridadTab() {
  return (
    <div className="space-y-6">
      <TarjetaInactividad />
      <TarjetaRegistro />
    </div>
  );
}
