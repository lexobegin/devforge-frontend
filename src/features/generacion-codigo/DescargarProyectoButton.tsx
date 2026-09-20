// src/features/generacion-codigo/DescargarProyectoButton.tsx
/**
 * Botón de descarga del backend generado.
 *
 * Pide la URL de descarga al backend y hace la descarga con el nombre
 * correcto. Muestra el tamaño del ZIP si está disponible.
 */

import { useCallback, useState } from "react";

import Button from "@/components/Button";
import { httpClient } from "@/api";
import { toast } from "@/store";

// ======================================================================
// Tipos
// ======================================================================
interface DescargarProyectoButtonProps {
  trabajoId: number;
  /** Tamaño del ZIP en bytes (si se conoce). */
  tamanioBytes?: number | null;
  /** Si el trabajo no está EXITOSO, el botón se deshabilita. */
  disabled?: boolean;
}

// ======================================================================
// Componente
// ======================================================================
export function DescargarProyectoButton({
  trabajoId,
  tamanioBytes,
  disabled = false,
}: DescargarProyectoButtonProps) {
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = useCallback(async () => {
    /*if (descargando) return;
    setDescargando(true);
    try {
      // El backend expone un endpoint que sirve el archivo directamente.
      // Usamos una descarga por fetch + blob para poder manejar el nombre.
      const url = generacionApi.buildArchivoUrl(trabajoId);
      const response = await fetch(url, {
        // Incluye cookies/headers si hiciera falta (no en este caso)
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `devforge-backend-${trabajoId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Descarga iniciada');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo descargar'
      );
    } finally {
      setDescargando(false);
    }
  }, [trabajoId, descargando]);*/
    if (descargando) return;
    setDescargando(true);
    try {
      // ✅ httpClient añade el Authorization automáticamente
      const url = `/generacion/trabajos/${trabajoId}/archivo`;
      const response = await httpClient.get(url, {
        responseType: "blob", // ← CRÍTICO: descarga binaria
      });

      // El nombre viene del Content-Disposition del backend, o lo forzamos
      const blob = response.data as Blob;
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `devforge-backend-${trabajoId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Descarga iniciada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar");
    } finally {
      setDescargando(false);
    }
  }, [trabajoId, descargando]);

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
        ? "Descargando…"
        : tamanioBytes
          ? `Descargar ZIP (${formatBytes(tamanioBytes)})`
          : "Descargar ZIP"}
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
