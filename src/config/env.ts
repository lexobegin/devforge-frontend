// src/config/env.ts
/**
 * Configuración de entorno del frontend web.
 *
 * Vite expone al cliente SOLO las variables con prefijo VITE_.
 * Este módulo centraliza su lectura y validación para que ningún
 * componente las lea directamente de `import.meta.env`.
 */

type AppEnv = 'development' | 'production' | 'test';

interface EnvConfig {
  /** URL base de la API REST (con /api/v1 al final). */
  apiBaseUrl: string;
  /** URL base del WebSocket de colaboración. */
  wsBaseUrl: string;
  /** Entorno actual. */
  appEnv: AppEnv;
  /** Versión de la app (para mostrar en footer, etc.). */
  appVersion: string;
  /** Timeout por defecto de las requests HTTP (ms). */
  apiTimeoutMs: number;
  /** Feature flags. */
  features: {
    pwa: boolean;
    offline: boolean;
    aiVision: boolean;
  };
  /** WebSocket: reconexión. */
  ws: {
    reconnectMaxAttempts: number;
    reconnectInitialDelayMs: number;
  };
}

// ----------------------------------------------------------------------
// Helpers de lectura
// ----------------------------------------------------------------------
function readString(key: string, fallback: string): string {
  const value = import.meta.env[key];
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

function readNumber(key: string, fallback: number): number {
  const value = import.meta.env[key];
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readBool(key: string, fallback: boolean): boolean {
  const value = import.meta.env[key];
  if (typeof value !== 'string') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

function readAppEnv(): AppEnv {
  const v = readString('VITE_APP_ENV', 'development').toLowerCase();
  if (v === 'production' || v === 'test') return v;
  return 'development';
}

// ----------------------------------------------------------------------
// Configuración derivada
// ----------------------------------------------------------------------
const apiBaseUrl = readString(
  'VITE_API_BASE_URL',
  'http://localhost:8000/api/v1'
).replace(/\/+$/, ''); // sin slash final

const wsBaseUrl = readString(
  'VITE_WS_BASE_URL',
  'ws://localhost:8000'
).replace(/\/+$/, '');

export const env: EnvConfig = {
  apiBaseUrl,
  wsBaseUrl,
  appEnv: readAppEnv(),
  appVersion: readString('VITE_APP_VERSION', '0.1.0'),
  apiTimeoutMs: readNumber('VITE_API_TIMEOUT_MS', 30_000),
  features: {
    pwa: readBool('VITE_ENABLE_PWA', true),
    offline: readBool('VITE_ENABLE_OFFLINE', true),
    aiVision: readBool('VITE_ENABLE_AI_VISION', true),
  },
  ws: {
    reconnectMaxAttempts: readNumber('VITE_WS_RECONNECT_MAX_ATTEMPTS', 10),
    reconnectInitialDelayMs: readNumber(
      'VITE_WS_RECONNECT_INITIAL_DELAY_MS',
      1000
    ),
  },
};

// ----------------------------------------------------------------------
// Helpers derivados
// ----------------------------------------------------------------------
export const isDev = env.appEnv === 'development';
export const isProd = env.appEnv === 'production';

/** Construye la URL completa del WebSocket para un diagrama. */
export function buildDiagramWsUrl(diagramaId: number, token: string): string {
  return `${env.wsBaseUrl}/ws/diagramas/${diagramaId}?token=${encodeURIComponent(token)}`;
}