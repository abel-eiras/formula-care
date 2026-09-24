import { StatCard } from "@/components/dashboard/StatCard";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { NotificacionesWidget } from "@/components/dashboard/NotificacionesWidget";
import { ProximasRevisiones } from "@/components/dashboard/ProximasRevisiones";
import { ProximosCumpleanos } from "@/components/dashboard/ProximosCumpleanos";
import { Users, Sparkles, FlaskConical, Salad, TrendingUp } from "lucide-react";
import { useEstadisticas } from "@/hooks/useEstadisticas";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Dashboard() {
  const { data: estadisticas, isLoading } = useEstadisticas();
  const { data: config } = useConfiguracion();
  const nombreFarmacia = config?.farmaciaNombre || 'tu farmacia';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Bienvenido a {nombreFarmacia}
        </h1>
        <p className="text-muted-foreground">
          Panel de gestión de servicios asistenciales
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Pacientes"
          value={estadisticas?.pacientes.total || 0}
          subtitle={`${estadisticas?.pacientes.esteMes || 0} registrados este mes`}
          icon={Users}
          trend={{
            value: estadisticas?.pacientes.tendencia || 0,
            isPositive: (estadisticas?.pacientes.tendencia || 0) >= 0,
          }}
          variant="primary"
        />
        <StatCard
          title="Análisis Dermo"
          value={estadisticas?.analisisDermo.esteMes || 0}
          subtitle="Este mes"
          icon={Sparkles}
          trend={{
            value: estadisticas?.analisisDermo.tendencia || 0,
            isPositive: (estadisticas?.analisisDermo.tendencia || 0) >= 0,
          }}
          variant="secondary"
        />
        <StatCard
          title="Análisis Bio"
          value={estadisticas?.analisisBio.esteMes || 0}
          subtitle="Este mes"
          icon={FlaskConical}
          trend={{
            value: estadisticas?.analisisBio.tendencia || 0,
            isPositive: (estadisticas?.analisisBio.tendencia || 0) >= 0,
          }}
        />
        <StatCard
          title="Visitas Nutrición"
          value={estadisticas?.visitasNutricion.esteMes || 0}
          subtitle="Este mes"
          icon={Salad}
          trend={{
            value: estadisticas?.visitasNutricion.tendencia || 0,
            isPositive: (estadisticas?.visitasNutricion.tendencia || 0) >= 0,
          }}
        />
        <StatCard
          title="Tasa Retorno"
          value={`${estadisticas?.tasaRetorno.valor || 0}%`}
          subtitle={`${estadisticas?.tasaRetorno.pacientesRecurrentes || 0} de ${estadisticas?.tasaRetorno.totalPacientes || 0} pacientes`}
          icon={TrendingUp}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <EvolutionChart />
          <ProximosCumpleanos />
        </div>
        
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <QuickActions />
          <NotificacionesWidget />
        </div>
      </div>

      {/* Second Row: Recent Patients and Upcoming Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPatients />
        <ProximasRevisiones />
      </div>
    </div>
  );
}
