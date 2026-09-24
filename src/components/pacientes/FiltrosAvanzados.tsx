import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface FiltrosPacientes {
  busqueda?: string;
  email?: string;
  sexo?: "M" | "F" | "O";
  origen?: "manual" | "autoregistro";
  edadMin?: number;
  edadMax?: number;
  tieneDermo?: boolean;
  tieneBio?: boolean;
  tieneNutricion?: boolean;
  fechaDesde?: Date;
  fechaHasta?: Date;
  ordenarPor?: "name" | "createdAt" | "age";
  orden?: "asc" | "desc";
}

interface FiltrosAvanzadosProps {
  filtros: FiltrosPacientes;
  onFiltrosChange: (filtros: FiltrosPacientes) => void;
  onReset: () => void;
}

export function FiltrosAvanzados({ filtros, onFiltrosChange, onReset }: FiltrosAvanzadosProps) {
  const [open, setOpen] = useState(false);
  const [filtrosLocales, setFiltrosLocales] = useState<FiltrosPacientes>(filtros);

  const aplicarFiltros = () => {
    onFiltrosChange(filtrosLocales);
    setOpen(false);
  };

  const resetearFiltros = () => {
    const filtrosVacios: FiltrosPacientes = {};
    setFiltrosLocales(filtrosVacios);
    onFiltrosChange(filtrosVacios);
    onReset();
    setOpen(false);
  };

  const tieneFiltrosActivos = 
    filtros.email ||
    filtros.sexo ||
    filtros.origen ||
    filtros.edadMin !== undefined ||
    filtros.edadMax !== undefined ||
    filtros.tieneDermo ||
    filtros.tieneBio ||
    filtros.tieneNutricion ||
    filtros.fechaDesde ||
    filtros.fechaHasta ||
    filtros.ordenarPor !== undefined;

  const contarFiltrosActivos = () => {
    let count = 0;
    if (filtros.email) count++;
    if (filtros.sexo) count++;
    if (filtros.origen) count++;
    if (filtros.edadMin !== undefined || filtros.edadMax !== undefined) count++;
    if (filtros.tieneDermo) count++;
    if (filtros.tieneBio) count++;
    if (filtros.tieneNutricion) count++;
    if (filtros.fechaDesde) count++;
    if (filtros.fechaHasta) count++;
    return count;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {tieneFiltrosActivos && (
            <Badge variant="secondary" className="ml-1">
              {contarFiltrosActivos()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between p-4 pb-2 border-b">
          <h4 className="font-semibold text-sm">Filtros Avanzados</h4>
          {tieneFiltrosActivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetearFiltros}
              className="h-6 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px] px-4">
          <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="filtro-email" className="text-xs">Email</Label>
            <Input
              id="filtro-email"
              placeholder="Buscar por email..."
              value={filtrosLocales.email || ""}
              onChange={(e) =>
                setFiltrosLocales({ ...filtrosLocales, email: e.target.value || undefined })
              }
              className="h-8"
            />
          </div>

          {/* Sexo */}
          <div className="space-y-2">
            <Label htmlFor="filtro-sexo" className="text-xs">Sexo</Label>
            <Select
              value={filtrosLocales.sexo || "all"}
              onValueChange={(value) =>
                setFiltrosLocales({
                  ...filtrosLocales,
                  sexo: value === "all" ? undefined : (value as "M" | "F" | "O"),
                })
              }
            >
              <SelectTrigger id="filtro-sexo" className="h-8">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="M">Hombre</SelectItem>
                <SelectItem value="F">Mujer</SelectItem>
                <SelectItem value="O">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origen */}
          <div className="space-y-2">
            <Label htmlFor="filtro-origen" className="text-xs">Origen</Label>
            <Select
              value={filtrosLocales.origen || "all"}
              onValueChange={(value) =>
                setFiltrosLocales({
                  ...filtrosLocales,
                  origen: value === "all" ? undefined : (value as "manual" | "autoregistro"),
                })
              }
            >
              <SelectTrigger id="filtro-origen" className="h-8">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="manual">Registrado manualmente</SelectItem>
                <SelectItem value="autoregistro">Autoregistrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rango de Edad */}
          <div className="space-y-2">
            <Label className="text-xs">Rango de Edad</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={filtrosLocales.edadMin || ""}
                onChange={(e) =>
                  setFiltrosLocales({
                    ...filtrosLocales,
                    edadMin: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="h-8 w-20"
                min={0}
                max={150}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filtrosLocales.edadMax || ""}
                onChange={(e) =>
                  setFiltrosLocales({
                    ...filtrosLocales,
                    edadMax: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="h-8 w-20"
                min={0}
                max={150}
              />
              <span className="text-xs text-muted-foreground">años</span>
            </div>
          </div>

          {/* Tipo de Servicio */}
          <div className="space-y-2">
            <Label className="text-xs">Tipo de Servicio</Label>
            <div className="flex gap-2">
              <Button
                variant={filtrosLocales.tieneDermo ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() =>
                  setFiltrosLocales({
                    ...filtrosLocales,
                    tieneDermo: !filtrosLocales.tieneDermo,
                  })
                }
              >
                Dermo
              </Button>
              <Button
                variant={filtrosLocales.tieneBio ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() =>
                  setFiltrosLocales({
                    ...filtrosLocales,
                    tieneBio: !filtrosLocales.tieneBio,
                  })
                }
              >
                Bio
              </Button>
              <Button
                variant={filtrosLocales.tieneNutricion ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() =>
                  setFiltrosLocales({
                    ...filtrosLocales,
                    tieneNutricion: !filtrosLocales.tieneNutricion,
                  })
                }
              >
                Nutrición
              </Button>
            </div>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-2">
            <Label className="text-xs">Fecha Desde</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8",
                    !filtrosLocales.fechaDesde && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtrosLocales.fechaDesde ? (
                    format(filtrosLocales.fechaDesde, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtrosLocales.fechaDesde}
                  onSelect={(date) =>
                    setFiltrosLocales({ ...filtrosLocales, fechaDesde: date })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-2">
            <Label className="text-xs">Fecha Hasta</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8",
                    !filtrosLocales.fechaHasta && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtrosLocales.fechaHasta ? (
                    format(filtrosLocales.fechaHasta, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtrosLocales.fechaHasta}
                  onSelect={(date) =>
                    setFiltrosLocales({ ...filtrosLocales, fechaHasta: date })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ordenar Por */}
          <div className="space-y-2">
            <Label htmlFor="ordenar-por" className="text-xs">Ordenar Por</Label>
            <Select
              value={filtrosLocales.ordenarPor || "createdAt"}
              onValueChange={(value) =>
                setFiltrosLocales({
                  ...filtrosLocales,
                  ordenarPor: value as "name" | "createdAt" | "age",
                })
              }
            >
              <SelectTrigger id="ordenar-por" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Fecha de Registro</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="age">Edad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orden */}
          <div className="space-y-2">
            <Label htmlFor="orden" className="text-xs">Orden</Label>
            <Select
              value={filtrosLocales.orden || "desc"}
              onValueChange={(value) =>
                setFiltrosLocales({
                  ...filtrosLocales,
                  orden: value as "asc" | "desc",
                })
              }
            >
              <SelectTrigger id="orden" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descendente</SelectItem>
                <SelectItem value="asc">Ascendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          </div>
        </ScrollArea>
        {/* Botones - Fijos abajo */}
        <div className="flex gap-2 p-4 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={aplicarFiltros} className="flex-1">
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
