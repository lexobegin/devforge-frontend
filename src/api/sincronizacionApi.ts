// src/api/sincronizacionApi.ts
/**
 * Endpoints del módulo de sincronización offline.
 * Corresponde a `app/api/v1/sincronizacion_router.py` del backend.
 *
 * Se usa cuando el cliente recupera conexión y envía la cola de cambios
 * pendientes (IndexedDB en web, SQLite en móvil).
 */

import { http } from './httpClient';
import type { Id, ISODateString } from '@/types';

// ======================================================================
// Tipos locales
// ======================================================================
export type EstadoColaSync = 'PENDIENTE' | 'SINCRONIZADO' | 'CONFLICTO';

export interface CambioOfflineItem {
  id_temporal_local: string;
  tipo_operacion: string;
  payload: Record<string, unknown>;
  timestamp_local?: string;
}

export interface BatchSincronizacionRequest {
  id_dispositivo: string;
  id_diagrama: Id;
  cambios: CambioOfflineItem[];
}

export interface ResultadoCambioSync {
  id_temporal_local: string;
  estado: EstadoColaSync;
  id_real: Id | null;
  motivo_conflicto: string | null;
}

export interface BatchSincronizacionResponse {
  id_dispositivo: string;
  id_diagrama: Id;
  total_recibidos: number;
  total_sincronizados: number;
  total_conflictos: number;
  resultados: ResultadoCambioSync[];
}

export interface ConflictoSync {
  id: Id;
  id_dispositivo: string;
  id_usuario: Id;
  id_diagrama: Id | null;
  tipo_operacion: string;
  payload: Record<string, unknown>;
  created_at: ISODateString;
}

export type EstrategiaConflicto = 'OFFLINE' | 'SERVIDOR' | 'FUSIONAR';

export interface ResolverConflictoRequest {
  estrategia: EstrategiaConflicto;
  payload_fusionado?: Record<string, unknown> | null;
}

// ======================================================================
// API
// ======================================================================
export const sincronizacionApi = {
  /**
   * Envía un batch completo de cambios offline al backend.
   * El backend los procesa en orden FIFO, aplica los que puede y
   * marca conflictos para revisión del PROPIETARIO.
   */
  enviarBatch(
    payload: BatchSincronizacionRequest
  ): Promise<BatchSincronizacionResponse> {
    return http.post<BatchSincronizacionResponse>(
      '/sincronizacion/batch',
      payload
    );
  },

  /** Lista los conflictos pendientes de un diagrama (solo PROPIETARIO). */
  listarConflictos(diagramaId: number): Promise<ConflictoSync[]> {
    return http.get<ConflictoSync[]>(
      `/sincronizacion/diagramas/${diagramaId}/conflictos`
    );
  },

  /** Resuelve un conflicto aplicando la estrategia elegida. */
  resolverConflicto(
    conflictoId: number,
    payload: ResolverConflictoRequest
  ): Promise<ConflictoSync> {
    return http.post<ConflictoSync>(
      `/sincronizacion/conflictos/${conflictoId}/resolver`,
      payload
    );
  },
};