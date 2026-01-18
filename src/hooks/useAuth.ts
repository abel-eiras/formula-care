/**
 * Hook de autenticación
 * Gestiona login, logout y estado del usuario
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Tipos
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'farmaceutico' | 'usuario';
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// Clave para localStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * Hook principal de autenticación
 */
export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as Usuario;
        setUsuario(user);
        // Configurar token en las peticiones API
        api.setAuthToken(token);
      } catch {
        // Token o usuario inválido, limpiar
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  /**
   * Iniciar sesión
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });

      // Guardar token y usuario
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));

      // Configurar token para futuras peticiones
      api.setAuthToken(response.token);

      // Actualizar estado
      setUsuario(response.usuario);
      setIsLoading(false);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Cerrar sesión
   */
  const logout = useCallback(() => {
    // Limpiar localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Limpiar token de API
    api.setAuthToken(null);

    // Limpiar estado
    setUsuario(null);

    // Invalidar todas las queries cacheadas
    queryClient.clear();
  }, [queryClient]);

  /**
   * Verificar si el usuario tiene un rol específico
   */
  const tieneRol = useCallback((...roles: string[]): boolean => {
    if (!usuario) return false;
    return roles.includes(usuario.rol);
  }, [usuario]);

  /**
   * Obtener el token actual
   */
  const getToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  return {
    usuario,
    isLoading,
    error,
    isAuthenticated: !!usuario,
    isAdmin: usuario?.rol === 'admin',
    login,
    logout,
    tieneRol,
    getToken,
  };
}

/**
 * Tipo para el contexto de autenticación
 */
export type AuthContextType = ReturnType<typeof useAuth>;
