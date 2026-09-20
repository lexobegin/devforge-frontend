// src/types/generacion.ts
/**
 * Tipos del módulo de generación automática de backend.
 * Reflejan `app/schemas/generacion_schema.py` del backend.
 */

import type { ISODateString, Id } from './common';

// ======================================================================
// Enums / literales
// ======================================================================
export type EstadoTrabajoGeneracion =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'EXITOSO'
  | 'FALLIDO';

export type StackDestino = 'SPRING_BOOT_JPA_POSTGRES';

// ======================================================================
// Regla de mapeo
// ======================================================================
export interface ReglaMapeo {
  id: Id;
  id_entidad_generada: Id;
  id_atributo_uml: Id;
  nombre_columna: string;
  tipo_sql: string;
  es_clave_primaria: boolean;
  es_nulleable: boolean;
}

// ======================================================================
// Entidad generada
// ======================================================================
export interface EntidadGenerada {
  id: Id;
  id_trabajo: Id;
  id_clase_uml: Id;
  nombre_clase_java: string;
  nombre_tabla: string;
  reglas_mapeo: ReglaMapeo[];
}

// ======================================================================
// Trabajo de generación
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

export interface TrabajoGeneracionDetalle extends TrabajoGeneracion {
  entidades: EntidadGenerada[];
}

// ======================================================================
// Requests de operación
// ======================================================================
export interface GenerarBackendRequest {
  stack_destino?: StackDestino;
  incluir_postman?: boolean;
  nombre_proyecto?: string;
  package_base?: string;
}

// ======================================================================
// Estado liviano (para polling)
// ======================================================================
export interface EstadoGeneracion {
  id: Id;
  estado: EstadoTrabajoGeneracion;
  progreso: number | null;
  mensaje: string | null;
  started_at: ISODateString | null;
  finished_at: ISODateString | null;
}

// ======================================================================
// Descarga
// ======================================================================
export interface DescargaProyecto {
  id_trabajo: Id;
  download_url: string;
  tamanio_bytes: number | null;
  incluye_postman: boolean;
}