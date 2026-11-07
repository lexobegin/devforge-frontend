// src/api/auditoriaApi.ts
/**
 * Endpoints del módulo de Auditoría (CU3 — Consultar Bitácora del Sistema).
 * Corresponde a `app/api/v1/auditoria_router.py` del backend Ciclo 2.
 *
 * 🔒 TODOS los endpoints requieren rol ADMIN (require_admin del backend;
 *   no-ADMIN → 403 FORBIDDEN).
 *
 * Convención Ciclo 2:
 * - `id_entidad_afectada` es str (str(id) de un Document o uuid de un
 *   elemento embebido, según `entidad_afectada`); el backend hace
 *   `entidad_afectada.upper()`, puede pasarse en cualquier caja.
 * - `id_usuario: null` significa que el evento lo disparó el propio
 *   sistema (significado del NULL del Ciclo 1).
 * - Las exportaciones son StreamingResponse: se consumen como Blob con
 *   httpClient (el JWT viaja en el header; no sirve window.open).
 *
 * NUEVO en el Ciclo 2 (gap del frontend: la página de auditoría existía
 * pero no tenía módulo de API).
 */

import { http, httpClient } from './httpClient';
import type { ISODateString, Id, PaginatedResponse } from '@/types';

// ======================================================================
// Tipos locales (BitacoraSistemaResponse de auditoria_schema.py)
// ======================================================================
export interface BitacoraSistema {
  id: Id;
  /** null = evento del sistema (sin usuario). */
  id_usuario: Id | null;
  tipo_evento: string;
  descripcion: string;
  /** 'DIAGRAMA', 'TRABAJO_GENERACION', 'EXPORTACION'… (máx 30). */
  entidad_afectada: string | null;
  /** str(id) del Document o uuid del elemento embebido, según entidad. */
  id_entidad_afectada: string | null;
  created_at: ISODateString;
}

/** Filtros de la bitácora (query params del router). */
export interface BitacoraQuery {
  skip?: number;
  limit?: number;
  id_usuario?: Id;
  tipo_evento?: string;
  entidad_afectada?: string;
  /** Rango de fechas ISO 8601. */
  desde?: string;
  hasta?: string;
}

// ======================================================================
// API
// ======================================================================
export const auditoriaApi = {
  /**
   * Lista la bitácora con filtros y paginación (solo ADMIN).
   * Defaults del backend: skip=0, limit=100 (máx 1000).
   */
  listar(query: BitacoraQuery = {}): Promise<PaginatedResponse<BitacoraSistema>> {
    return http.get<PaginatedResponse<BitacoraSistema>>('/auditoria', {
      params: query,
    });
  },

  /**
   * Todos los eventos de un recurso concreto (solo ADMIN).
   * Ej: entidad='DIAGRAMA', idEntidad=ObjectId hex del diagrama.
   */
  listarPorEntidad(
    entidadAfectada: string,
    idEntidadAfectada: Id
  ): Promise<BitacoraSistema[]> {
    return http.get<BitacoraSistema[]>(
      `/auditoria/entidad/${entidadAfectada}/${idEntidadAfectada}`
    );
  },

  /** Eventos generados por un usuario (solo ADMIN). */
  listarPorUsuario(
    usuarioId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<BitacoraSistema[]> {
    return http.get<BitacoraSistema[]>(`/auditoria/usuario/${usuarioId}`, {
      params,
    });
  },

  /** Exporta la bitácora (con filtros) a Excel .xlsx como Blob. */
  async exportarExcel(query: BitacoraQuery = {}): Promise<Blob> {
    const response = await httpClient.get('/auditoria/exportar/excel', {
      params: query,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /** Exporta la bitácora (con filtros) a PDF como Blob. */
  async exportarPdf(query: BitacoraQuery = {}): Promise<Blob> {
    const response = await httpClient.get('/auditoria/exportar/pdf', {
      params: query,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};