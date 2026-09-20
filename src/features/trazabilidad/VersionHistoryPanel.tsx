// src/features/trazabilidad/VersionHistoryPanel.tsx
/**
 * Panel de historial de versiones del diagrama.
 *
 * - Lista las versiones guardadas (metadata: número, fecha, autor, comentario).
 * - Permite guardar una versión nueva (snapshot completo).
 * - Permite abrir una versión anterior para ver su contenido.
 *
 * El contenido_json puede ser grande; se carga solo bajo demanda.
 */

import { useCallback, useEffect, useState } from 'react';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { trazabilidadApi, type VersionDiagrama, type VersionDiagramaResumen } from '@/api';
import { useDiagramaStore, toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface VersionHistoryPanelProps {
  diagramaId: number;
  disabled?: boolean;
}

// ======================================================================
// Componente
// ======================================================================
export function VersionHistoryPanel({
  diagramaId,
  disabled = false,
}: VersionHistoryPanelProps) {
  const [versiones, setVersiones] = useState<VersionDiagramaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [versionDetalle, setVersionDetalle] = useState<VersionDiagrama | null>(
    null
  );
  const [modalComentario, setModalComentario] = useState(false);
  const [comentario, setComentario] = useState('');

  // Snapshot actual del diagrama
  const clases = useDiagramaStore((s) => s.clases);
  const relaciones = useDiagramaStore((s) => s.relaciones);
  const interfaces = useDiagramaStore((s) => s.interfaces);

  // ------------------------------------------------------------------
  // Cargar versiones
  // ------------------------------------------------------------------
  const cargarVersiones = useCallback(async () => {
    setCargando(true);
    try {
      const items = await trazabilidadApi.listarVersiones(diagramaId);
      setVersiones(items);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudieron cargar versiones'
      );
    } finally {
      setCargando(false);
    }
  }, [diagramaId]);

  useEffect(() => {
    void cargarVersiones();
  }, [cargarVersiones]);

  // ------------------------------------------------------------------
  // Guardar versión
  // ------------------------------------------------------------------
  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const contenido_json = {
        clases,
        relaciones,
        interfaces,
      };
      await trazabilidadApi.guardarVersion(diagramaId, {
        contenido_json,
        comentario: comentario.trim() || null,
      });
      toast.success('Versión guardada');
      setComentario('');
      setModalComentario(false);
      await cargarVersiones();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo guardar la versión'
      );
    } finally {
      setGuardando(false);
    }
  };

  // ------------------------------------------------------------------
  // Ver detalle
  // ------------------------------------------------------------------
  const handleVerDetalle = async (versionId: number) => {
    try {
      const v = await trazabilidadApi.obtenerVersion(versionId);
      setVersionDetalle(v);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo cargar la versión'
      );
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      {/* Header con botón guardar */}
      <div className="flex items-center justify-between border-b border-surface-800 p-3">
        <div>
          <h3 className="text-sm font-semibold text-surface-100">
            Versiones
          </h3>
          <p className="text-xs text-surface-500">
            {versiones.length} guardada{versiones.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!disabled && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setModalComentario(true)}
            leftIcon={
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
            }
          >
            Guardar
          </Button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-3">
        {cargando ? (
          <p className="text-center text-xs text-surface-500">Cargando…</p>
        ) : versiones.length === 0 ? (
          <p className="text-center text-xs text-surface-500">
            No hay versiones guardadas todavía.
          </p>
        ) : (
          <ul className="space-y-2">
            {versiones.map((v) => (
              <li
                key={v.id}
                className="rounded-md border border-surface-800 bg-surface-900/40 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-100">
                      v{v.numero_version}
                    </p>
                    {v.comentario && (
                      <p className="mt-0.5 truncate text-xs text-surface-400">
                        {v.comentario}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-surface-500">
                      {formatFecha(v.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleVerDetalle(v.id)}
                    className="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200"
                    title="Ver detalle"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* -------- Modal: guardar con comentario -------- */}
      <Modal
        open={modalComentario}
        onClose={() => {
          if (!guardando) {
            setModalComentario(false);
            setComentario('');
          }
        }}
        title="Guardar versión"
        description="Se guarda un snapshot completo del diagrama."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setModalComentario(false);
                setComentario('');
              }}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleGuardar()}
              loading={guardando}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div>
          <label className="label-base">Comentario (opcional)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={255}
            placeholder="Ej: Antes de agregar el módulo de pagos"
            className="input-base resize-none"
            disabled={guardando}
          />
        </div>
      </Modal>

      {/* -------- Modal: ver detalle de versión -------- */}
      <Modal
        open={versionDetalle !== null}
        onClose={() => setVersionDetalle(null)}
        title={
          versionDetalle
            ? `Versión v${versionDetalle.numero_version}`
            : 'Versión'
        }
        description={
          versionDetalle
            ? `Guardada el ${formatFecha(versionDetalle.created_at)}`
            : undefined
        }
        size="lg"
      >
        {versionDetalle && (
          <div className="space-y-3">
            {versionDetalle.comentario && (
              <div className="rounded border border-surface-700 bg-surface-800/40 p-2 text-sm text-surface-300">
                {versionDetalle.comentario}
              </div>
            )}
            <div className="rounded border border-surface-800 bg-surface-950 p-3">
              <pre className="max-h-80 overflow-auto text-[10px] text-surface-400">
                {JSON.stringify(versionDetalle.contenido_json, null, 2)}
              </pre>
            </div>
            <p className="text-xs text-surface-500">
              * Restaurar una versión anterior se implementará en una próxima
              iteración.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ======================================================================
// Helper
// ======================================================================
function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default VersionHistoryPanel;