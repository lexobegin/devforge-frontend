// src/types/diagrama.ts
/**
 * Tipos del módulo de diagramas UML.
 * Reflejan `app/schemas/diagrama_schema.py` del backend.
 */

import type { ISODateString, Id } from './common';
import type { ClaseUML } from './claseUml';
import type { InterfazUML, RelacionUML } from './relacionUml';

// ======================================================================
// Diagrama
// ======================================================================
export interface Diagrama {
  id: Id;
  id_proyecto: Id;
  nombre: string;
  version_uml: string;
  numero_version: number;
  id_creador: Id;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Diagrama con todo su contenido (payload que consume el editor).
 * Corresponde a `DiagramaCompletoResponse` del backend.
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