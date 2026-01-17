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
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Realiza una petición GET
   */
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Realiza una petición POST
   */
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Intentar obtener el mensaje de error del backend
      let errorMessage = `${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `Error ${response.status}: ${errorData.error}`;
          if (errorData.detalles) {
            errorMessage += ` - ${JSON.stringify(errorData.detalles)}`;
          }
        }
      } catch {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Realiza una petición PUT
   */
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Instancia singleton del cliente API
export const api = new ApiClient(API_BASE_URL);
