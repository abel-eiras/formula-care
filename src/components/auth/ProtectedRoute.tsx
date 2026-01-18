/**
 * Componente para proteger rutas que requieren autenticación
 */

import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredRole?: string; // Alias para un solo rol
}

export function ProtectedRoute({ children, requiredRoles, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, tieneRol } = useAuthContext();
  const location = useLocation();

  // Combinar requiredRole con requiredRoles
  const rolesRequeridos = requiredRole 
    ? [requiredRole, ...(requiredRoles || [])]
    : requiredRoles;

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requieren roles específicos, verificar
  if (rolesRequeridos && rolesRequeridos.length > 0) {
    if (!tieneRol(...rolesRequeridos)) {
      // No tiene permisos, redirigir a dashboard con mensaje
      return <Navigate to="/" state={{ error: 'No tienes permisos para acceder a esta página' }} replace />;
    }
  }

  // Usuario autenticado y con permisos correctos
  return <>{children}</>;
}
