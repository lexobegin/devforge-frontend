// src/types/relacionUml.ts
/**
 * Tipos de relaciones e interfaces UML.
 * Reflejan `app/schemas/diagrama_schema.py` del backend.
 */

import type { Id } from './common';

// ======================================================================
// Enum
// ======================================================================
export type TipoRelacion =
  | 'ASOCIACION'
  | 'AGREGACION'
  | 'COMPOSICION'
  | 'DEPENDENCIA'
  | 'GENERALIZACION'
  | 'REALIZACION';

// ======================================================================
// Relación
// ======================================================================
export interface RelacionUML {
  id: Id;
  id_diagrama: Id;
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
// Interfaz UML
// ======================================================================
export interface OperacionInterfazUML {
  id: Id;
  id_interfaz: Id;
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
  id_diagrama: Id;
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