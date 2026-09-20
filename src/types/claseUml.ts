// src/types/claseUml.ts
/**
 * Tipos de las clases, atributos, operaciones y parámetros UML.
 * Reflejan `app/schemas/diagrama_schema.py` del backend.
 */

import type { ISODateString, Id, UmlVisibility } from './common';

// ======================================================================
// Atributo
// ======================================================================
export interface AtributoUML {
  id: Id;
  id_clase: Id;
  nombre: string;
  tipo_dato: string;
  visibilidad: UmlVisibility;
  es_estatico: boolean;
  valor_defecto: string | null;
  orden: number;
}

export interface AtributoUMLCreate {
  nombre: string;
  tipo_dato: string;
  visibilidad?: UmlVisibility;
  es_estatico?: boolean;
  valor_defecto?: string | null;
  orden?: number;
}

export interface AtributoUMLUpdate {
  nombre?: string;
  tipo_dato?: string;
  visibilidad?: UmlVisibility;
  es_estatico?: boolean;
  valor_defecto?: string | null;
  orden?: number;
}

// ======================================================================
// Parámetro de operación
// ======================================================================
export interface ParametroOperacionUML {
  id: Id;
  id_operacion: Id;
  nombre: string;
  tipo_dato: string;
  orden: number;
}

export interface ParametroOperacionUMLCreate {
  nombre: string;
  tipo_dato: string;
  orden?: number;
}

export interface ParametroOperacionUMLUpdate {
  nombre?: string;
  tipo_dato?: string;
  orden?: number;
}

// ======================================================================
// Operación
// ======================================================================
export interface OperacionUML {
  id: Id;
  id_clase: Id;
  nombre: string;
  tipo_retorno: string;
  visibilidad: UmlVisibility;
  es_estatico: boolean;
  orden: number;
  parametros: ParametroOperacionUML[];
}

export interface OperacionUMLCreate {
  nombre: string;
  tipo_retorno?: string;
  visibilidad?: UmlVisibility;
  es_estatico?: boolean;
  orden?: number;
  parametros?: ParametroOperacionUMLCreate[];
}

export interface OperacionUMLUpdate {
  nombre?: string;
  tipo_retorno?: string;
  visibilidad?: UmlVisibility;
  es_estatico?: boolean;
  orden?: number;
}

// ======================================================================
// Clase
// ======================================================================
export interface ClaseUML {
  id: Id;
  id_diagrama: Id;
  nombre: string;
  es_abstracta: boolean;
  estereotipo: string | null;
  pos_x: number;
  pos_y: number;
  id_creador: Id;
  created_at: ISODateString;
  updated_at: ISODateString;
  atributos: AtributoUML[];
  operaciones: OperacionUML[];
}

export interface ClaseUMLCreate {
  nombre: string;
  es_abstracta?: boolean;
  estereotipo?: string | null;
  pos_x?: number;
  pos_y?: number;
  atributos?: AtributoUMLCreate[];
  operaciones?: OperacionUMLCreate[];
}

export interface ClaseUMLUpdate {
  nombre?: string;
  es_abstracta?: boolean;
  estereotipo?: string | null;
  pos_x?: number;
  pos_y?: number;
}