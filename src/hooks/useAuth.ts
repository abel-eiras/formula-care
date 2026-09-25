/**
 * Hook de autenticación
 * Gestiona login, logout y estado del usuario.
 * El token de sesión lo guarda el cliente de la API (@/lib/api) y viaja en
 * la cabecera Authorization (ver allí por qué no basta la cookie).
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, guardarTokenSesion } from '@/lib/api';

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

// Clave para persistir datos no sensibles del usuario en sessionStorage
const USER_KEY = 'auth_user';

/**
 * Hook principal de autenticación
 */
export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Al montar: restaurar usuario de sessionStorage y verificar sesión activa en el servidor
  useEffect(() => {
    const userStr = sessionStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        setUsuario(JSON.parse(userStr) as Usuario);
      } catch {
        sessionStorage.removeItem(USER_KEY);
      }
    }

    // Verificar que la cookie sigue siendo válida
    api.get<{ id: string; email: string; nombre: string; rol: string }>('/auth/me')
      .then((data) => {
        const user: Usuario = {
          id: data.id,
          email: data.email,
          nombre: data.nombre,
          rol: data.rol as Usuario['rol'],
        };
        setUsuario(user);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      })
      .catch(() => {
        // Cookie inválida o expirada
        setUsuario(null);
        sessionStorage.removeItem(USER_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Iniciar sesión
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });

      guardarTokenSesion(response.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
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
   * Crear la cuenta de administrador inicial (solo funciona en el primer
   * arranque de una instalación, cuando todavía no existe ningún usuario).
   */
  const setupInicial = useCallback(async (email: string, password: string, nombre: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/setup-inicial', { email, password, nombre });

      guardarTokenSesion(response.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
      setUsuario(response.usuario);
      setIsLoading(false);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la cuenta de administrador';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Cerrar sesión: se invalida la sesión en el servidor y se olvida el token local
   */
  const logout = useCallback(async (motivo?: 'inactividad') => {
    try {
      await api.post('/auth/logout', motivo ? { motivo } : {});
    } catch {
      // Continuar aunque falle la petición
    }

    guardarTokenSesion(null);
    sessionStorage.removeItem(USER_KEY);
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  /**
   * Verificar si el usuario tiene un rol específico
   */
  const tieneRol = useCallback((...roles: string[]): boolean => {
    if (!usuario) return false;
    return roles.includes(usuario.rol);
  }, [usuario]);

  return {
    usuario,
    isLoading,
    error,
    isAuthenticated: !!usuario,
    isAdmin: usuario?.rol === 'admin',
    login,
    setupInicial,
    logout,
    tieneRol,
  };
}

/**
 * Tipo para el contexto de autenticación
 */
export type AuthContextType = ReturnType<typeof useAuth>;
