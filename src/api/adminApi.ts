// src/api/adminApi.ts
/**
 * Endpoints de administración de archivos del servidor (Tanda F60).
 * Corresponde a `app/api/v1/admin_router.py` del backend (Tanda B24) —
 * punto 5 del reporte de pruebas: exports/generated_projects/uploads
 * crecían sin ninguna vía de gestión.
 *
 * Rutas (verificadas contra el router — TODAS exigen rol ADMIN):
 *   GET    /admin/archivos?tipo=&skip=&limit=  → {items,total,skip,limit}
 *   GET    /admin/archivos/descargar?tipo=&ruta= → archivo (FileResponse)
 *   DELETE /admin/archivos?tipo=&ruta=         → 204
 *
 * La descarga va como BLOB por httpClient (JWT por header):
 * window.open / <a href> NO enviarían Authorization. El nombre real se
 * lee de Content-Disposition (expuesto por CORS desde la Tanda B22),
 * con el mismo parser que generacionApi (extraerNombreArchivo).
 *
 * En DELETE, si la ruta es un ZIP de `generados`, el backend también
 * borra su carpeta hermana extraída (misma unidad del generador).
 */

import { httpClient, http } from './httpClient';
import { extraerNombreArchivo } from './generacionApi';
import type {
  ArchivosAdminQuery,
  ListadoArchivosAdmin,
  TipoArchivoAdmin,
} from '@/types';

export const adminApi = {
  /** Lista archivos administrables (de una raíz o de todas). */
  listar(params: ArchivosAdminQuery = {}): Promise<ListadoArchivosAdmin> {
    return http.get<ListadoArchivosAdmin>('/admin/archivos', { params });
  },

  /**
   * Descarga un archivo como Blob autenticado. Devuelve también el
   * nombre real (Content-Disposition) o null si el header no llegó.
   */
  async descargar(
    tipo: TipoArchivoAdmin,
    ruta: string
  ): Promise<{ blob: Blob; nombreArchivo: string | null }> {
    const response = await httpClient.get('/admin/archivos/descargar', {
      params: { tipo, ruta },
      responseType: 'blob',
    });
    return {
      blob: response.data as Blob,
      nombreArchivo: extraerNombreArchivo(
        response.headers?.['content-disposition']
      ),
    };
  },

  /**
   * Elimina un archivo (IRREVERSIBLE). En `generados`, un ZIP arrastra
   * su carpeta hermana extraída (lo hace el backend).
   */
  eliminar(tipo: TipoArchivoAdmin, ruta: string): Promise<void> {
    return http.delete<void>('/admin/archivos', {
      params: { tipo, ruta },
    });
  },
};
