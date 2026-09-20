// src/features/trazabilidad/CommentsPanel.tsx
/**
 * Panel de comentarios del diagrama.
 *
 * - Lista todos los comentarios (generales + sobre elementos).
 * - Filtro: mostrar solo no resueltos.
 * - Crear comentario general.
 * - Marcar como resuelto / no resuelto.
 * - Eliminar comentario propio.
 */

import { useCallback, useEffect, useState } from 'react';

import Button from '@/components/Button';
import { trazabilidadApi, type ComentarioDiagrama } from '@/api';
import { useAuthStore, useDiagramaStore, toast } from '@/store';

// ======================================================================
// Tipos
// ======================================================================
interface CommentsPanelProps {
  diagramaId: number;
  disabled?: boolean;
}

// ======================================================================
// Componente
// ======================================================================
export function CommentsPanel({ diagramaId, disabled = false }: CommentsPanelProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const clases = useDiagramaStore((s) => s.clases);

  const [comentarios, setComentarios] = useState<ComentarioDiagrama[]>([]);
  const [cargando, setCargando] = useState(true);
  const [soloNoResueltos, setSoloNoResueltos] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  // ------------------------------------------------------------------
  // Cargar
  // ------------------------------------------------------------------
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const items = await trazabilidadApi.listarComentarios(diagramaId, {
        solo_no_resueltos: soloNoResueltos,
      });
      setComentarios(items);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudieron cargar los comentarios'
      );
    } finally {
      setCargando(false);
    }
  }, [diagramaId, soloNoResueltos]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // ------------------------------------------------------------------
  // Crear comentario general
  // ------------------------------------------------------------------
  const handleCrear = async () => {
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    try {
      await trazabilidadApi.crearComentario(diagramaId, { texto: t });
      setTexto('');
      await cargar();
      toast.success('Comentario agregado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo crear el comentario'
      );
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------------------------------------------
  // Toggle resuelto
  // ------------------------------------------------------------------
  const handleToggleResuelto = async (c: ComentarioDiagrama) => {
    try {
      await trazabilidadApi.actualizarComentario(c.id, {
        resuelto: !c.resuelto,
      });
      await cargar();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo actualizar'
      );
    }
  };

  // ------------------------------------------------------------------
  // Eliminar
  // ------------------------------------------------------------------
  const handleEliminar = async (c: ComentarioDiagrama) => {
    if (!window.confirm('¿Eliminar este comentario?')) return;
    try {
      await trazabilidadApi.eliminarComentario(c.id);
      await cargar();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar'
      );
    }
  };

  // ------------------------------------------------------------------
  // Resolver referencia de la entidad
  // ------------------------------------------------------------------
  const nombreEntidad = (c: ComentarioDiagrama): string | null => {
    if (!c.tipo_entidad || c.id_entidad === null) return null;
    if (c.tipo_entidad === 'CLASE') {
      const clase = clases.find((cl) => cl.id === c.id_entidad);
      return clase ? `Clase: ${clase.nombre}` : `Clase #${c.id_entidad}`;
    }
    return `${c.tipo_entidad} #${c.id_entidad}`;
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      {/* Header con filtro */}
      <div className="flex items-center justify-between border-b border-surface-800 p-3">
        <div>
          <h3 className="text-sm font-semibold text-surface-100">Comentarios</h3>
          <p className="text-xs text-surface-500">
            {comentarios.length} comentario{comentarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-surface-400">
          <input
            type="checkbox"
            checked={soloNoResueltos}
            onChange={(e) => setSoloNoResueltos(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-surface-700 bg-surface-800 text-brand-600"
          />
          Sin resolver
        </label>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-3">
        {cargando ? (
          <p className="text-center text-xs text-surface-500">Cargando…</p>
        ) : comentarios.length === 0 ? (
          <p className="text-center text-xs text-surface-500">
            {soloNoResueltos
              ? 'No hay comentarios pendientes.'
              : 'No hay comentarios.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {comentarios.map((c) => {
              const esAutor = c.id_usuario === usuario?.id;
              const ref = nombreEntidad(c);
              return (
                <li
                  key={c.id}
                  className={[
                    'rounded-md border p-2',
                    c.resuelto
                      ? 'border-surface-800 bg-surface-900/20 opacity-60'
                      : 'border-surface-800 bg-surface-900/40',
                  ].join(' ')}
                >
                  {ref && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                      {ref}
                    </p>
                  )}
                  <p
                    className={[
                      'text-sm text-surface-200',
                      c.resuelto ? 'line-through' : '',
                    ].join(' ')}
                  >
                    {c.texto}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-surface-500">
                    <span>{formatFecha(c.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleToggleResuelto(c)}
                        className={[
                          'rounded px-1.5 py-0.5 font-medium transition-colors',
                          c.resuelto
                            ? 'text-surface-400 hover:bg-surface-800'
                            : 'text-success hover:bg-success/10',
                        ].join(' ')}
                        title={c.resuelto ? 'Marcar sin resolver' : 'Marcar resuelto'}
                      >
                        {c.resuelto ? 'Reabrir' : '✓ Resolver'}
                      </button>
                      {esAutor && (
                        <button
                          type="button"
                          onClick={() => void handleEliminar(c)}
                          className="rounded px-1.5 py-0.5 text-surface-500 hover:bg-danger/10 hover:text-danger"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Input de nuevo comentario */}
      <div className="border-t border-surface-800 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleCrear();
              }
            }}
            rows={2}
            placeholder="Escribí un comentario general…"
            className="input-base resize-none text-sm"
            disabled={disabled || enviando}
          />
          <Button
            size="sm"
            variant="primary"
            onClick={() => void handleCrear()}
            loading={enviando}
            disabled={disabled || !texto.trim()}
          >
            Enviar
          </Button>
        </div>
      </div>
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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default CommentsPanel;