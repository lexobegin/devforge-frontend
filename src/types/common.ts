// src/types/common.ts
/**
 * Tipos compartidos por todos los módulos.
 * Reflejan las respuestas estándar del backend.
 */

// ======================================================================
// Paginación
// ======================================================================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// ======================================================================
// Errores de la API
// ======================================================================
/**
 * Formato uniforme que devuelve el backend en cualquier error:
 * {
 *   "error": "NOT_FOUND",
 *   "detail": "El proyecto no existe",
 *   "path": "/api/v1/proyectos/42"
 * }
 */
export interface ApiErrorBody {
  error: string;
  detail: string;
  path?: string;
  extra?: Record<string, unknown>;
}

// ======================================================================
// Timestamps
// ======================================================================
export type ISODateString = string;

// ======================================================================
// IDs
// ======================================================================
export type Id = number;

// ======================================================================
// Estado de carga genérico
// ======================================================================
export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

// ======================================================================
// Resultado de operaciones asíncronas en stores
// ======================================================================
export interface AsyncState {
  status: LoadStatus;
  error: string | null;
}

// ======================================================================
// Tipos de visibilidad UML (compartido entre atributos y operaciones)
// ======================================================================
export type UmlVisibility = '+' | '-' | '#' | '~';