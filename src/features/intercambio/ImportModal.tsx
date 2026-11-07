// src/features/intercambio/ImportModal.tsx
/**
 * Modal para importar un diagrama desde XMI/XML.
 *
 * El backend hace MERGE por nombre: las clases existentes se saltan,
 * las nuevas se agregan. Al terminar, se recarga el diagrama para
 * reflejar los cambios.
 *
 * Contrato (app/api/v1/intercambio_router.py + intercambio_schema.py,
 * Ciclo 2):
 * - POST /diagramas/{id}/importar (multipart: campo `archivo` + campo
 *   `formato`) → 201 con ImportacionResultado { importacion, resumen }.
 * - `resumen` es dict[str, Any]: la mayoría son conteos (clases,
 *   atributos, relaciones…) pero puede traer listas de advertencias del
 *   conversor — por eso se tipa Record<string, unknown> y los valores se
 *   formatean de forma defensiva.
 * - El backend valida la extensión (.xmi/.xml) y el tamaño
 *   (settings.MAX_UPLOAD_SIZE_MB); el frontend pre-valida la extensión.
 * - `diagramaId` es ObjectId hex (string), no number.
 */

import { useCallback, useRef, useState } from 'react';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { intercambioApi, type FormatoIntercambio } from '@/api';
import type { Id } from '@/types';
import { useDiagramaStore, toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** ObjectId hex del diagrama (string, Ciclo 2). */
  diagramaId: Id;
}

/** ImportacionResultado.resumen == dict[str, Any] del backend. */
type ResultadoResumen = Record<string, unknown>;

// ======================================================================
// Componente
// ======================================================================
export function ImportModal({ open, onClose, diagramaId }: ImportModalProps) {
  const recargar = useDiagramaStore((s) => s.cargarDiagrama);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [formato, setFormato] = useState<FormatoIntercambio>('XMI');
  const [importando, setImportando] = useState(false);
  const [resumen, setResumen] = useState<ResultadoResumen | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------
  // Reset al cerrar
  // ------------------------------------------------------------------
  const handleClose = useCallback(() => {
    setArchivo(null);
    setFormato('XMI');
    setResumen(null);
    setArrastrando(false);
    onClose();
  }, [onClose]);

  // ------------------------------------------------------------------
  // Importar
  // ------------------------------------------------------------------
  const handleImportar = async () => {
    if (!archivo) {
      toast.warning('Seleccioná un archivo primero');
      return;
    }
    setImportando(true);
    try {
      const resultado = await intercambioApi.importar(
        diagramaId,
        archivo,
        formato
      );
      setResumen(resultado.resumen);
      toast.success('Diagrama importado');
      // Recargar el diagrama para reflejar los cambios
      await recargar(diagramaId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo importar'
      );
    } finally {
      setImportando(false);
    }
  };

  // ------------------------------------------------------------------
  // File handlers
  // ------------------------------------------------------------------
  const onFileSelect = (file: File | null | undefined) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'xmi' && ext !== 'xml') {
      toast.error('El archivo debe tener extensión .xmi o .xml');
      return;
    }
    setArchivo(file);
    setResumen(null);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importar diagrama"
      description="Subí un archivo XMI/XML generado por DevForge AI u otra herramienta."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={importando}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleImportar()}
            loading={importando}
            disabled={!archivo || !!resumen}
          >
            Importar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!resumen && (
          <>
            {/* -------- Zona de drop -------- */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                onFileSelect(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={[
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
                arrastrando
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/40',
                importando ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            >
              <svg
                className="h-10 w-10 text-surface-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {archivo ? (
                <>
                  <p className="text-sm font-medium text-surface-100">
                    {archivo.name}
                  </p>
                  <p className="text-xs text-surface-500">
                    {(archivo.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-surface-200">
                    Elegir archivo XMI/XML
                  </p>
                  <p className="text-xs text-surface-500">
                    Arrastrá o hacé click para seleccionar
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xmi,.xml"
                onChange={(e) => onFileSelect(e.target.files?.[0])}
                className="hidden"
              />
            </div>

            {/* -------- Formato -------- */}
            <div>
              <label className="label-base">Formato</label>
              <select
                value={formato}
                onChange={(e) =>
                  setFormato(e.target.value as FormatoIntercambio)
                }
                className="input-base"
                disabled={importando}
              >
                <option value="XMI">XMI</option>
                <option value="XML">XML</option>
              </select>
            </div>

            <p className="text-xs text-surface-500">
              El backend hace <strong>merge por nombre</strong>: las clases
              existentes no se sobreescriben, solo se agregan las nuevas.
            </p>
          </>
        )}

        {/* -------- Resumen post-import -------- */}
        {resumen && (
          <div className="rounded border border-success/30 bg-success/10 p-3">
            <p className="text-sm font-medium text-success">
              ✓ Importación completada
            </p>
            <ul className="mt-2 space-y-1 text-xs text-surface-300">
              {Object.entries(resumen).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="break-all text-right font-medium text-surface-100">
                    {formatearValor(v)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ======================================================================
// Helper
// ======================================================================
/**
 * El resumen del backend es dict[str, Any]: conteos numéricos pero
 * también listas de advertencias del conversor (no todo es número).
 */
function formatearValor(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

export default ImportModal;