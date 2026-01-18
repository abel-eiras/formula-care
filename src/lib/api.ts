/**
 * Cliente HTTP para la API
 * Preparado para cuando se implemente el backend
 */

// Validar y construir la URL base del API
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Debug: mostrar qué valor tiene la variable de entorno
  if (import.meta.env.DEV) {
    console.log('[API] VITE_API_URL from env:', envUrl);
  }
  
  // Si está definida y es válida, usarla
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const trimmed = envUrl.trim();
    // Validar que tenga protocolo y host
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Asegurar que no termine con / para evitar doble slash
      const cleanUrl = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
      if (import.meta.env.DEV) {
        console.log('[API] Using API URL:', cleanUrl);
      }
      return cleanUrl;
    }
  }
  
  // Fallback por defecto
  const defaultUrl = 'http://localhost:3000/api';
  console.warn('[API] VITE_API_URL no está configurada correctamente, usando:', defaultUrl);
  return defaultUrl;
}

const API_BASE_URL = getApiBaseUrl();

// Log final en desarrollo
if (import.meta.env.DEV) {
  console.log('[API] Base URL configured:', API_BASE_URL);
}

/**
 * Cliente HTTP simple para hacer peticiones a la API
 * Incluye soporte para autenticación JWT
 */
class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Cargar token de localStorage al iniciar
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token');
    }
  }

  /**
   * Configura el token de autenticación
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Obtiene los headers comunes incluyendo autenticación si existe
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Maneja errores de respuesta, incluyendo 401 (token expirado)
   */
  private async handleResponseError(response: Response): Promise<never> {
    let errorMessage = `${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.mensaje || errorData.error;
      }
    } catch {
      // Si no se puede parsear el JSON, usar el mensaje por defecto
    }

    // Si es 401, limpiar la sesión
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      this.authToken = null;
      // Redirigir a login solo si no estamos ya en login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * Realiza una petición GET
   */
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }

  /**
   * Realiza una petición POST
   */
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }

  /**
   * Realiza una petición PUT
   */
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }
}

// Instancia singleton del cliente API
export const api = new ApiClient(API_BASE_URL);
