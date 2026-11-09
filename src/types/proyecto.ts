// src/types/proyecto.ts
/**
 * Tipos del módulo de proyectos y miembros.
 * Reflejan `app/schemas/proyecto_schema.py` del backend Ciclo 2.
 *
 * Alineado con el backend:
 * - MiembroProyecto es un documento EMBEBIDO en Proyecto.miembros: NO
 *   tiene id propio ni id_proyecto (el alcance lo da la anidación) y el
 *   backend no anida datos del usuario. El miembro se identifica por
 *   id_usuario (los endpoints PUT/DELETE /{proyecto_id}/miembros/
 *   {miembro_id} reciben el id_usuario, ver proyecto_service.py).
 */

import type { ISODateString, Id, PaginationParams } from './common';

// ======================================================================
// Enums / literales (proyecto_schema.py)
// ======================================================================
export type EstadoProyecto = 'ACTIVO' | 'ARCHIVADO';
export type RolEnProyecto = 'PROPIETARIO' | 'EDITOR' | 'LECTOR';

// ======================================================================
// Proyecto (ProyectoResponse)
// ======================================================================
export interface Proyecto {
  id: Id;
  nombre: string;
  descripcion: string | null;
  id_propietario: Id;
  estado: EstadoProyecto;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ProyectoConMiembros extends Proyecto {
  miembros: MiembroProyecto[];
}

export interface ProyectoCreate {
  nombre: string;
  descripcion?: string;
}

export interface ProyectoUpdate {
  nombre?: string;
  descripcion?: string;
  estado?: EstadoProyecto;
}

// ======================================================================
// Miembros (MiembroProyectoResponse — embebido en Proyecto.miembros)
// ======================================================================
export interface MiembroProyecto {
  /** Usuario miembro (el backend lo envía y recibe como string) */
  id_usuario: Id;
  rol_en_proyecto: RolEnProyecto;
  joined_at: ISODateString;
  /**
   * Tanda B23: nombre/email resueltos por el backend (join en memoria
   * contra usuarios). Pueden venir undefined/null si el usuario fue
   * eliminado — en ese caso el cliente muestra el id.
   */
  nombre_usuario?: string | null;
  email_usuario?: string | null;
}

export interface MiembroProyectoCreate {
  id_usuario: Id;
  /** El backend usa EDITOR por defecto */
  rol_en_proyecto?: RolEnProyecto;
}

export interface MiembroProyectoUpdate {
  rol_en_proyecto: RolEnProyecto;
}

// ======================================================================
// Filtros / queries (listar_proyectos: skip, limit, incluir_archivados,
// todos — este último solo ADMIN)
// ======================================================================
export interface ProyectosQuery extends PaginationParams {
  incluir_archivados?: boolean;
  todos?: boolean;
}

// ======================================================================
// Tanda B23 — Candidatos a miembro (GET /proyectos/{id}/candidatos)
// Repara el 403 del modal: GET /usuarios es solo-ADMIN; este endpoint
// por proyecto exige PROPIETARIO y devuelve solo activos no-miembros.
// ======================================================================
export interface UsuarioCandidato {
  id: Id;
  nombre_completo: string;
  email: string;
  rol: 'ADMIN' | 'LIDER' | 'DESARROLLADOR';
}

export interface CandidatosQuery {
  /** Texto libre: filtra por nombre o email (case-insensitive). */
  buscar?: string;
  /** 1..50 (el backend valida); default 20. */
  limit?: number;
}