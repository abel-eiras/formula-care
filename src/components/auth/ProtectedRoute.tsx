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
  excludeRoles?: string[]; // Roles que NO pueden acceder
}

export function ProtectedRoute({ children, requiredRoles, requiredRole, excludeRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, tieneRol, usuario } = useAuthContext();
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

  // Si hay roles excluidos, verificar que el usuario no tenga ninguno
  if (excludeRoles && excludeRoles.length > 0 && usuario) {
    if (excludeRoles.includes(usuario.rol)) {
      return <Navigate to="/" state={{ error: 'No tienes permisos para acceder a esta página' }} replace />;
    }
  }

  // Si se requieren roles específicos, verificar
  if (rolesRequeridos && rolesRequeridos.length > 0) {
    if (!tieneRol(...rolesRequeridos)) {
      return <Navigate to="/" state={{ error: 'No tienes permisos para acceder a esta página' }} replace />;
    }
  }

  // Usuario autenticado y con permisos correctos
  return <>{children}</>;
}
