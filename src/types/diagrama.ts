// src/types/diagrama.ts
/**
 * Tipos del módulo de diagramas UML.
 * Reflejan `app/schemas/diagrama_schema.py` del backend Ciclo 2.
 *
 * Alineado con el backend:
 * - Diagrama es el documento raíz (id string hex de ObjectId) con TODO
 *   el contenido UML EMBEBIDO: DiagramaCompletoResponse se construye en
 *   el backend con model_validate(diagrama), sin joins.
 * - version_uml por defecto "2.5.1" (el backend lo valida con max 10).
 * - numero_version lo lleva el documento (versionado de diagramas).
 * - id_creador es obligatorio en DiagramaResponse (a diferencia del
 *   id_creador nullable de las ClaseUML embebidas).
 */

import type { ISODateString, Id } from './common';
import type { ClaseUML } from './claseUml';
import type { InterfazUML, RelacionUML } from './relacionUml';

// ======================================================================
// Diagrama (DiagramaResponse)
// ======================================================================
export interface Diagrama {
  id: Id;
  id_proyecto: Id;
  nombre: string;
  /** "2.5.1" por defecto en el backend */
  version_uml: string;
  numero_version: number;
  id_creador: Id;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Diagrama con todo su contenido (payload que consume el editor).
 * Corresponde a `DiagramaCompletoResponse` del backend: clases,
 * interfaces y relaciones viven embebidas en el documento.
 */
export interface DiagramaCompleto extends Diagrama {
  clases: ClaseUML[];
  interfaces: InterfazUML[];
  relaciones: RelacionUML[];
}

// ======================================================================
// Requests
// ======================================================================
export interface DiagramaCreate {
  nombre: string;
  version_uml?: string;
}

export interface DiagramaUpdate {
  nombre?: string;
  version_uml?: string;
}