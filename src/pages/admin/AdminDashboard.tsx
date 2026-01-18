/**
 * Dashboard de Administración de Plataforma
 * Vista para superadmin con métricas globales
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEstadisticasPlataforma } from '@/hooks/useAdmin';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserCheck, 
  Calendar, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
} from 'lucide-react';

// Componente de tarjeta de estadística
function StatCard({ 
  titulo, 
  valor, 
  descripcion, 
  icono: Icon,
  variante = 'default'
}: {
  titulo: string;
  valor: string | number;
  descripcion?: string;
  icono: React.ElementType;
  variante?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    default: 'text-primary',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClasses[variante]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor}</div>
        {descripcion && (
          <p className="text-xs text-muted-foreground mt-1">{descripcion}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de badge de plan
function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    basico: 'outline',
    profesional: 'secondary',
    enterprise: 'default',
  };
  
  return (
    <Badge variant={variants[plan] || 'outline'}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useEstadisticasPlataforma();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar las estadísticas de la plataforma
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Vista general de la plataforma
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titulo="Total Farmacias"
          valor={stats.totalFarmacias}
          descripcion={`${stats.farmaciasActivas} activas, ${stats.farmaciasInactivas} inactivas`}
          icono={Building2}
        />
        <StatCard
          titulo="Total Usuarios"
          valor={stats.totalUsuarios}
          descripcion="Usuarios en plataforma"
          icono={Users}
        />
        <StatCard
          titulo="Total Pacientes"
          valor={stats.totalPacientes.toLocaleString()}
          descripcion="Pacientes gestionados"
          icono={UserCheck}
        />
        <StatCard
          titulo="Citas Hoy"
          valor={stats.citasHoy}
          descripcion={`${stats.citasSemana} esta semana, ${stats.citasMes} este mes`}
          icono={Calendar}
        />
      </div>

      {/* Distribución por plan */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Plan Básico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.farmaciasPorPlan.basico}</div>
            <p className="text-xs text-muted-foreground">farmacias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Plan Profesional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.farmaciasPorPlan.profesional}</div>
            <p className="text-xs text-muted-foreground">farmacias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Plan Enterprise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.farmaciasPorPlan.enterprise}</div>
            <p className="text-xs text-muted-foreground">farmacias</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de contenido */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Farmacias próximas a expirar */}
        {stats.farmaciasProximasExpirar.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Planes Próximos a Expirar
              </CardTitle>
              <CardDescription>
                Farmacias con plan expirando en los próximos 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.farmaciasProximasExpirar.map((farmacia) => (
                  <Link
                    key={farmacia.id}
                    to={`/admin/farmacias/${farmacia.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium">{farmacia.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Expira: {new Date(farmacia.fechaExpiracion).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <PlanBadge plan={farmacia.plan} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Últimas farmacias registradas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Últimas Farmacias
            </CardTitle>
            <CardDescription>
              Farmacias más recientes en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {stats.ultimasFarmacias.map((farmacia) => (
                  <Link
                    key={farmacia.id}
                    to={`/admin/farmacias/${farmacia.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{farmacia.nombre}</p>
                        {!farmacia.activa && (
                          <Badge variant="destructive" className="text-xs">Inactiva</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {farmacia.totalUsuarios} usuarios · {farmacia.totalPacientes} pacientes
                      </p>
                    </div>
                    <div className="text-right">
                      <PlanBadge plan={farmacia.plan} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(farmacia.fechaAlta).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimos accesos de usuarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {stats.actividadReciente.map((usuario) => (
                  <div
                    key={usuario.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{usuario.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {usuario.farmacia?.nombre || 'Superadmin'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{usuario.rol}</Badge>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {usuario.ultimoAcceso 
                          ? new Date(usuario.ultimoAcceso).toLocaleString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Sin acceso'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top farmacias por actividad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Top Farmacias
            </CardTitle>
            <CardDescription>
              Farmacias más activas por número de pacientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {stats.topFarmacias.map((farmacia, index) => (
                  <Link
                    key={farmacia.id}
                    to={`/admin/farmacias/${farmacia.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{farmacia.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {farmacia.totalPacientes} pacientes · {farmacia.totalCitas} citas
                      </p>
                    </div>
                    <PlanBadge plan={farmacia.plan} />
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/admin/farmacias/nueva"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Nueva Farmacia
            </Link>
            <Link
              to="/admin/farmacias"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Ver Todas las Farmacias
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
