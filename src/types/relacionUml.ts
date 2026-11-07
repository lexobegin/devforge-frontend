// src/types/relacionUml.ts
/**
 * Tipos de relaciones e interfaces UML.
 * Reflejan `app/schemas/diagrama_schema.py` del backend Ciclo 2.
 *
 * Alineado con el backend (todo es EMBEBIDO en el documento Diagrama):
 * - RelacionUML e InterfazUML no tienen id_diagrama (el alcance lo da
 *   la anidación) y su id es un str uuid.
 * - id_clase_origen / id_clase_destino son los ids uuid de las
 *   ClaseUML embebidas del MISMO diagrama (antes FK int entre tablas).
 * - OperacionInterfazUML no trae id_interfaz ni id_diagrama.
 */

import type { Id } from './common';

// ======================================================================
// Enum (diagrama_schema.py → TipoRelacion)
// ======================================================================
export type TipoRelacion =
  | 'ASOCIACION'
  | 'AGREGACION'
  | 'COMPOSICION'
  | 'DEPENDENCIA'
  | 'GENERALIZACION'
  | 'REALIZACION';

// ======================================================================
// Relación (RelacionUMLResponse — embebida en Diagrama.relaciones)
// ======================================================================
export interface RelacionUML {
  id: Id;
  id_clase_origen: Id;
  id_clase_destino: Id;
  tipo_relacion: TipoRelacion;
  multiplicidad_origen: string | null;
  multiplicidad_destino: string | null;
  nombre_asociacion: string | null;
  rol_origen: string | null;
  rol_destino: string | null;
}

export interface RelacionUMLCreate {
  id_clase_origen: Id;
  id_clase_destino: Id;
  tipo_relacion: TipoRelacion;
  multiplicidad_origen?: string | null;
  multiplicidad_destino?: string | null;
  nombre_asociacion?: string | null;
  rol_origen?: string | null;
  rol_destino?: string | null;
}

export interface RelacionUMLUpdate {
  id_clase_origen?: Id;
  id_clase_destino?: Id;
  tipo_relacion?: TipoRelacion;
  multiplicidad_origen?: string | null;
  multiplicidad_destino?: string | null;
  nombre_asociacion?: string | null;
  rol_origen?: string | null;
  rol_destino?: string | null;
}

// ======================================================================
// Interfaz UML (InterfazUMLResponse — embebida en Diagrama.interfaces)
// ======================================================================
export interface OperacionInterfazUML {
  id: Id;
  nombre: string;
  tipo_retorno: string;
}

export interface OperacionInterfazUMLCreate {
  nombre: string;
  tipo_retorno?: string;
}

export interface OperacionInterfazUMLUpdate {
  nombre?: string;
  tipo_retorno?: string;
}

export interface InterfazUML {
  id: Id;
  nombre: string;
  pos_x: number;
  pos_y: number;
  operaciones: OperacionInterfazUML[];
}

export interface InterfazUMLCreate {
  nombre: string;
  pos_x?: number;
  pos_y?: number;
  operaciones?: OperacionInterfazUMLCreate[];
}

export interface InterfazUMLUpdate {
  nombre?: string;
  pos_x?: number;
  pos_y?: number;
}