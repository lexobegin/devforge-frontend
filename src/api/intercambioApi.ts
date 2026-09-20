// src/api/intercambioApi.ts
/**
 * Endpoints del módulo de intercambio XMI/XML.
 * Corresponde a `app/api/v1/intercambio_router.py` del backend.
 *
 * La importación requiere subir un archivo (multipart/form-data);
 * la exportación devuelve el registro + URL de descarga.
 */

import { http, httpClient } from './httpClient';
import type { ISODateString, Id } from '@/types';

// ======================================================================
// Tipos locales
// ======================================================================
export type FormatoIntercambio = 'XMI' | 'XML' | 'EA';
export type EstadoImportacion = 'PENDIENTE' | 'EXITOSO' | 'FALLIDO';

export interface ExportacionDiagrama {
  id: Id;
  id_diagrama: Id;
  formato: FormatoIntercambio;
  ruta_archivo: string;
  id_usuario: Id;
  exported_at: ISODateString;
}

export interface ExportacionResultado {
  exportacion: ExportacionDiagrama;
  download_url: string;
}

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
  resumen: Record<string, number>;
}

// ======================================================================
// API
// ======================================================================
export const intercambioApi = {
  // ------------------------------------------------------------------
  // EXPORTAR
  // ------------------------------------------------------------------
  exportar(
    diagramaId: number,
    formato: FormatoIntercambio = 'XMI'
  ): Promise<ExportacionResultado> {
    return http.post<ExportacionResultado>(
      `/intercambio/diagramas/${diagramaId}/exportar`,
      undefined,
      { params: { formato } }
    );
  },

  listarExportaciones(
    diagramaId: number,
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
   * Sube un archivo XMI/XML y lo aplica al diagrama destino.
   * El backend hace merge por nombre: las clases existentes se saltan.
   */
  importar(
    diagramaId: number,
    archivo: File,
    formato: FormatoIntercambio = 'XMI'
  ): Promise<ImportacionResultado> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('formato', formato);

    return httpClient
      .post<ImportacionResultado>(
        `/intercambio/diagramas/${diagramaId}/importar`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((r) => r.data);
  },

  listarImportaciones(
    diagramaId: number,
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
   * Construye la URL absoluta de descarga de un archivo exportado.
   * El backend devuelve `ruta_archivo` (relativa); aquí la convertimos
   * a URL absoluta usando el `download_url` que ya viene del backend
   * en la respuesta de exportación. Este helper es solo por conveniencia.
   */
  buildDownloadUrl(rutaRelativa: string): string {
    return `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? ''}/${rutaRelativa}`;
  },
};