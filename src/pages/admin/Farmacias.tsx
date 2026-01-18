/**
 * Página de Gestión de Farmacias
 * Lista de farmacias con filtros y acciones
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFarmacias, useDesactivarFarmacia, useActivarFarmacia } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Building2, 
  Users, 
  UserCheck,
  ExternalLink,
  Power,
  PowerOff,
  AlertTriangle,
} from 'lucide-react';
import type { Farmacia, PlanFarmacia } from '@/types';

// Componente de badge de plan
function PlanBadge({ plan }: { plan: PlanFarmacia }) {
  const variants: Record<PlanFarmacia, 'default' | 'secondary' | 'outline'> = {
    basico: 'outline',
    profesional: 'secondary',
    enterprise: 'default',
  };
  
  return (
    <Badge variant={variants[plan]}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

// Componente de badge de estado
function EstadoBadge({ activa }: { activa: boolean }) {
  return activa ? (
    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
      Activa
    </Badge>
  ) : (
    <Badge variant="destructive">
      Inactiva
    </Badge>
  );
}

export default function Farmacias() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroActiva, setFiltroActiva] = useState<string>('todas');
  const [filtroPlan, setFiltroPlan] = useState<string>('todos');

  // Construir filtros
  const filtros: {
    activa?: boolean;
    plan?: string;
    busqueda?: string;
  } = {};

  if (filtroActiva !== 'todas') {
    filtros.activa = filtroActiva === 'activas';
  }
  if (filtroPlan !== 'todos') {
    filtros.plan = filtroPlan;
  }
  if (busqueda.trim()) {
    filtros.busqueda = busqueda.trim();
  }

  const { data: farmacias, isLoading, error } = useFarmacias(filtros);
  const desactivarMutation = useDesactivarFarmacia();
  const activarMutation = useActivarFarmacia();

  const handleToggleActiva = async (farmacia: Farmacia) => {
    if (farmacia.activa) {
      if (!confirm(`¿Estás seguro de desactivar "${farmacia.nombre}"? Los usuarios no podrán acceder.`)) {
        return;
      }
      try {
        await desactivarMutation.mutateAsync(farmacia.id);
        toast.success('Farmacia desactivada correctamente');
      } catch {
        toast.error('Error al desactivar la farmacia');
      }
    } else {
      try {
        await activarMutation.mutateAsync(farmacia.id);
        toast.success('Farmacia activada correctamente');
      } catch {
        toast.error('Error al activar la farmacia');
      }
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar las farmacias
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Farmacias</h1>
          <p className="text-muted-foreground">
            Gestión de farmacias de la plataforma
          </p>
        </div>
        <Link to="/admin/farmacias/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Farmacia
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o slug..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filtroActiva} onValueChange={setFiltroActiva}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="activas">Activas</SelectItem>
                <SelectItem value="inactivas">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPlan} onValueChange={setFiltroPlan}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="profesional">Profesional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de farmacias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Farmacias
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando...' : `${farmacias?.length || 0} farmacias encontradas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : farmacias && farmacias.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmacia</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead className="text-center">Pacientes</TableHead>
                  <TableHead>Fecha Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmacias.map((farmacia) => (
                  <TableRow key={farmacia.id}>
                    <TableCell>
                      <div>
                        <Link 
                          to={`/admin/farmacias/${farmacia.id}`}
                          className="font-medium hover:underline"
                        >
                          {farmacia.nombre}
                        </Link>
                        <p className="text-sm text-muted-foreground">{farmacia.slug}</p>
                        {farmacia.email && (
                          <p className="text-xs text-muted-foreground">{farmacia.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={farmacia.plan} />
                    </TableCell>
                    <TableCell>
                      <EstadoBadge activa={farmacia.activa} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{farmacia.totalUsuarios || 0}</span>
                        <span className="text-muted-foreground">/ {farmacia.maxUsuarios}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span>{farmacia.totalPacientes || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(farmacia.fechaAlta).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/farmacias/${farmacia.id}`}>
                          <Button variant="ghost" size="icon" title="Ver detalle">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={farmacia.activa ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggleActiva(farmacia)}
                          disabled={desactivarMutation.isPending || activarMutation.isPending}
                        >
                          {farmacia.activa ? (
                            <PowerOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No hay farmacias</h3>
              <p className="mt-2 text-muted-foreground">
                No se encontraron farmacias con los filtros seleccionados.
              </p>
              <Link to="/admin/farmacias/nueva" className="mt-4 inline-block">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Farmacia
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
