/**
 * Contexto de autenticación
 * Provee acceso global al estado de autenticación
 */

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, type AuthContextType } from '@/hooks/useAuth';

// Crear contexto con valor undefined por defecto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider del contexto de autenticación
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
  }
  
  return context;
}
