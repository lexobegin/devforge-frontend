// src/types/generacion.ts
/**
 * Tipos del módulo de generación automática de backend.
 * Reflejan `app/schemas/generacion_schema.py` del backend Ciclo 2.
 *
 * Alineado con el backend (mismo patrón de embebidos que el diagrama):
 * - trabajo → entidades[] → reglas_mapeo[], todo EMBEBIDO en el
 *   documento TrabajoGeneracionCodigo. Por eso ReglaMapeo NO trae
 *   id/id_entidad_generada y EntidadGenerada NO trae id/id_trabajo.
 * - id_atributo_uml / id_clase_uml son los ids uuid de los elementos
 *   embebidos del Diagrama (antes FK int entre tablas).
 * - El backend llama EstadoGeneracion al Literal de 4 estados; aquí se
 *   tipa como EstadoTrabajoGeneracion y el DTO liviano de polling
 *   (EstadoGeneracionResponse) se espeja como EstadoGeneracion.
 * - StackDestino es Literal de un solo valor en el schema (el modelo
 *   acepta texto libre porque CU24 añadirá "REACT_TS_VITE").
 * - Defaults del backend: incluir_postman=true, es_nulleable=true,
 *   es_clave_primaria=false, progreso 0-100.
 */

import type { ISODateString, Id } from './common';

// ======================================================================
// Enums / literales (generacion_schema.py → EstadoGeneracion,
// StackDestino)
// ======================================================================
export type EstadoTrabajoGeneracion =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'EXITOSO'
  | 'FALLIDO';

export type StackDestino = 'SPRING_BOOT_JPA_POSTGRES';

// ======================================================================
// Regla de mapeo (ReglaMapeoResponse — embebida en EntidadGenerada)
// ======================================================================
export interface ReglaMapeo {
  id_atributo_uml: Id;
  nombre_columna: string;
  tipo_sql: string;
  es_clave_primaria: boolean;
  es_nulleable: boolean;
}

// ======================================================================
// Entidad generada (EntidadGeneradaResponse — embebida en el trabajo)
// ======================================================================
export interface EntidadGenerada {
  id_clase_uml: Id;
  nombre_clase_java: string;
  nombre_tabla: string;
  reglas_mapeo: ReglaMapeo[];
}

// ======================================================================
// Trabajo de generación (TrabajoGeneracionCodigoResponse)
// ======================================================================
export interface TrabajoGeneracion {
  id: Id;
  id_diagrama: Id;
  id_usuario: Id;
  stack_destino: StackDestino;
  estado: EstadoTrabajoGeneracion;
  ruta_salida: string | null;
  started_at: ISODateString | null;
  finished_at: ISODateString | null;
  created_at: ISODateString;
}

/**
 * Trabajo con el detalle completo (TrabajoGeneracionDetalleResponse):
 * el backend lo arma con model_validate(trabajo), entidades y reglas
 * incluidas.
 */
export interface TrabajoGeneracionDetalle extends TrabajoGeneracion {
  entidades: EntidadGenerada[];
}

// ======================================================================
// Requests de operación (GenerarBackendRequest)
// ======================================================================
export interface GenerarBackendRequest {
  stack_destino?: StackDestino;
  /** El backend genera la colección Postman por defecto */
  incluir_postman?: boolean;
  /** Nombre simbólico del proyecto generado (opcional, máx 100) */
  nombre_proyecto?: string;
  /** Package raíz Java, p. ej. "com.devforge.generated.salud" (máx 200) */
  package_base?: string;
}

// ======================================================================
// Estado liviano (EstadoGeneracionResponse — para polling)
// ======================================================================
export interface EstadoGeneracion {
  id: Id;
  estado: EstadoTrabajoGeneracion;
  /** Porcentaje estimado de avance (0-100), si se conoce */
  progreso: number | null;
  mensaje: string | null;
  started_at: ISODateString | null;
  finished_at: ISODateString | null;
}

// ======================================================================
// Descarga (DescargaProyectoResponse)
// ======================================================================
export interface DescargaProyecto {
  id_trabajo: Id;
  /** URL para descargar el ZIP del backend generado */
  download_url: string;
  tamanio_bytes: number | null;
  incluye_postman: boolean;
}