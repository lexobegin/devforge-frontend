// src/features/generacion-codigo/DescargarProyectoButton.tsx
/**
 * Botón de descarga del proyecto generado (ZIP — backend Spring o
 * frontend React, Tanda F58).
 *
 * Muestra el tamaño del ZIP si está disponible y hace la descarga como
 * blob para forzar el nombre del archivo.
 *
 * Contrato (app/api/v1/generacion_router.py, Ciclo 2 + B22):
 * - GET /generacion/trabajos/{id}/archivo → FileResponse (streaming del
 *   ZIP) y EXIGE JWT (get_current_active_user): la descarga va por
 *   `generacionApi.descargarArchivo()` (httpClient adjunta el
 *   Authorization automáticamente) — nunca window.open ni <a href>,
 *   que no enviarían el header.
 * - FIX F58: el nombre del archivo descargado es el REAL que manda el
 *   backend en Content-Disposition (main.py lo expone por CORS desde
 *   B22) — ej. frontend_ventas_6aee…_20261107_143454.zip. Antes se
 *   forzaba `devforge-backend-<id>.zip` para AMBOS stacks (bug de la
 *   prueba del 2026-11-07). Si el header no llega, fallback: por
 *   stackDestino → devforge-frontend|backend-<id>.zip.
 * - El backend valida trabajo EXITOSO + pertenencia antes de servir el
 *   archivo; si no, responde 404 (genérico, no revela trabajos ajenos).
 * - El tamaño opcional viene de GET /trabajos/{id}/descargar
 *   (DescargaProyecto.tamanio_bytes) — lo pasa la página de estado.
 * - `trabajoId` es ObjectId hex (string), no number.
 */

import { useCallback, useState } from 'react';

import Button from '@/components/Button';
import { generacionApi } from '@/api';
import type { Id, StackDestino } from '@/types';
import { toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface DescargarProyectoButtonProps {
  /** ObjectId hex del trabajo (string, Ciclo 2). */
  trabajoId: Id;
  /** Tamaño del ZIP en bytes (si se conoce). */
  tamanioBytes?: number | null;
  /** Stack del trabajo: decide el nombre de respaldo si el backend no
   * manda Content-Disposition legible (Tanda F58). */
  stackDestino?: StackDestino;
  /** Si el trabajo no está EXITOSO, el botón se deshabilita. */
  disabled?: boolean;
}

// ======================================================================
// Componente
// ======================================================================
export function DescargarProyectoButton({
  trabajoId,
  tamanioBytes,
  stackDestino,
  disabled = false,
}: DescargarProyectoButtonProps) {
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = useCallback(async () => {
    if (descargando) return;
    setDescargando(true);
    try {
      // generacionApi.descargarArchivo usa httpClient (Authorization
      // automático) con responseType 'blob' — crítico: descarga binaria.
      const { blob, nombreArchivo } = await generacionApi.descargarArchivo(trabajoId);

      // FIX F58: nombre REAL del ZIP (Content-Disposition, expuesto por
      // CORS desde B22) → fallback por stack → último recurso genérico.
      const prefijo = stackDestino === 'REACT_TS_VITE' ? 'frontend' : 'backend';
      const nombre =
        nombreArchivo ?? `devforge-${prefijo}-${trabajoId}.zip`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `devforge-backend-${trabajoId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Descarga iniciada: ${nombre}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo descargar'
      );
    } finally {
      setDescargando(false);
    }
  }, [trabajoId, stackDestino, descargando]);

  return (
    <Button
      variant="primary"
      onClick={() => void handleDescargar()}
      loading={descargando}
      disabled={disabled}
      leftIcon={
        !descargando ? (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        ) : undefined
      }
    >
      {descargando
        ? 'Descargando…'
        : tamanioBytes
          ? `Descargar ZIP (${formatBytes(tamanioBytes)})`
          : 'Descargar ZIP'}
    </Button>
  );
}

// ======================================================================
// Helper
// ======================================================================
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default DescargarProyectoButton;