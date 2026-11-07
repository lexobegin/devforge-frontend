// src/api/colaboracionApi.ts
/**
 * Endpoints REST auxiliares del módulo de colaboración.
 * Corresponde a `app/api/v1/colaboracion_router.py` del backend Ciclo 2.
 *
 * La colaboración en TIEMPO REAL es WebSocket (`/ws/diagramas/{id}`,
 * cliente en websocket/ — Tanda F21). Estos REST son soporte:
 * - Abrir/consultar la sesión activa de un diagrama.
 * - Unirse/salir formalmente (además del evento WS).
 * - Participantes conectados (panel de colaboradores).
 * - Cursor por HTTP (fallback del evento WS `cursor_moved`).
 * - Cierre de sesiones (limpieza).
 *
 * Rutas (verificadas contra el router):
 *   POST   /colaboracion/diagramas/{diagrama_id}/sesion     → SesionColaboracion (idempotente)
 *   GET    /colaboracion/sesiones/{sesion_id}               → SesionConParticipantes
 *   POST   /colaboracion/sesiones/{sesion_id}/unirse        → 201 ParticipanteSesion (idempotente)
 *   POST   /colaboracion/sesiones/{sesion_id}/salir         → 204
 *   GET    /colaboracion/sesiones/{sesion_id}/participantes → ParticipanteSesion[]
 *   GET    /colaboracion/diagramas/{diagrama_id}/conectados → ParticipanteSesion[]
 *   PUT    /colaboracion/sesiones/{sesion_id}/cursor        → ParticipanteSesion
 *   DELETE /colaboracion/sesiones/{sesion_id}               → 204
 *   DELETE /colaboracion/diagramas/{diagrama_id}/sesiones   → {sesiones_cerradas}
 *
 * Nota Ciclo 2: `ParticipanteSesion` va EMBEBIDO en la sesión (como
 * MiembroProyecto en el proyecto): sin id propio, se identifica por
 * id_usuario. El cursor se persiste como dict JSON libre (antes JSONB).
 */

import { http } from './httpClient';
import type { Id, ISODateString } from '@/types';

// ======================================================================
// Tipos (colaboracion_schema.py)
// ======================================================================
export interface SesionColaboracion {
  id: Id;
  id_proyecto: Id;
  id_diagrama: Id;
  started_at: ISODateString;
  ended_at: ISODateString | null;
}

export interface ParticipanteSesion {
  id_usuario: Id;
  joined_at: ISODateString;
  left_at: ISODateString | null;
  /** Dict JSON libre: x, y, zoom, elemento enfocado, etc. */
  posicion_cursor: Record<string, unknown> | null;
}

export interface SesionConParticipantes extends SesionColaboracion {
  participantes: ParticipanteSesion[];
}

/** Estructura que el editor manda por el fallback HTTP del cursor. */
export interface PosicionCursor {
  x: number;
  y: number;
  zoom?: number;
  id_elemento?: Id | null;
  [campo: string]: unknown;
}

export interface CursorUpdate {
  posicion_cursor?: PosicionCursor | null;
}

export interface CierreSesionesResponse {
  sesiones_cerradas: number;
}

// ======================================================================
// Cliente
// ======================================================================
export const colaboracionApi = {
  /**
   * Abre (o reutiliza, idempotente) la sesión colaborativa activa de un
   * diagrama. Devuelve la sesión con la que se abrirá el WebSocket.
   */
  abrirSesion(diagramaId: Id): Promise<SesionColaboracion> {
    return http.post<SesionColaboracion>(
      `/colaboracion/diagramas/${diagramaId}/sesion`
    );
  },

  /** Obtiene una sesión con sus participantes conectados. */
  obtenerSesion(sesionId: Id): Promise<SesionConParticipantes> {
    return http.get<SesionConParticipantes>(
      `/colaboracion/sesiones/${sesionId}`
    );
  },

  /** Registra al usuario actual como participante (201, idempotente). */
  unirse(sesionId: Id): Promise<ParticipanteSesion> {
    return http.post<ParticipanteSesion>(
      `/colaboracion/sesiones/${sesionId}/unirse`
    );
  },

  /** Marca la salida del usuario (204; si es el último, cierra la sesión). */
  salir(sesionId: Id): Promise<void> {
    return http.post<void>(`/colaboracion/sesiones/${sesionId}/salir`);
  },

  /** Lista los participantes conectados de una sesión. */
  listarParticipantes(sesionId: Id): Promise<ParticipanteSesion[]> {
    return http.get<ParticipanteSesion[]>(
      `/colaboracion/sesiones/${sesionId}/participantes`
    );
  },

  /** Lista TODOS los conectados del diagrama (cualquier sesión activa). */
  listarConectados(diagramaId: Id): Promise<ParticipanteSesion[]> {
    return http.get<ParticipanteSesion[]>(
      `/colaboracion/diagramas/${diagramaId}/conectados`
    );
  },

  /** Actualiza la posición del cursor (fallback HTTP de `cursor_moved`). */
  actualizarCursor(
    sesionId: Id,
    datos: CursorUpdate
  ): Promise<ParticipanteSesion> {
    return http.put<ParticipanteSesion>(
      `/colaboracion/sesiones/${sesionId}/cursor`,
      datos
    );
  },

  /** Cierra una sesión colaborativa (204). */
  cerrarSesion(sesionId: Id): Promise<void> {
    return http.delete<void>(`/colaboracion/sesiones/${sesionId}`);
  },

  /** Cierra todas las sesiones activas de un diagrama (limpieza). */
  cerrarSesionesDeDiagrama(diagramaId: Id): Promise<CierreSesionesResponse> {
    return http.delete<CierreSesionesResponse>(
      `/colaboracion/diagramas/${diagramaId}/sesiones`
    );
  },
};