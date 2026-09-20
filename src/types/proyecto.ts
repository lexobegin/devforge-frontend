// src/types/proyecto.ts
/**
 * Tipos del módulo de proyectos y miembros.
 * Reflejan `app/schemas/proyecto_schema.py` del backend.
 */

import type { ISODateString, Id, PaginationParams } from './common';
import type { Usuario } from './usuario';

// ======================================================================
// Enums / literales
// ======================================================================
export type EstadoProyecto = 'ACTIVO' | 'ARCHIVADO';
export type RolEnProyecto = 'PROPIETARIO' | 'EDITOR' | 'LECTOR';

// ======================================================================
// Proyecto
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
// Miembros
// ======================================================================
export interface MiembroProyecto {
  id: Id;
  id_proyecto: Id;
  id_usuario: Id;
  rol_en_proyecto: RolEnProyecto;
  joined_at: ISODateString;
  /** Datos del usuario (solo si el backend los incluye en el response) */
  usuario?: Pick<Usuario, 'id' | 'nombre_completo' | 'email'>;
}

export interface MiembroProyectoCreate {
  id_usuario: Id;
  rol_en_proyecto?: RolEnProyecto;
}

export interface MiembroProyectoUpdate {
  rol_en_proyecto: RolEnProyecto;
}

// ======================================================================
// Filtros / queries
// ======================================================================
export interface ProyectosQuery extends PaginationParams {
  incluir_archivados?: boolean;
  todos?: boolean;
}