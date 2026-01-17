import { StatCard } from "@/components/dashboard/StatCard";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, Sparkles, FlaskConical, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Bienvenido a Farmacia Pontevea
        </h1>
        <p className="text-muted-foreground">
          Panel de gestión de servicios asistenciales
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pacientes"
          value={156}
          subtitle="Registrados este mes"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          variant="primary"
        />
        <StatCard
          title="Análisis Dermo"
          value={45}
          subtitle="Este mes"
          icon={Sparkles}
          trend={{ value: 8, isPositive: true }}
          variant="secondary"
        />
        <StatCard
          title="Análisis Bio"
          value={32}
          subtitle="Este mes"
          icon={FlaskConical}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Tasa Retorno"
          value="78%"
          subtitle="Pacientes recurrentes"
          icon={TrendingUp}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <EvolutionChart />
        </div>
        
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      {/* Recent Patients */}
      <RecentPatients />
    </div>
  );
}
