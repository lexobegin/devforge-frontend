// src/types/common.ts
/**
 * Tipos compartidos por todos los módulos.
 * Reflejan las convenciones del backend Ciclo 2 (MongoDB + Beanie):
 *
 * - IDs: el backend usa PydanticObjectId (Beanie los serializa como
 *   STRING HEX en JSON) para documentos (Usuario, Proyecto, Diagrama...)
 *   y str uuid para los elementos EMBEBIDOS (ClaseUML, AtributoUML,
 *   RelacionUML...). Por eso Id = string, NUNCA number.
 * - Errores: app/core/exceptions.py responde siempre
 *   {"error", "detail", "path", "extra"?} con los códigos de
 *   ApiErrorCode (o HTTP_<status> / DB_DUPLICATE_KEY / INTERNAL_ERROR).
 * - Listados: los routers devuelven {"items", "total", "skip", "limit"}.
 */

// ======================================================================
// Paginación (formato real de los routers: p. ej. proyectos_router.py)
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
// Errores de la API (app/core/exceptions.py — respuesta uniforme)
// ======================================================================
/**
 * Códigos de dominio fijos. El backend también puede devolver
 * `HTTP_<status>` (HTTPException de Starlette), `DB_DUPLICATE_KEY`
 * (índice único de MongoDB, p. ej. email repetido) o `INTERNAL_ERROR`
 * (fallback 500), por eso ApiErrorBody.error se tipa como string.
 */
export type ApiErrorCode =
  | 'NOT_FOUND' // 404
  | 'BAD_REQUEST' // 400
  | 'UNAUTHORIZED' // 401 (con header WWW-Authenticate: Bearer)
  | 'FORBIDDEN' // 403
  | 'CONFLICT' // 409
  | 'VALIDATION_ERROR' // 422 (extra.errors trae el detalle de Pydantic)
  | 'GENERATION_ERROR' // 500 (motor de generación de código)
  | 'AI_SERVICE_ERROR' // 502 (proveedor de IA)
  | 'DB_DUPLICATE_KEY' // 409 (unicidad MongoDB)
  | 'INTERNAL_ERROR'; // 500 (fallback)

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
// Timestamps (ISO 8601 que serializa Pydantic, p. ej. "2026-05-01T12:00:00Z")
// ======================================================================
export type ISODateString = string;

// ======================================================================
// IDs: string hex de ObjectId (documentos) o uuid (elementos embebidos)
// ======================================================================
export type Id = string;

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
// Visibilidad UML (app/schemas/diagrama_schema.py → Visibilidad;
// compartido entre atributos y operaciones)
// ======================================================================
export type UmlVisibility = '+' | '-' | '#' | '~';