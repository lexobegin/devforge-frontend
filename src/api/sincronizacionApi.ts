// src/api/sincronizacionApi.ts
/**
 * Endpoints del módulo H. Sincronización Móvil/Web Offline.
 * Corresponde a `app/api/v1/sincronizacion_router.py` del backend CICLO 2.
 *
 * 🆕 ADELANTO DE F17: este módulo lo necesita `offline/syncManager.ts`
 * (Bloque F) para enviar el batch FIFO al recuperar conexión. Cuando se
 * cierre F17 (re-paste de notificacionesApi + trazabilidadApi +
 * auditoriaApi), este archivo queda como la implementación de la parte
 * de sincronización de esa tanda.
 *
 * Contrato del backend (app/schemas/sincronizacion_schema.py):
 * - POST /sincronizacion/batch → procesa el lote EN ORDEN FIFO y por
 *   cada cambio devuelve SINCRONIZADO (con id_real: uuid del elemento
 *   embebido o str(ObjectId) del documento) o CONFLICTO (con
 *   motivo_conflicto; queda visible para que el PROPIETARIO lo resuelva).
 * - GET  /sincronizacion/diagramas/{id}/conflictos → solo PROPIETARIO.
 * - POST /sincronizacion/conflictos/{id}/resolver → estrategias
 *   OFFLINE / SERVIDOR / FUSIONAR.
 *
 * El vocabulario de `tipo_operacion` es el MISMO que `tipo_accion` de
 * las acciones IA (módulo G): un cambio puede nacer del chat, de la
 * voz, del WebSocket o de un dispositivo offline y procesarse por el
 * mismo ejecutor.
 */

import { http } from './httpClient';
import type { Id, ISODateString } from '@/types';

// ======================================================================
// Tipos (app/schemas/sincronizacion_schema.py)
// ======================================================================

/** Estado de un cambio en la cola del backend. */
export type EstadoSincronizacion = 'PENDIENTE' | 'SINCRONIZADO' | 'CONFLICTO';

/** Un ítem individual de la cola offline dentro del batch. */
export interface CambioOfflineItem {
  /** Referencia que generó el cliente (IndexedDB) y que el backend
   *  resuelve al id real (1-100 chars). */
  id_temporal_local: string;
  /** 'CREAR_CLASE', 'MODIFICAR_ATRIBUTO', 'ELIMINAR_RELACION', … */
  tipo_operacion: string;
  payload: Record<string, unknown>;
  /** ISO local (para "último en escribir gana" en conflictos simples). */
  timestamp_local?: ISODateString | null;
}

/** Lote completo de cambios offline (mínimo 1 cambio). */
export interface BatchSincronizacionRequest {
  /** deviceId o id de navegador persistido (offline.getDispositivoId). */
  id_dispositivo: string;
  /** Diagrama al que pertenecen los cambios (string hex). */
  id_diagrama: Id;
  cambios: CambioOfflineItem[];
}

/** Resultado del procesamiento de un ítem individual del batch. */
export interface ResultadoCambioSync {
  id_temporal_local: string;
  estado: EstadoSincronizacion;
  /** Id definitivo del recurso creado/modificado (si aplicó). */
  id_real?: Id | null;
  motivo_conflicto?: string | null;
}

/** Respuesta al cliente tras procesar el lote offline. */
export interface BatchSincronizacionResponse {
  id_dispositivo: string;
  id_diagrama: Id;
  total_recibidos: number;
  total_sincronizados: number;
  total_conflictos: number;
  resultados: ResultadoCambioSync[];
}

/**
 * Conflicto pendiente de resolución manual por el PROPIETARIO
 * (reutiliza versiones_diagrama como rama alternativa hasta resolverse).
 */
export interface ConflictoSync {
  id: Id;
  id_dispositivo: string;
  id_usuario: Id;
  id_diagrama: Id | null;
  tipo_operacion: string;
  payload: Record<string, unknown>;
  created_at: ISODateString;
}

/** Decisión del PROPIETARIO sobre un conflicto. */
export type EstrategiaResolucion = 'OFFLINE' | 'SERVIDOR' | 'FUSIONAR';

export interface ResolverConflictoRequest {
  estrategia: EstrategiaResolucion;
  /** Requerido solo si estrategia='FUSIONAR'. */
  payload_fusionado?: Record<string, unknown> | null;
}

// ======================================================================
// API
// ======================================================================
export const sincronizacionApi = {
  /**
   * Envía el lote completo de cambios hechos offline. El backend los
   * procesa en orden FIFO y devuelve el mapeo id_temporal_local →
   * id_real, más el detalle de conflictos detectados.
   */
  enviarBatch(
    batch: BatchSincronizacionRequest
  ): Promise<BatchSincronizacionResponse> {
    return http.post<BatchSincronizacionResponse>('/sincronizacion/batch', batch);
  },

  /**
   * Lista los conflictos pendientes de un diagrama (solo PROPIETARIO
   * del proyecto; si no, el backend responde 403).
   */
  listarConflictos(diagramaId: Id): Promise<ConflictoSync[]> {
    return http.get<ConflictoSync[]>(
      `/sincronizacion/diagramas/${diagramaId}/conflictos`
    );
  },

  /**
   * Resuelve un conflicto con la estrategia elegida por el PROPIETARIO:
   * - OFFLINE: aplicar el cambio offline.
   * - SERVIDOR: descartar el cambio offline.
   * - FUSIONAR: aplicar un payload fusionado custom.
   */
  resolverConflicto(
    conflictoId: Id,
    datos: ResolverConflictoRequest
  ): Promise<ConflictoSync> {
    return http.post<ConflictoSync>(
      `/sincronizacion/conflictos/${conflictoId}/resolver`,
      datos
    );
  },
};