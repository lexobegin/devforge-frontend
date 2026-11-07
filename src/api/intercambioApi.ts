// src/api/intercambioApi.ts
/**
 * Endpoints del módulo de intercambio XMI/XML.
 * Corresponde a `app/api/v1/intercambio_router.py` del backend Ciclo 2.
 *
 * - La exportación genera el archivo en el servidor y devuelve el
 *   registro + `download_url` (ExportacionResultado).
 * - La importación sube un archivo (multipart/form-data, 201 Created) y
 *   hace merge por nombre: las clases existentes se saltan, las nuevas
 *   se agregan (ImportacionResultado.resumen trae los conteos).
 * - El archivo exportado se descarga con
 *   GET /intercambio/descargas/{ruta:path} — la ruta está DENTRO de
 *   /api/v1 y el endpoint EXIGE JWT (get_current_active_user): para
 *   descargar use `descargarArchivo()` (adjunta el Authorization) y no
 *   window.open, que no enviaría el header.
 *
 * Formatos: XMI | XML | EA (round-trip DevForge ↔ Enterprise Architect).
 * El backend valida `formato` case-insensitive y lo normaliza a mayúsculas.
 */

import { http, httpClient, uploadFile } from './httpClient';
import { env } from '@/config/env';
import type { ISODateString, Id } from '@/types';

// ======================================================================
// Tipos locales (app/schemas/intercambio_schema.py)
// ======================================================================
export type FormatoIntercambio = 'XMI' | 'XML' | 'EA';
export type EstadoImportacion = 'PENDIENTE' | 'EXITOSO' | 'FALLIDO';

/** Registro de exportación (ExportacionDiagramaResponse). */
export interface ExportacionDiagrama {
  id: Id;
  id_diagrama: Id;
  formato: FormatoIntercambio;
  /** Ruta relativa del archivo en el servidor (settings.EXPORT_DIR). */
  ruta_archivo: string;
  id_usuario: Id;
  exported_at: ISODateString;
}

export interface ExportacionResultado {
  exportacion: ExportacionDiagrama;
  /** URL (firmada o relativa) para descargar el XMI/XML generado. */
  download_url: string;
}

/** Registro de importación (ImportacionDiagramaResponse). */
export interface ImportacionDiagrama {
  id: Id;
  id_diagrama: Id;
  formato: FormatoIntercambio;
  archivo_origen: string;
  estado: EstadoImportacion;
  id_usuario: Id;
  imported_at: ISODateString;
}

export interface ImportacionResultado {
  importacion: ImportacionDiagrama;
  /**
   * Conteo de lo reconstruido: clases/atributos/relaciones importados y
   * advertencias del conversor (dict[str, Any] en el backend, no todo
   * son números).
   */
  resumen: Record<string, unknown>;
}

// ======================================================================
// API
// ======================================================================
export const intercambioApi = {
  // ------------------------------------------------------------------
  // EXPORTAR
  // ------------------------------------------------------------------
  /**
   * Exporta el diagrama a XMI/XML/EA. Devuelve el registro + URL de
   * descarga. `formato` viaja como query param (default 'XMI').
   */
  exportar(
    diagramaId: Id,
    formato: FormatoIntercambio = 'XMI'
  ): Promise<ExportacionResultado> {
    return http.post<ExportacionResultado>(
      `/intercambio/diagramas/${diagramaId}/exportar`,
      undefined,
      { params: { formato } }
    );
  },

  /** Historial de exportaciones de un diagrama. */
  listarExportaciones(
    diagramaId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<ExportacionDiagrama[]> {
    return http.get<ExportacionDiagrama[]>(
      `/intercambio/diagramas/${diagramaId}/exportaciones`,
      { params }
    );
  },

  // ------------------------------------------------------------------
  // IMPORTAR
  // ------------------------------------------------------------------
  /**
   * Sube un archivo XMI/XML (multipart: campo `archivo` + campo
   * `formato`) y lo aplica al diagrama destino. El backend hace merge
   * por nombre: las clases existentes se saltan. Responde 201 Created.
   */
  importar(
    diagramaId: Id,
    archivo: File,
    formato: FormatoIntercambio = 'XMI'
  ): Promise<ImportacionResultado> {
    return uploadFile<ImportacionResultado>(
      `/intercambio/diagramas/${diagramaId}/importar`,
      archivo,
      { formato }
      // nombreCampo default 'archivo': el router declara
      // `archivo: UploadFile = File(...)`
    );
  },

  /** Historial de importaciones de un diagrama. */
  listarImportaciones(
    diagramaId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<ImportacionDiagrama[]> {
    return http.get<ImportacionDiagrama[]>(
      `/intercambio/diagramas/${diagramaId}/importaciones`,
      { params }
    );
  },

  // ------------------------------------------------------------------
  // DESCARGA
  // ------------------------------------------------------------------
  /**
   * Descarga el archivo exportado como Blob (application/xml).
   * Usa httpClient para adjuntar el JWT: el endpoint
   * GET /intercambio/descargas/{ruta:path} exige autenticación.
   */
  async descargarArchivo(rutaRelativa: string): Promise<Blob> {
    const response = await httpClient.get(
      `/intercambio/descargas/${rutaRelativa}`,
      { responseType: 'blob' }
    );
    return response.data as Blob;
  },

  /**
   * Construye la URL absoluta del endpoint de descarga a partir de la
   * ruta relativa que devuelve el export (`ruta_archivo`).
   * ⚠️ La ruta vive DENTRO de /api/v1 (no se elimina el prefijo) y el
   * endpoint exige JWT: para descargas programáticas use
   * `descargarArchivo()`; esta URL solo sirve con el header
   * Authorization (p. ej. fetch manual con credenciales).
   */
  buildDownloadUrl(rutaRelativa: string): string {
    const rutas = rutaRelativa
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');
    return `${env.apiBaseUrl}/intercambio/descargas/${rutas}`;
  },
};