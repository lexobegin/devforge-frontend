// src/api/notificacionesApi.ts
/**
 * Endpoints del módulo de notificaciones.
 * Corresponde a `app/api/v1/notificaciones_router.py` del backend Ciclo 2.
 *
 * Rutas estáticas (/contador, /marcar-leidas, /leidas) ANTES de las
 * dinámicas /{id} en el backend (igual que el Ciclo 1).
 *
 * Cambios Ciclo 2: ids de ruta PydanticObjectId (string hex en JSON);
 * `id_referencia` es Optional[str] (str(id) de un Document o id uuid de
 * un elemento embebido, según `tipo`) — ya no BIGINT polimórfico.
 */

import { http } from './httpClient';
import type { Id, ISODateString } from '@/types';

// ======================================================================
// Tipos locales (app/schemas/notificacion_schema.py)
// ======================================================================

/** Los 8 tipos del Literal del schema (entrada del cliente validada). */
export type TipoNotificacion =
  | 'COMENTARIO'
  | 'CAMBIO_DIAGRAMA'
  | 'GENERACION_COMPLETA'
  | 'GENERACION_FALLIDA'
  | 'MIEMBRO_AGREGADO'
  | 'CONFLICTO_PENDIENTE'
  | 'VERSION_GUARDADA'
  | 'SISTEMA';

/** NotificacionResponse: mensaje (1-255) + referencia polimórfica. */
export interface Notificacion {
  id: Id;
  id_usuario: Id;
  tipo: TipoNotificacion;
  mensaje: string;
  /** id del recurso relacionado (diagrama, comentario, trabajo…):
   *  str(id) de un Document o uuid de un elemento embebido, según tipo. */
  id_referencia: Id | null;
  leida: boolean;
  created_at: ISODateString;
}

/** Contador liviano para el badge del dropdown de notificaciones. */
export interface ContadorNoLeidas {
  total_no_leidas: number;
}

/**
 * Marca como leídas varias notificaciones a la vez.
 * Si `ids` viene vacío y `todas=true`, marca todas las del usuario.
 */
export interface MarcarLeidasRequest {
  ids?: Id[];
  todas?: boolean;
}

export interface MarcarLeidasResponse {
  actualizadas: number;
}

// ======================================================================
// API
// ======================================================================
export const notificacionesApi = {
  /** Lista las notificaciones del usuario autenticado. */
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

  obtener(id: Id): Promise<Notificacion> {
    return http.get<Notificacion>(`/notificaciones/${id}`);
  },

  /** Marca varias notificaciones como leídas (por ids o todas). */
  marcarLeidas(
    payload: MarcarLeidasRequest
  ): Promise<MarcarLeidasResponse> {
    return http.post<MarcarLeidasResponse>(
      '/notificaciones/marcar-leidas',
      payload
    );
  },

  marcarLeida(id: Id): Promise<Notificacion> {
    return http.post<Notificacion>(`/notificaciones/${id}/leer`);
  },

  marcarNoLeida(id: Id): Promise<Notificacion> {
    return http.post<Notificacion>(`/notificaciones/${id}/no-leer`);
  },

  /** Elimina una notificación (204). */
  eliminar(id: Id): Promise<void> {
    return http.delete<void>(`/notificaciones/${id}`);
  },

  /** Limpia todas las notificaciones leídas del usuario. */
  limpiarLeidas(): Promise<{ eliminadas: number }> {
    return http.delete<{ eliminadas: number }>('/notificaciones/leidas');
  },
};