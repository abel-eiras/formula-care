import { 
  LayoutDashboard, 
  Users, 
  Sparkles, 
  FlaskConical,
  CalendarDays,
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
            <span className="text-lg font-bold text-sidebar-foreground">Farmacia</span>
            <span className="text-sm font-medium text-sidebar-muted">Pontevea</span>
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
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url !== "/" && location.pathname.startsWith(item.url));
          
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md" 
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
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
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
        <button
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full",
            "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
