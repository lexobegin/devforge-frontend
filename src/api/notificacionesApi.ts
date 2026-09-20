// src/api/notificacionesApi.ts
/**
 * Endpoints del módulo de notificaciones.
 * Corresponde a `app/api/v1/notificaciones_router.py` del backend.
 */

import { http } from './httpClient';
import type { Id, ISODateString } from '@/types';

// ======================================================================
// Tipos locales
// ======================================================================
export type TipoNotificacion =
  | 'COMENTARIO'
  | 'CAMBIO_DIAGRAMA'
  | 'GENERACION_COMPLETA'
  | 'GENERACION_FALLIDA'
  | 'MIEMBRO_AGREGADO'
  | 'CONFLICTO_PENDIENTE'
  | 'VERSION_GUARDADA'
  | 'SISTEMA';

export interface Notificacion {
  id: Id;
  id_usuario: Id;
  tipo: TipoNotificacion;
  mensaje: string;
  id_referencia: Id | null;
  leida: boolean;
  created_at: ISODateString;
}

export interface ContadorNoLeidas {
  total_no_leidas: number;
}

export interface MarcarLeidasRequest {
  ids?: number[];
  todas?: boolean;
}

export interface MarcarLeidasResponse {
  actualizadas: number;
}

// ======================================================================
// API
// ======================================================================
export const notificacionesApi = {
  listar(
    params: {
      solo_no_leidas?: boolean;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<Notificacion[]> {
    return http.get<Notificacion[]>('/notificaciones', { params });
  },

  /** Contador liviano de no leídas (para el badge del dropdown). */
  contador(): Promise<ContadorNoLeidas> {
    return http.get<ContadorNoLeidas>('/notificaciones/contador');
  },

  obtener(id: number): Promise<Notificacion> {
    return http.get<Notificacion>(`/notificaciones/${id}`);
  },

  /** Marca varias notificaciones como leídas (por ids o todas). */
  marcarLeidas(
    payload: MarcarLeidasRequest
  ): Promise<MarcarLeidasResponse> {
    return http.post<MarcarLeidasResponse>('/notificaciones/marcar-leidas', payload);
  },

  marcarLeida(id: number): Promise<Notificacion> {
    return http.post<Notificacion>(`/notificaciones/${id}/leer`);
  },

  marcarNoLeida(id: number): Promise<Notificacion> {
    return http.post<Notificacion>(`/notificaciones/${id}/no-leer`);
  },

  eliminar(id: number): Promise<void> {
    return http.delete<void>(`/notificaciones/${id}`);
  },

  /** Limpia todas las notificaciones leídas del usuario. */
  limpiarLeidas(): Promise<{ eliminadas: number }> {
    return http.delete<{ eliminadas: number }>('/notificaciones/leidas');
  },
};