// src/api/generacionApi.ts
/**
 * Endpoints del módulo de generación automática de backend.
 * Corresponde a `app/api/v1/generacion_router.py` del backend.
 */

import { http } from './httpClient';
import type {
  DescargaProyecto,
  EstadoGeneracion,
  GenerarBackendRequest,
  TrabajoGeneracion,
  TrabajoGeneracionDetalle,
} from '@/types';

export const generacionApi = {
  /**
   * Dispara una generación de backend Spring Boot a partir de un diagrama.
   * Devuelve el trabajo en estado PENDIENTE (202 Accepted).
   */
  generar(
    diagramaId: number,
    payload: GenerarBackendRequest = {}
  ): Promise<TrabajoGeneracion> {
    return http.post<TrabajoGeneracion>(
      `/generacion/diagramas/${diagramaId}/generar`,
      payload
    );
  },

  /** Obtiene el detalle de un trabajo (incluye entidades y reglas de mapeo). */
  obtener(trabajoId: number): Promise<TrabajoGeneracionDetalle> {
    return http.get<TrabajoGeneracionDetalle>(
      `/generacion/trabajos/${trabajoId}`
    );
  },

  /** Estado liviano del trabajo — pensado para polling. */
  obtenerEstado(trabajoId: number): Promise<EstadoGeneracion> {
    return http.get<EstadoGeneracion>(
      `/generacion/trabajos/${trabajoId}/estado`
    );
  },

  /** Historial de trabajos de un diagrama. */
  listarPorDiagrama(
    diagramaId: number,
    params: { skip?: number; limit?: number } = {}
  ): Promise<TrabajoGeneracion[]> {
    return http.get<TrabajoGeneracion[]>(
      `/generacion/diagramas/${diagramaId}/trabajos`,
      { params }
    );
  },

  /** URL de descarga del backend generado (ZIP). */
  obtenerUrlDescarga(trabajoId: number): Promise<DescargaProyecto> {
    return http.get<DescargaProyecto>(
      `/generacion/trabajos/${trabajoId}/descargar`
    );
  },

  /**
   * URL absoluta del endpoint que devuelve el ZIP directamente.
   * Útil para `<a href>` o `window.open`.
   */
  buildArchivoUrl(trabajoId: number): string {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    return `${base}/generacion/trabajos/${trabajoId}/archivo`;
  },
};