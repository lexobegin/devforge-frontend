// src/api/trazabilidadApi.ts
/**
 * Endpoints del módulo de trazabilidad: historial, versiones y comentarios.
 * Corresponde a `app/api/v1/trazabilidad_router.py` del backend.
 */

import { http } from './httpClient';
import type { ISODateString, Id } from '@/types';

// ======================================================================
// Tipos locales (los específicos de trazabilidad, no en `@/types` para no
// inflar el barrel principal; si se usan mucho los movemos)
// ======================================================================
export type TipoCambio = 'CREAR' | 'MODIFICAR' | 'ELIMINAR';

export interface HistorialCambio {
  id: Id;
  id_diagrama: Id;
  id_usuario: Id;
  tipo_cambio: TipoCambio;
  tipo_entidad: string;
  id_entidad: Id;
  datos_cambio: Record<string, unknown>;
  created_at: ISODateString;
}

export interface VersionDiagramaResumen {
  id: Id;
  id_diagrama: Id;
  numero_version: number;
  id_usuario: Id;
  comentario: string | null;
  created_at: ISODateString;
}

export interface VersionDiagrama extends VersionDiagramaResumen {
  contenido_json: Record<string, unknown>;
}

export interface VersionDiagramaCreate {
  contenido_json: Record<string, unknown>;
  comentario?: string | null;
}

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
  listarHistorial(
    diagramaId: number,
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

  listarHistorialDeElemento(
    diagramaId: number,
    tipoEntidad: string,
    idEntidad: number
  ): Promise<HistorialCambio[]> {
    return http.get<HistorialCambio[]>(
      `/trazabilidad/diagramas/${diagramaId}/historial/${tipoEntidad}/${idEntidad}`
    );
  },

  // ------------------------------------------------------------------
  // VERSIONES
  // ------------------------------------------------------------------
  listarVersiones(
    diagramaId: number,
    params: { skip?: number; limit?: number } = {}
  ): Promise<VersionDiagramaResumen[]> {
    return http.get<VersionDiagramaResumen[]>(
      `/trazabilidad/diagramas/${diagramaId}/versiones`,
      { params }
    );
  },

  guardarVersion(
    diagramaId: number,
    payload: VersionDiagramaCreate
  ): Promise<VersionDiagrama> {
    return http.post<VersionDiagrama>(
      `/trazabilidad/diagramas/${diagramaId}/versiones`,
      payload
    );
  },

  obtenerVersion(versionId: number): Promise<VersionDiagrama> {
    return http.get<VersionDiagrama>(`/trazabilidad/versiones/${versionId}`);
  },

  obtenerUltimaVersion(diagramaId: number): Promise<VersionDiagrama | null> {
    return http.get<VersionDiagrama | null>(
      `/trazabilidad/diagramas/${diagramaId}/versiones/ultima`
    );
  },

  // ------------------------------------------------------------------
  // COMENTARIOS
  // ------------------------------------------------------------------
  listarComentarios(
    diagramaId: number,
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

  listarComentariosDeElemento(
    diagramaId: number,
    tipoEntidad: string,
    idEntidad: number
  ): Promise<ComentarioDiagrama[]> {
    return http.get<ComentarioDiagrama[]>(
      `/trazabilidad/diagramas/${diagramaId}/comentarios/${tipoEntidad}/${idEntidad}`
    );
  },

  crearComentario(
    diagramaId: number,
    payload: ComentarioDiagramaCreate
  ): Promise<ComentarioDiagrama> {
    return http.post<ComentarioDiagrama>(
      `/trazabilidad/diagramas/${diagramaId}/comentarios`,
      payload
    );
  },

  actualizarComentario(
    comentarioId: number,
    payload: ComentarioDiagramaUpdate
  ): Promise<ComentarioDiagrama> {
    return http.put<ComentarioDiagrama>(
      `/trazabilidad/comentarios/${comentarioId}`,
      payload
    );
  },

  eliminarComentario(comentarioId: number): Promise<void> {
    return http.delete<void>(`/trazabilidad/comentarios/${comentarioId}`);
  },
};