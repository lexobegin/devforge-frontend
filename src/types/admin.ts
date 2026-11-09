// src/types/admin.ts
/**
 * Tipos del módulo de administración de archivos (Tanda F60).
 * Reflejan `app/schemas/admin_schema.py` del backend (Tanda B24).
 *
 * El ADMIN de la plataforma puede listar/descargar/eliminar los
 * artefactos que el backend escribe en disco:
 * - exports/            → XMI/XML del intercambio con EA
 * - generated_projects/ → ZIPs + carpetas de proyectos generados
 * - uploads/            → imágenes subidas (IA de visión)
 *
 * `ruta` es relativa a la raíz del tipo (posix) y es la clave que viaja
 * en los endpoints de descarga/borrado — NUNCA una ruta absoluta.
 */

export type TipoArchivoAdmin = 'exports' | 'generados' | 'uploads';

export const TIPOS_ARCHIVO_ADMIN: TipoArchivoAdmin[] = [
  'exports',
  'generados',
  'uploads',
];

export const ETIQUETA_TIPO_ARCHIVO: Record<TipoArchivoAdmin, string> = {
  exports: 'Export XMI',
  generados: 'Proyecto generado',
  uploads: 'Imagen subida',
};

export interface ArchivoAdmin {
  /** Nombre del archivo (basename). */
  nombre: string;
  tipo: TipoArchivoAdmin;
  /** Ruta relativa a la raíz del tipo — clave para descargar/eliminar. */
  ruta: string;
  tamano_bytes: number;
  /** ISO 8601 (mtime del archivo en el servidor). */
  modificado_at: string;
}

export interface ListadoArchivosAdmin {
  items: ArchivoAdmin[];
  total: number;
  skip: number;
  limit: number;
}

export interface ArchivosAdminQuery {
  /** Sin tipo → lista las tres raíces juntas. */
  tipo?: TipoArchivoAdmin;
  skip?: number;
  /** 1..500 (el backend valida); default 100. */
  limit?: number;
}
