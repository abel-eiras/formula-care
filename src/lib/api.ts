/**
 * Cliente HTTP para la API
 * La autenticación se gestiona mediante cookies HttpOnly — el cliente
 * no necesita manejar tokens manualmente.
 */

// Validar y construir la URL base del API
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;

  if (import.meta.env.DEV) {
    console.log('[API] VITE_API_URL from env:', envUrl);
  }

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const trimmed = envUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const cleanUrl = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
      if (import.meta.env.DEV) {
        console.log('[API] Using API URL:', cleanUrl);
      }
      return cleanUrl;
    }
  }

  const defaultUrl = 'http://localhost:3000/api';
  console.warn('[API] VITE_API_URL no está configurada correctamente, usando:', defaultUrl);
  return defaultUrl;
}

const API_BASE_URL = getApiBaseUrl();

if (import.meta.env.DEV) {
  console.log('[API] Base URL configured:', API_BASE_URL);
}

/**
 * Cliente HTTP que envía cookies en todas las peticiones (credentials: 'include').
 * El token JWT viaja en la cookie HttpOnly y nunca es accesible desde JavaScript.
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Headers comunes para todas las peticiones
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Maneja errores de respuesta, incluyendo 401 (sesión expirada)
   */
  private async handleResponseError(response: Response): Promise<never> {
    let errorMessage = `${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.mensaje || errorData.error;
      }
    } catch {
      // No se puede parsear el JSON — usar mensaje por defecto
    }

    // Si es 401 (sesión expirada o inválida), redirigir a login
    if (response.status === 401 && typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * GET
   */
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }

  /**
   * POST
   * @param options.signal - Opcional: AbortSignal para cancelar la petición (p. ej. timeout)
   */
  async post<T>(endpoint: string, data: unknown, options?: { signal?: AbortSignal }): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
      signal: options?.signal,
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }

  /**
   * PUT
   */
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    return response.json();
  }

  /**
   * DELETE
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    // DELETE puede devolver 204 No Content sin cuerpo
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }
}

// Instancia singleton del cliente API
export const api = new ApiClient(API_BASE_URL);
