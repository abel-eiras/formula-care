import { 
  LayoutDashboard, 
  Users, 
  Sparkles, 
  FlaskConical,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  User,
  Building2,
  Shield,
  ClipboardList,
  Mail,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSolicitudesPendientesCount } from "@/hooks/useSolicitudes";

// Navegación principal para usuarios de farmacia
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Pacientes",
    url: "/pacientes",
    icon: Users,
  },
  {
    title: "Calendario",
    url: "/calendario",
    icon: CalendarDays,
  },
  {
    title: "Solicitudes",
    url: "/solicitudes",
    icon: ClipboardList,
  },
  {
    title: "Dermocosmética",
    url: "/servicios/dermo",
    icon: Sparkles,
  },
  {
    title: "Bioquímica",
    url: "/servicios/bio",
    icon: FlaskConical,
  },
];

// Navegación para superadmin
const adminNavigationItems = [
  {
    title: "Panel Admin",
    url: "/admin",
    icon: Shield,
  },
  {
    title: "Farmacias",
    url: "/admin/farmacias",
    icon: Building2,
  },
  {
    title: "Configuración SMTP",
    url: "/admin/configuracion-email",
    icon: Mail,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);

  // Verificar si es superadmin
  const isSuperadmin = useMemo(() => usuario?.rol === 'superadmin', [usuario]);

  // Obtener contador de solicitudes pendientes (solo para usuarios de farmacia)
  const solicitudesPendientes = useSolicitudesPendientesCount();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex flex-col animate-fade-in">
            {isSuperadmin ? (
              <>
                <span className="text-lg font-bold text-sidebar-foreground">Admin</span>
                <span className="text-sm font-medium text-sidebar-muted">Plataforma</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-sidebar-foreground">Fórmula</span>
                <span className="text-sm font-medium text-sidebar-muted">Care</span>
              </>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {/* Menú de superadmin - Solo muestra opciones de administración */}
        {isSuperadmin ? (
          <>
            {adminNavigationItems.map((item) => {
              const isActive = location.pathname === item.url || 
                (item.url !== "/admin" && location.pathname.startsWith(item.url));
              
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive 
                      ? "bg-amber-600 text-white font-semibold shadow-md" 
                      : "text-sidebar-foreground",
                    collapsed && "justify-center px-3"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-slide-in")} />
                  {!collapsed && (
                    <span className="animate-fade-in truncate">{item.title}</span>
                  )}
                </NavLink>
              );
            })}
          </>
        ) : (
          /* Menú normal para usuarios de farmacia */
          navigationItems.map((item) => {
            const isActive = location.pathname === item.url || 
              (item.url !== "/" && location.pathname.startsWith(item.url) && !location.pathname.startsWith("/admin"));
            const showBadge = item.url === '/solicitudes' && solicitudesPendientes > 0;
            
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md" 
                    : "text-sidebar-foreground",
                  collapsed && "justify-center px-3"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-slide-in")} />
                  {showBadge && collapsed && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                  )}
                </div>
                {!collapsed && (
                  <span className="animate-fade-in truncate flex-1">{item.title}</span>
                )}
                {showBadge && !collapsed && (
                  <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                    {solicitudesPendientes > 99 ? '99+' : solicitudesPendientes}
                  </Badge>
                )}
              </NavLink>
            );
          })
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Usuario actual */}
        {usuario && !collapsed && (
          <div className="px-4 py-2 text-xs text-sidebar-muted">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div className="truncate">
                <p className="font-medium text-sidebar-foreground truncate">{usuario.nombre}</p>
                <p className="truncate">{usuario.email}</p>
              </div>
            </div>
          </div>
        )}
        {/* Configuración solo para usuarios de farmacia, no superadmin */}
        {!isSuperadmin && (
          <NavLink
            to="/configuracion"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-3"
            )}
          >
            <Settings className="h-5 w-5" />
            {!collapsed && <span>Configuración</span>}
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full",
            "text-sidebar-muted hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-3"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
