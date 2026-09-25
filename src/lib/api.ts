/**
 * Cliente HTTP para la API.
 *
 * Autenticación: el token de sesión se envía en la cabecera Authorization.
 * La cookie HttpOnly que también pone el servidor no sirve en la app de
 * escritorio: su webview (tauri://localhost o http://tauri.localhost) es un
 * sitio distinto de http://localhost:4577 y descarta la cookie.
 */

// Token de sesión: en memoria y en localStorage (compartido con las ventanas
// e iframes de impresión y con los reinicios de la app hasta que caduca)
const CLAVE_TOKEN = 'auth_token';
let tokenSesion: string | null = null;
try {
  tokenSesion = localStorage.getItem(CLAVE_TOKEN);
} catch {
  // localStorage no disponible: la sesión solo dura en memoria
}

export function guardarTokenSesion(token: string | null): void {
  tokenSesion = token;
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

// Validar y construir la URL base del API.
// El backend corre embebido en localhost junto a la app de escritorio;
// VITE_API_URL solo hace falta para apuntar a otro puerto en desarrollo.
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
      ...(tokenSesion ? { Authorization: `Bearer ${tokenSesion}` } : {}),
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
      guardarTokenSesion(null);
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

  /** GET de una respuesta de texto (informes) */
  async getTexto(endpoint: string): Promise<string> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      await this.handleResponseError(response);
    }
    return response.text();
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
