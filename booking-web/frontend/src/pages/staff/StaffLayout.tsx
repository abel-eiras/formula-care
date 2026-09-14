import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStaffLogout, useStaffSession } from '@/hooks/useStaff';
import { cn } from '@/lib/utils';

export default function StaffLayout() {
  const { data, isLoading, isError } = useStaffSession();
  const logout = useStaffLogout();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data?.autenticado) {
    return <Navigate to="/staff/login" replace />;
  }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent');

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-semibold">Panel de personal</h1>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="gap-2">
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 pb-3 flex gap-2">
          <NavLink to="/staff/solicitudes" className={tabClass}>
            Solicitudes
          </NavLink>
          <NavLink to="/staff/ajustes" className={tabClass}>
            Ajustes
          </NavLink>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
