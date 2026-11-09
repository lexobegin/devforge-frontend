// src/api/generacionApi.ts
/**
 * Endpoints del módulo de generación automática de código (módulo F).
 * Corresponde a `app/api/v1/generacion_router.py` del backend Ciclo 2.
 *
 * ⚠️ CAMBIO CICLO 2: SIN BackgroundTasks — el pipeline COMPLETO corre en
 * la llamada (gate → mapeo/render → ZIP → entidades embebidas → EXITOSO).
 * Por eso el POST responde 200 OK con el trabajo ya terminado (o lanza el
 * error de dominio); el endpoint /estado se conserva por compatibilidad
 * (polling opcional, no requerido).
 *
 * TANDA B21 del backend: el POST /generar hace DISPATCH por `stack_destino`
 * — 'SPRING_BOOT_JPA_POSTGRES' (default) genera el backend Java, y
 * 'REACT_TS_VITE' genera el FRONTEND React CRUD (CU24, service
 * GeneradorFrontendService + templates_react de la Tanda 17). El resto de
 * rutas (detalle/estado/historial/descarga/archivo) son agnósticas del
 * stack: sirven el ZIP de ambos.
 *
 * Los tipos (TrabajoGeneracion, TrabajoGeneracionDetalle, EstadoGeneracion,
 * DescargaProyecto, GenerarBackendRequest, GenerarFrontendRequest) viven en
 * `@/types/generacion` y se re-exportan desde `@/types` (Tanda F9; F57
 * añade GenerarFrontendRequest).
 */

import { http, httpClient } from './httpClient';
import type {
  DescargaProyecto,
  EstadoGeneracion,
  GenerarBackendRequest,
  GenerarFrontendRequest,
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

  /**
   * Dispara una generación de FRONTEND React CRUD (CU24, Tanda B21 del
   * backend). Es el MISMO endpoint del módulo F con
   * stack_destino='REACT_TS_VITE': el backend deriva a
   * GeneradorFrontendService (Tanda 17: React + Vite + TS con un CRUD por
   * cada clase UML — tipos, api, lista y formulario). Pipeline síncrono:
   * responde 200 con el trabajo EXITOSO o lanza el error de dominio
   * (sin clases → 422 "El diagrama no tiene clases…"). package_base e
   * incluir_postman NO aplican al stack frontend (los ignora el backend).
   */
  generarFrontend(
    diagramaId: Id,
    payload: Omit<GenerarFrontendRequest, 'stack_destino'> = {}
  ): Promise<TrabajoGeneracion> {
    return http.post<TrabajoGeneracion>(
      `/generacion/diagramas/${diagramaId}/generar`,
      { stack_destino: 'REACT_TS_VITE', ...payload } satisfies GenerarFrontendRequest
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
   * URL de descarga del proyecto generado (ZIP, ambos stacks). El
   * trabajo debe estar EXITOSO. Devuelve { id_trabajo, download_url,
   * tamanio_bytes, incluye_postman, nombre_archivo } — nombre_archivo es
   * el nombre real del ZIP en el servidor (Tanda B22 del backend).
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
   *
   * TANDA F58: devuelve TAMBIÉN el nombre real del archivo leído del
   * header Content-Disposition que fija el FileResponse del backend
   * (ej. frontend_ventas_6aee…_20261107_143454.zip). El backend lo
   * expone al navegador con Access-Control-Expose-Headers desde la
   * Tanda B22 (main.py); si el header no llega (backend viejo o proxy
   * que lo elimina), `nombreArchivo` viene null y el llamador usa su
   * fallback por stack.
   */
  async descargarArchivo(
    trabajoId: Id
  ): Promise<{ blob: Blob; nombreArchivo: string | null }> {
    const response = await httpClient.get(
      `/generacion/trabajos/${trabajoId}/archivo`,
      { responseType: 'blob' }
    );
    return {
      blob: response.data as Blob,
      nombreArchivo: extraerNombreArchivo(
        response.headers?.['content-disposition']
      ),
    };
  },
};

// ======================================================================
// Helper de Content-Disposition (Tanda F58)
// ======================================================================
/**
 * Extrae el nombre de archivo de un header Content-Disposition.
 * Soporta las dos formas que emite Starlette/FastAPI:
 *   attachment; filename=frontend_ventas_….zip
 *   attachment; filename*=utf-8''frontend_ventas_….zip  (RFC 5987)
 * Devuelve null si el header no llega o no trae filename.
 */
export function extraerNombreArchivo(
  contentDisposition: unknown
): string | null {
  if (typeof contentDisposition !== 'string') return null;
  // RFC 5987: filename*=UTF-8''<pct-encoded> (tiene prioridad)
  const matchStar = /filename\*=(?:UTF-8|utf-8)''([^;]+)/i.exec(
    contentDisposition
  );
  if (matchStar?.[1]) {
    try {
      return decodeURIComponent(matchStar[1].trim().replace(/^"|"$/g, ''));
    } catch {
      return matchStar[1].trim().replace(/^"|"$/g, '');
    }
  }
  const match = /filename=("?)([^";]+)\1/i.exec(contentDisposition);
  return match?.[2] ? match[2].trim() : null;
}