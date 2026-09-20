// src/features/intercambio/ExportModal.tsx
/**
 * Modal para exportar el diagrama a XMI/XML.
 *
 * Envía la petición al backend, obtiene la URL de descarga y muestra un
 * enlace + botón para descargar directamente.
 */

import { useState } from 'react';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { intercambioApi, type FormatoIntercambio } from '@/api';
import { toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  diagramaId: number;
}

// ======================================================================
// Componente
// ======================================================================
export function ExportModal({ open, onClose, diagramaId }: ExportModalProps) {
  const [formato, setFormato] = useState<FormatoIntercambio>('XMI');
  const [exportando, setExportando] = useState(false);
  const [urlDescarga, setUrlDescarga] = useState<string | null>(null);

  const handleExportar = async () => {
    setExportando(true);
    setUrlDescarga(null);
    try {
      const resultado = await intercambioApi.exportar(diagramaId, formato);
      setUrlDescarga(resultado.download_url);
      toast.success('Diagrama exportado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo exportar'
      );
    } finally {
      setExportando(false);
    }
  };

  const handleClose = () => {
    setUrlDescarga(null);
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
          {urlDescarga && (
            <a
              href={urlDescarga}
              download
              className="btn-primary"
              target="_blank"
              rel="noreferrer"
            >
              Descargar
            </a>
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

        {urlDescarga && (
          <div className="rounded border border-success/30 bg-success/10 p-3">
            <p className="text-sm font-medium text-success">
              ✓ Exportación lista
            </p>
            <p className="mt-1 break-all text-xs text-surface-400">
              {urlDescarga}
            </p>
            <a
              href={urlDescarga}
              download
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              Abrir en nueva pestaña →
            </a>
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