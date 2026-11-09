// src/features/admin/AdminArchivosPage.tsx
/**
 * Panel de ADMINISTRACIÓN DE ARCHIVOS del servidor (solo ADMIN) —
 * Tanda F60, punto 5 del reporte de pruebas del 2026-11-07: los
 * artefactos del backend (XMI de intercambio, ZIPs y carpetas de
 * proyectos generados, imágenes de visión) crecían sin ninguna vía de
 * gestión. El backend expone el módulo desde la Tanda B24:
 *
 *   GET    /admin/archivos?tipo=&skip=&limit=
 *   GET    /admin/archivos/descargar?tipo=&ruta=
 *   DELETE /admin/archivos?tipo=&ruta=
 *
 * UX:
 * - Pestañas por raíz (Todas / Exports XMI / Proyectos generados /
 *   Imágenes subidas).
 * - Tabla con nombre+ruta, tipo, tamaño legible y fecha; ordenado por
 *   fecha DESC (lo manda el backend).
 * - Descarga como blob autenticado (JWT por header; window.open no
 *   enviaría Authorization) con el nombre real de Content-Disposition.
 * - Eliminar pide confirmación y avisa que es irreversible (y que un
 *   ZIP de `generados` arrastra su carpeta extraída).
 */

import { useCallback, useEffect, useState } from 'react';

import Button from '@/components/Button';
import { PageLoader } from '@/components/Loader';
import { adminApi } from '@/api';
import { toast } from '@/store';
import type { ArchivoAdmin, TipoArchivoAdmin } from '@/types/admin';

// ======================================================================
// Constantes
// ======================================================================
const PAGE_SIZE = 50;

type FiltroTipo = TipoArchivoAdmin | 'todas';

const PESTANAS: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'exports', etiqueta: 'Exports XMI' },
  { valor: 'generados', etiqueta: 'Proyectos generados' },
  { valor: 'uploads', etiqueta: 'Imágenes subidas' },
];

const ETIQUETA_TIPO: Record<TipoArchivoAdmin, string> = {
  exports: 'Export XMI',
  generados: 'Proyecto generado',
  uploads: 'Imagen subida',
};

// ======================================================================
// Helpers de formato
// ======================================================================
function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Descarga un Blob en el navegador con el nombre indicado. */
function dispararDescarga(blob: Blob, nombre: string): void {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

// ======================================================================
// Componente
// ======================================================================
export function AdminArchivosPage() {
  const [filtro, setFiltro] = useState<FiltroTipo>('todas');
  const [archivos, setArchivos] = useState<ArchivoAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const cargar = useCallback(
    async (nuevoSkip: number, tipo: FiltroTipo) => {
      setIsLoading(true);
      setError(null);
      try {
        const pagina = await adminApi.listar({
          tipo: tipo === 'todas' ? undefined : tipo,
          skip: nuevoSkip,
          limit: PAGE_SIZE,
        });
        setArchivos(pagina.items);
        setTotal(pagina.total);
        setSkip(nuevoSkip);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los archivos'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void cargar(0, 'todas');
  }, [cargar]);

  function cambiarFiltro(nuevo: FiltroTipo) {
    setFiltro(nuevo);
    void cargar(0, nuevo);
  }

  // ------------------------------------------------------------------
  // Descargar (blob autenticado + nombre real del header)
  // ------------------------------------------------------------------
  async function handleDescargar(archivo: ArchivoAdmin) {
    const clave = `${archivo.tipo}:${archivo.ruta}`;
    if (descargando) return;
    setDescargando(clave);
    try {
      const { blob, nombreArchivo } = await adminApi.descargar(
        archivo.tipo,
        archivo.ruta
      );
      dispararDescarga(blob, nombreArchivo ?? archivo.nombre);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo descargar el archivo'
      );
    } finally {
      setDescargando(null);
    }
  }

  // ------------------------------------------------------------------
  // Eliminar (irreversible; un ZIP de generados arrastra su carpeta)
  // ------------------------------------------------------------------
  async function handleEliminar(archivo: ArchivoAdmin) {
    const clave = `${archivo.tipo}:${archivo.ruta}`;
    const avisoCarpeta =
      archivo.tipo === 'generados' &&
      archivo.nombre.toLowerCase().endsWith('.zip')
        ? '\nTambién se borrará su carpeta extraída con el mismo nombre.'
        : '';
    if (
      !window.confirm(
        `¿Eliminar "${archivo.ruta}" (${ETIQUETA_TIPO[archivo.tipo]})?\nEsta operación NO se puede deshacer.${avisoCarpeta}`
      )
    ) {
      return;
    }

    setEliminando(clave);
    try {
      await adminApi.eliminar(archivo.tipo, archivo.ruta);
      toast.success('Archivo eliminado');
      // Recargar la página actual (o la anterior si quedó vacía).
      const nuevoSkip =
        archivos.length === 1 && skip > 0 ? skip - PAGE_SIZE : skip;
      await cargar(nuevoSkip, filtro);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar el archivo'
      );
    } finally {
      setEliminando(null);
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const hayPaginaAnterior = skip > 0;
  const hayPaginaSiguiente = skip + PAGE_SIZE < total;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-100">
          Administración de archivos
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Artefactos guardados por el backend: exports de intercambio,
          proyectos generados e imágenes subidas. Ordenados por fecha
          (más nuevos primero).
        </p>
      </div>

      {/* Pestañas por tipo */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => cambiarFiltro(p.valor)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              filtro === p.valor
                ? 'bg-brand-600 text-white'
                : 'bg-surface-800 text-surface-300 hover:bg-surface-700',
            ].join(' ')}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <PageLoader mensaje="Cargando archivos…" />
      ) : archivos.length === 0 ? (
        <div className="rounded-lg border border-surface-800 bg-surface-900/40 p-10 text-center">
          <p className="text-sm text-surface-400">
            No hay archivos en esta categoría.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla */}
          <div className="overflow-x-auto rounded-lg border border-surface-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-900/80 text-xs uppercase tracking-wider text-surface-400">
                <tr>
                  <th className="px-4 py-3">Archivo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Tamaño</th>
                  <th className="px-4 py-3">Modificado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800 bg-surface-900/40">
                {archivos.map((a) => {
                  const clave = `${a.tipo}:${a.ruta}`;
                  return (
                    <tr key={clave} className="hover:bg-surface-900/70">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate font-medium text-surface-100">
                          {a.nombre}
                        </p>
                        <p className="truncate text-xs text-surface-500">
                          {a.ruta}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-surface-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-surface-300">
                          {ETIQUETA_TIPO[a.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-surface-300">
                        {formatearTamano(a.tamano_bytes)}
                      </td>
                      <td className="px-4 py-3 text-surface-400">
                        {formatearFecha(a.modificado_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={descargando === clave}
                            onClick={() => void handleDescargar(a)}
                          >
                            Descargar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={eliminando === clave}
                            onClick={() => void handleEliminar(a)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="mt-4 flex items-center justify-between text-sm text-surface-400">
            <span>
              {total} archivo(s) · mostrando {skip + 1}–
              {Math.min(skip + archivos.length, total)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!hayPaginaAnterior || isLoading}
                onClick={() => void cargar(skip - PAGE_SIZE, filtro)}
              >
                ← Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hayPaginaSiguiente || isLoading}
                onClick={() => void cargar(skip + PAGE_SIZE, filtro)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminArchivosPage;
