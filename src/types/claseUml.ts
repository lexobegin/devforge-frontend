// src/types/claseUml.ts
/**
 * Tipos de clases, atributos, operaciones y parámetros UML.
 * Reflejan `app/schemas/diagrama_schema.py` del backend Ciclo 2.
 *
 * Alineado con el backend (todo es EMBEBIDO en el documento Diagrama):
 * - ClaseUML / AtributoUML / OperacionUML / ParametroOperacionUML no son
 *   entidades con FK: viven anidadas, así que sus Response NO traen
 *   id_diagrama / id_clase / id_operacion (el alcance lo da la anidación).
 * - El id de cada elemento embebido es un str uuid (lo genera el modelo
 *   o el propio lienzo, estable incluso antes de persistir).
 * - ClaseUMLResponse.id_creador es opcional (puede ser null).
 * - Defaults del backend: visibilidad de atributo "-", de operación "+",
 *   tipo_retorno "void", orden 0, es_estatico/es_abstracta false.
 * - Los *Update de clase NO aceptan atributos/operaciones: se gestionan
 *   por sus propios endpoints (y es el formato del ejecutor del Agente
 *   Dev para MODIFICAR_CLASE).
 */

import type { ISODateString, Id, UmlVisibility } from './common';

// ======================================================================
// Atributo (AtributoUMLResponse — embebido en ClaseUML.atributos)
// ======================================================================
export interface AtributoUML {
  id: Id;
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
// Parámetro de operación (embebido en OperacionUML.parametros)
// ======================================================================
export interface ParametroOperacionUML {
  id: Id;
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
// Operación (OperacionUMLResponse — embebida en ClaseUML.operaciones)
// ======================================================================
export interface OperacionUML {
  id: Id;
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
// Clase (ClaseUMLResponse — embebida en Diagrama.clases)
// ======================================================================
export interface ClaseUML {
  id: Id;
  nombre: string;
  es_abstracta: boolean;
  estereotipo: string | null;
  pos_x: number;
  pos_y: number;
  /** Puede ser null (el backend lo declara Optional) */
  id_creador: Id | null;
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