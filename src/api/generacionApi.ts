// src/api/generacionApi.ts
/**
 * Endpoints del módulo de generación automática de backend (Spring Boot).
 * Corresponde a `app/api/v1/generacion_router.py` del backend Ciclo 2.
 *
 * ⚠️ CAMBIO CICLO 2: SIN BackgroundTasks — GeneratorService ejecuta el
 * pipeline COMPLETO en la llamada (gate formal → mapeo UML→Java/SQL →
 * render de plantillas → ZIP → entidades embebidas → EXITOSO). Por eso
 * el POST responde 200 OK con el trabajo ya terminado (o lanza el error
 * de dominio); el endpoint /estado se conserva por compatibilidad
 * (polling opcional, no requerido).
 *
 * Los tipos (TrabajoGeneracion, TrabajoGeneracionDetalle, EstadoGeneracion,
 * DescargaProyecto, GenerarBackendRequest) viven en `@/types/generacion`
 * y se re-exportan desde `@/types` (Tanda F9).
 */

import { http, httpClient } from './httpClient';
import type {
  DescargaProyecto,
  EstadoGeneracion,
  GenerarBackendRequest,
  Id,
  TrabajoGeneracion,
  TrabajoGeneracionDetalle,
} from '@/types';

export const generacionApi = {
  /**
   * Dispara una generación de backend Spring Boot a partir de un diagrama.
   * CICLO 2: pipeline síncrono — responde 200 OK con el trabajo en
   * estado EXITOSO (el fallo de render/escritura deja el trabajo FALLIDO
   * y relanza la excepción). NO es 202 + polling (eso era el Ciclo 1).
   */
  generar(
    diagramaId: Id,
    payload: GenerarBackendRequest = {}
  ): Promise<TrabajoGeneracion> {
    return http.post<TrabajoGeneracion>(
      `/generacion/diagramas/${diagramaId}/generar`,
      payload
    );
  },

  /** Obtiene el detalle de un trabajo (incluye entidades y reglas de mapeo embebidas). */
  obtener(trabajoId: Id): Promise<TrabajoGeneracionDetalle> {
    return http.get<TrabajoGeneracionDetalle>(
      `/generacion/trabajos/${trabajoId}`
    );
  },

  /**
   * Estado liviano del trabajo — pensado para polling (compatibilidad;
   * el POST de generar ya responde el trabajo terminado en el Ciclo 2).
   */
  obtenerEstado(trabajoId: Id): Promise<EstadoGeneracion> {
    return http.get<EstadoGeneracion>(
      `/generacion/trabajos/${trabajoId}/estado`
    );
  },

  /** Historial de trabajos de un diagrama. */
  listarPorDiagrama(
    diagramaId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<TrabajoGeneracion[]> {
    return http.get<TrabajoGeneracion[]>(
      `/generacion/diagramas/${diagramaId}/trabajos`,
      { params }
    );
  },

  /**
   * URL de descarga del backend generado (ZIP). El trabajo debe estar
   * EXITOSO. Devuelve { id_trabajo, download_url, tamanio_bytes,
   * incluye_postman }.
   */
  obtenerUrlDescarga(trabajoId: Id): Promise<DescargaProyecto> {
    return http.get<DescargaProyecto>(
      `/generacion/trabajos/${trabajoId}/descargar`
    );
  },

  /**
   * Descarga directa del ZIP como Blob (GET /generacion/trabajos/{id}/
   * archivo, streaming del backend). Usa httpClient para adjuntar el
   * JWT — ese endpoint exige autenticación, así que para bajar el ZIP
   * use este método y no window.open / <a href> (no enviarían el
   * header Authorization).
   */
  async descargarArchivo(trabajoId: Id): Promise<Blob> {
    const response = await httpClient.get(
      `/generacion/trabajos/${trabajoId}/archivo`,
      { responseType: 'blob' }
    );
    return response.data as Blob;
  },
};