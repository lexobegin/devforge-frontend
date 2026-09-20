// src/api/httpClient.ts
/**
 * Cliente HTTP base de DevForge AI.
 *
 * Responsabilidades:
 * - Instancia de axios con baseURL, timeout y headers por defecto.
 * - Interceptor de request: adjunta el JWT y agrega el idioma si aplica.
 * - Interceptor de response:
 *     - Normaliza errores a `ApiError` (con status, code, message).
 *     - Ante 401, intenta refrescar el access token UNA vez y reintenta.
 *     - Si el refresh falla, dispara logout global (evento `auth:logout`).
 *
 * El token y el refresh se guardan en localStorage con claves:
 *   - `devforge_access_token`
 *   - `devforge_refresh_token`
 *
 * Los stores (Fase 5) leerán/escribirán estos valores a través de helpers
 * exportados aquí para mantener una única fuente de verdad.
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import type { ApiErrorBody } from '@/types';

// ======================================================================
// Claves de almacenamiento
// ======================================================================
export const STORAGE_KEYS = {
  accessToken: 'devforge_access_token',
  refreshToken: 'devforge_refresh_token',
} as const;

// ======================================================================
// Helpers de token (única fuente de verdad)
// ======================================================================
export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  },
  getRefresh(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  },
  set(access: string, refresh: string): void {
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  },
    /**
   * Devuelve un access token VÁLIDO (no expirado).
   * Si el actual está expirado o expira en <60s, refresca primero.
   * Reutiliza la misma cola que el interceptor para no duplicar refresh.
   */
  async getValidAccess(): Promise<string | null> {
    const access = tokenStorage.getAccess();
    if (access && !isTokenExpiringSoon(access, 60)) {
      return access;
    }

    // Necesita refresh
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve,
          reject: () => reject(new Error('Refresh falló')),
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      flushQueue(null, newToken);
      return newToken;
    } catch (err) {
      flushQueue(err, null);
      tokenStorage.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return null;
    } finally {
      isRefreshing = false;
    }
  },
};

/** Decodifica el payload de un JWT sin verificar firma. */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** ¿El token expira en menos de `thresholdSeconds`? */
function isTokenExpiringSoon(token: string, thresholdSeconds: number): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now < thresholdSeconds;
}

// ======================================================================
// Error normalizado
// ======================================================================
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly path?: string;
  readonly extra?: Record<string, unknown>;

  constructor(params: {
    status: number;
    code: string;
    detail: string;
    path?: string;
    extra?: Record<string, unknown>;
  }) {
    super(params.detail);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.detail = params.detail;
    this.path = params.path;
    this.extra = params.extra;
  }

  /** ¿Es un error de validación? (422) */
  get isValidation(): boolean {
    return this.status === 422;
  }

  /** ¿Es un error de autenticación? (401) */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** ¿Es un error de permisos? (403) */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** ¿Es un 404? */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** ¿Es un 409 (conflicto)? */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

// ======================================================================
// Instancia de axios
// ======================================================================
export const httpClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ======================================================================
// Interceptor de REQUEST
// ======================================================================
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ======================================================================
// REFRESH — cola de espera
// ======================================================================
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error ?? new Error('Refresh falló'));
    } else {
      resolve(token);
    }
  });
  pendingQueue = [];
}

// ======================================================================
// Refresh token — llamada al endpoint del backend
// ======================================================================
async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    throw new ApiError({
      status: 401,
      code: 'NO_REFRESH_TOKEN',
      detail: 'No hay refresh token disponible',
    });
  }

  // Llamada directa (sin pasar por httpClient para evitar bucles)
  const response = await axios.post(
    `${env.apiBaseUrl}/auth/refresh`,
    { refresh_token: refresh },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { access_token, refresh_token } = response.data as {
    access_token: string;
    refresh_token: string;
  };

  tokenStorage.set(access_token, refresh_token);
  return access_token;
}

// ======================================================================
// Interceptor de RESPONSE
// ======================================================================
httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Si no hay respuesta del servidor (timeout, red caída)
    if (!error.response) {
      const networkError = new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        detail:
          error.code === 'ECONNABORTED'
            ? 'La solicitud tardó demasiado. Verifique su conexión.'
            : 'No se pudo conectar con el servidor.',
      });
      return Promise.reject(networkError);
    }

    const { status, data, config } = error.response;
    const path = config?.url ?? undefined;

    // --- 401: intentar refresh (excepto en endpoints de auth) ---
    const isAuthEndpoint =
      typeof path === 'string' &&
      (path.includes('/auth/login') ||
        path.includes('/auth/refresh') ||
        path.includes('/auth/registro'));

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      // Si ya hay un refresh en curso, esperar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
              resolve(httpClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        flushQueue(null, newToken);
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return httpClient(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        tokenStorage.clear();
        // Disparar logout global para que los stores limpien su estado
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(
          new ApiError({
            status: 401,
            code: 'SESSION_EXPIRED',
            detail: 'La sesión expiró. Inicie sesión nuevamente.',
          })
        );
      } finally {
        isRefreshing = false;
      }
    }

    // --- Cualquier otro error: normalizar ---
    const normalized = new ApiError({
      status,
      code: data?.error ?? `HTTP_${status}`,
      detail: data?.detail ?? 'Ocurrió un error inesperado',
      path: data?.path,
      extra: data?.extra,
    });

    return Promise.reject(normalized);
  }
);

// ======================================================================
// Helpers de conveniencia (para no repetir `httpClient.get<X>(...)`)
// ======================================================================
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    httpClient.get<T>(url, config).then((r) => r.data),

  post: <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => httpClient.post<T>(url, body, config).then((r) => r.data),

  put: <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => httpClient.put<T>(url, body, config).then((r) => r.data),

  patch: <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => httpClient.patch<T>(url, body, config).then((r) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    httpClient.delete<T>(url, config).then((r) => r.data),
};

// ======================================================================
// Utilidad para subir archivos (multipart/form-data)
// ======================================================================
export function uploadFile<T>(
  url: string,
  file: File,
  extraFields?: Record<string, string | Blob>
): Promise<T> {
  const formData = new FormData();
  formData.append('archivo', file);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }
  }
  return httpClient
    .post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}