// src/features/intercambio/ExportModal.tsx
/**
 * Modal para exportar el diagrama a XMI/XML.
 *
 * Envía la petición al backend y descarga el archivo generado.
 *
 * Contrato (app/api/v1/intercambio_router.py + intercambio_schema.py,
 * Ciclo 2):
 * - POST /diagramas/{id}/exportar?formato=XMI|XML|EA → ExportacionResultado
 *   { exportacion, download_url } (el formato viaja como query param).
 * - FIX F58: `download_url` apunta al EXPORT_DIR ESTÁTICO (fuera de
 *   /api/v1, pensado para nginx en producción) — en local NO hay static
 *   mount y abrir esa URL da 404 ("Not Found", bug de la prueba del
 *   2026-11-07). La descarga va POR EL ENDPOINT AUTENTICADO
 *   GET /intercambio/descargas/{ruta} con `exportacion.ruta_archivo`,
 *   como blob (JWT por header) y `a.download` con el nombre real del
 *   archivo — funciona igual en local y en producción.
 * - Formatos válidos: XMI | XML | EA (round-trip con Enterprise
 *   Architect); el backend valida case-insensitive.
 * - `diagramaId` es ObjectId hex (string), no number.
 */

import { useState } from 'react';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { intercambioApi, type FormatoIntercambio } from '@/api';
import type { Id } from '@/types';
import { toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  /** ObjectId hex del diagrama (string, Ciclo 2). */
  diagramaId: Id;
}

// ======================================================================
// Componente
// ======================================================================
export function ExportModal({ open, onClose, diagramaId }: ExportModalProps) {
  const [formato, setFormato] = useState<FormatoIntercambio>('XMI');
  const [exportando, setExportando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  /** Nombre del archivo exportado (basename de ruta_archivo). */
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  /** Ruta relativa en el servidor para el endpoint autenticado. */
  const [rutaArchivo, setRutaArchivo] = useState<string | null>(null);

  const handleExportar = async () => {
    setExportando(true);
    setNombreArchivo(null);
    setRutaArchivo(null);
    try {
      const resultado = await intercambioApi.exportar(diagramaId, formato);
      // FIX F58: NO se usa download_url (EXPORT_DIR estático — 404 fuera
      // de nginx); se guarda la ruta relativa para el endpoint
      // autenticado /intercambio/descargas/{ruta}.
      setRutaArchivo(resultado.exportacion.ruta_archivo);
      setNombreArchivo(
        resultado.exportacion.ruta_archivo.split('/').pop() ?? null
      );
      toast.success('Diagrama exportado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo exportar'
      );
    } finally {
      setExportando(false);
    }
  };

  const handleDescargar = async () => {
    if (!rutaArchivo || descargando) return;
    setDescargando(true);
    try {
      // Descarga AUTENTICADA como blob (el endpoint exige JWT por
      // header): window.open / <a href> no enviarían el Authorization.
      const blob = await intercambioApi.descargarArchivo(rutaArchivo);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = nombreArchivo ?? 'diagrama.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo descargar'
      );
    } finally {
      setDescargando(false);
    }
  };

  const handleClose = () => {
    setNombreArchivo(null);
    setRutaArchivo(null);
    setFormato('XMI');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Exportar diagrama"
      description="Generá un archivo XMI/XML a partir del diagrama actual."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={exportando}>
            Cerrar
          </Button>
          {rutaArchivo && (
            <Button
              variant="primary"
              onClick={() => void handleDescargar()}
              loading={descargando}
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
              {descargando ? 'Descargando…' : 'Descargar'}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => void handleExportar()}
            loading={exportando}
          >
            Exportar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label-base">Formato</label>
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as FormatoIntercambio)}
            className="input-base"
            disabled={exportando}
          >
            <option value="XMI">XMI (recomendado)</option>
            <option value="XML">XML</option>
            <option value="EA">XMI 1.1 (Enterprise Architect)</option>
          </select>
        </div>

        {nombreArchivo && (
          <div className="rounded border border-success/30 bg-success/10 p-3">
            <p className="text-sm font-medium text-success">
              ✓ Exportación lista
            </p>
            <p className="mt-1 break-all text-xs text-surface-400">
              {nombreArchivo}
            </p>
          </div>
        )}

        <p className="text-xs text-surface-500">
          El archivo se genera del diagrama completo: clases, atributos,
          operaciones, interfaces y relaciones.
        </p>
      </div>
    </Modal>
  );
}

export default ExportModal;