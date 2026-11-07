// src/api/trazabilidadApi.ts
/**
 * Endpoints del módulo de trazabilidad: historial, versiones y comentarios.
 * Corresponde a `app/api/v1/trazabilidad_router.py` del backend Ciclo 2.
 *
 * Convención de ids (Ciclo 2, todo embebido):
 * - `diagramaId` / `versionId` / `comentarioId`: ObjectId hex del
 *   documento (string).
 * - `idEntidad`: uuid str del ELEMENTO EMBEBIDO del Diagrama
 *   (ClaseUML.id, AtributoUML.id, RelacionUML.id…) — en el Ciclo 1 era
 *   el int del serial. El backend hace `tipo_entidad.upper()`, puede
 *   pasarse en cualquier caja.
 *
 * Defaults del backend: historial/comentarios limit=100 (máx 500);
 * versiones limit=50 (máx 200). `desde`/`hasta` son ISO 8601.
 */

import { http } from './httpClient';
import type { ISODateString, Id } from '@/types';

// ======================================================================
// Tipos locales (app/schemas/trazabilidad_schema.py)
// ======================================================================

/** Un solo vocabulario para historial, cola offline y Agente Dev. */
export type TipoCambio = 'CREAR' | 'MODIFICAR' | 'ELIMINAR';

/** HistorialCambioDiagramaResponse (datos_cambio = snapshot antes/después). */
export interface HistorialCambio {
  id: Id;
  id_diagrama: Id;
  id_usuario: Id;
  tipo_cambio: TipoCambio;
  tipo_entidad: string;
  /** uuid del elemento embebido afectado (no FK int como en el Ciclo 1). */
  id_entidad: Id;
  datos_cambio: Record<string, unknown>;
  created_at: ISODateString;
}

/** Vista liviana de una versión (sin contenido_json, que puede pesar megas). */
export interface VersionDiagramaResumen {
  id: Id;
  id_diagrama: Id;
  numero_version: number;
  id_usuario: Id;
  comentario: string | null;
  created_at: ISODateString;
}

/** VersionDiagramaResponse: resumen + contenido_json (Diagrama completo). */
export interface VersionDiagrama extends VersionDiagramaResumen {
  contenido_json: Record<string, unknown>;
}

/**
 * Payload para guardar un snapshot. NO lleva numero_version: lo calcula
 * el service (siguiente correlativo, índice único uq_version_diagrama_numero).
 */
export interface VersionDiagramaCreate {
  contenido_json: Record<string, unknown>;
  comentario?: string | null;
}

/** ComentarioDiagramaResponse (ambas refs en null = comentario general). */
export interface ComentarioDiagrama {
  id: Id;
  id_diagrama: Id;
  id_usuario: Id;
  tipo_entidad: string | null;
  id_entidad: Id | null;
  texto: string;
  resuelto: boolean;
  created_at: ISODateString;
}

export interface ComentarioDiagramaCreate {
  tipo_entidad?: string | null;
  id_entidad?: Id | null;
  texto: string;
}

/**
 * Solo el autor puede editar el `texto`; cualquier EDITOR/PROPIETARIO
 * puede marcar `resuelto` (regla del backend).
 */
export interface ComentarioDiagramaUpdate {
  texto?: string;
  resuelto?: boolean;
}

// ======================================================================
// API
// ======================================================================
export const trazabilidadApi = {
  // ------------------------------------------------------------------
  // HISTORIAL
  // ------------------------------------------------------------------
  /** Historial de cambios del diagrama, con rango de fechas opcional. */
  listarHistorial(
    diagramaId: Id,
    params: {
      desde?: string;
      hasta?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<HistorialCambio[]> {
    return http.get<HistorialCambio[]>(
      `/trazabilidad/diagramas/${diagramaId}/historial`,
      { params }
    );
  },

  /** Historial de un elemento concreto (tipo_entidad='CLASE' + uuid). */
  listarHistorialDeElemento(
    diagramaId: Id,
    tipoEntidad: string,
    idEntidad: Id
  ): Promise<HistorialCambio[]> {
    return http.get<HistorialCambio[]>(
      `/trazabilidad/diagramas/${diagramaId}/historial/${tipoEntidad}/${idEntidad}`
    );
  },

  // ------------------------------------------------------------------
  // VERSIONES
  // ------------------------------------------------------------------
  /** Metadatos de las versiones, SIN contenido_json. */
  listarVersiones(
    diagramaId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<VersionDiagramaResumen[]> {
    return http.get<VersionDiagramaResumen[]>(
      `/trazabilidad/diagramas/${diagramaId}/versiones`,
      { params }
    );
  },

  /**
   * Guarda un snapshot completo (201 Created). El número de versión se
   * calcula en el backend y además incrementa diagramas.numero_version.
   */
  guardarVersion(
    diagramaId: Id,
    payload: VersionDiagramaCreate
  ): Promise<VersionDiagrama> {
    return http.post<VersionDiagrama>(
      `/trazabilidad/diagramas/${diagramaId}/versiones`,
      payload
    );
  },

  /** Versión completa por id (incluye contenido_json). */
  obtenerVersion(versionId: Id): Promise<VersionDiagrama> {
    return http.get<VersionDiagrama>(`/trazabilidad/versiones/${versionId}`);
  },

  /** Última versión del diagrama; `null` si aún no tiene versiones. */
  obtenerUltimaVersion(diagramaId: Id): Promise<VersionDiagrama | null> {
    return http.get<VersionDiagrama | null>(
      `/trazabilidad/diagramas/${diagramaId}/versiones/ultima`
    );
  },

  // ------------------------------------------------------------------
  // COMENTARIOS
  // ------------------------------------------------------------------
  listarComentarios(
    diagramaId: Id,
    params: {
      solo_no_resueltos?: boolean;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<ComentarioDiagrama[]> {
    return http.get<ComentarioDiagrama[]>(
      `/trazabilidad/diagramas/${diagramaId}/comentarios`,
      { params }
    );
  },

  /** Comentarios sobre un elemento concreto (tipo_entidad + uuid). */
  listarComentariosDeElemento(
    diagramaId: Id,
    tipoEntidad: string,
    idEntidad: Id
  ): Promise<ComentarioDiagrama[]> {
    return http.get<ComentarioDiagrama[]>(
      `/trazabilidad/diagramas/${diagramaId}/comentarios/${tipoEntidad}/${idEntidad}`
    );
  },

  /**
   * Crea comentario general (refs en null) o de un elemento (201 Created).
   */
  crearComentario(
    diagramaId: Id,
    payload: ComentarioDiagramaCreate
  ): Promise<ComentarioDiagrama> {
    return http.post<ComentarioDiagrama>(
      `/trazabilidad/diagramas/${diagramaId}/comentarios`,
      payload
    );
  },

  actualizarComentario(
    comentarioId: Id,
    payload: ComentarioDiagramaUpdate
  ): Promise<ComentarioDiagrama> {
    return http.put<ComentarioDiagrama>(
      `/trazabilidad/comentarios/${comentarioId}`,
      payload
    );
  },

  /** Elimina comentario (solo el autor, 204). */
  eliminarComentario(comentarioId: Id): Promise<void> {
    return http.delete<void>(`/trazabilidad/comentarios/${comentarioId}`);
  },
};