// src/features/diagrama-editor/panels/OperationsEditor.tsx
/**
 * Editor de operaciones (métodos) de una clase UML.
 *
 * Permite agregar, editar y eliminar operaciones. Los parámetros se
 * editan como texto simple `nombre: Tipo, nombre: Tipo` por simplicidad.
 */

import { useState } from 'react';

import Button from '@/components/Button';
import { useDiagramaStore, toast } from '@/store';
import type { OperacionUML, UmlVisibility } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface OperationsEditorProps {
  claseId: number;
  operaciones: OperacionUML[];
  disabled?: boolean;
}

const VISIBILIDADES: { valor: UmlVisibility; label: string }[] = [
  { valor: '+', label: '+' },
  { valor: '-', label: '-' },
  { valor: '#', label: '#' },
  { valor: '~', label: '~' },
];

// ======================================================================
// Componente
// ======================================================================
export function OperationsEditor({
  claseId,
  operaciones,
  disabled = false,
}: OperationsEditorProps) {
  const agregarOperacion = useDiagramaStore((s) => s.agregarOperacion);
  const actualizarOperacion = useDiagramaStore((s) => s.actualizarOperacion);
  const eliminarOperacion = useDiagramaStore((s) => s.eliminarOperacion);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRetorno, setNuevoRetorno] = useState('void');
  const [nuevaVis, setNuevaVis] = useState<UmlVisibility>('+');
  const [isLoading, setIsLoading] = useState(false);

  // ------------------------------------------------------------------
  // Agregar
  // ------------------------------------------------------------------
  async function handleAgregar() {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      toast.warning('El nombre de la operación es obligatorio');
      return;
    }
    setIsLoading(true);
    try {
      await agregarOperacion(claseId, {
        nombre,
        tipo_retorno: nuevoRetorno.trim() || 'void',
        visibilidad: nuevaVis,
        parametros: [],
      });
      setNuevoNombre('');
      setNuevoRetorno('void');
      setNuevaVis('+');
      setNuevoAbierto(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo agregar la operación'
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Actualizar
  // ------------------------------------------------------------------
  async function handleActualizar(
    opId: number,
    campo: 'nombre' | 'tipo_retorno' | 'visibilidad',
    valor: string
  ) {
    try {
      await actualizarOperacion(claseId, opId, { [campo]: valor });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo actualizar'
      );
    }
  }

  // ------------------------------------------------------------------
  // Eliminar
  // ------------------------------------------------------------------
  async function handleEliminar(op: OperacionUML) {
    if (!window.confirm(`¿Eliminar la operación "${op.nombre}"?`)) return;
    try {
      await eliminarOperacion(claseId, op.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar'
      );
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          Operaciones ({operaciones.length})
        </h4>
        {!disabled && (
          <button
            type="button"
            onClick={() => setNuevoAbierto((v) => !v)}
            className="rounded p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
            title="Agregar operación"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {operaciones.length === 0 && !nuevoAbierto && (
          <p className="text-xs text-surface-500">Sin operaciones.</p>
        )}

        {operaciones.map((op) => (
          <div
            key={op.id}
            className="flex items-center gap-1.5 rounded border border-surface-800 bg-surface-900/40 px-1.5 py-1"
          >
            <select
              value={op.visibilidad}
              onChange={(e) =>
                void handleActualizar(op.id, 'visibilidad', e.target.value)
              }
              disabled={disabled}
              className="h-6 w-8 rounded border border-surface-700 bg-surface-800 px-0.5 text-center text-xs text-surface-200"
            >
              {VISIBILIDADES.map((v) => (
                <option key={v.valor} value={v.valor}>
                  {v.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              defaultValue={op.nombre}
              onBlur={(e) => {
                const nuevo = e.target.value.trim();
                if (nuevo && nuevo !== op.nombre) {
                  void handleActualizar(op.id, 'nombre', nuevo);
                } else {
                  e.target.value = op.nombre;
                }
              }}
              disabled={disabled}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-surface-100 hover:border-surface-700 focus:border-brand-500 focus:outline-none"
            />

            <span className="text-xs text-surface-500">():</span>

            <input
              type="text"
              defaultValue={op.tipo_retorno}
              onBlur={(e) => {
                const nuevo = e.target.value.trim();
                if (nuevo && nuevo !== op.tipo_retorno) {
                  void handleActualizar(op.id, 'tipo_retorno', nuevo);
                } else {
                  e.target.value = op.tipo_retorno;
                }
              }}
              disabled={disabled}
              className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-surface-400 hover:border-surface-700 focus:border-brand-500 focus:outline-none"
            />

            {!disabled && (
              <button
                type="button"
                onClick={() => void handleEliminar(op)}
                className="flex-shrink-0 rounded p-0.5 text-surface-500 hover:bg-danger/10 hover:text-danger"
                title="Eliminar operación"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Nuevo */}
      {nuevoAbierto && (
        <div className="rounded border border-brand-500/30 bg-brand-500/5 p-2">
          <div className="mb-2 flex gap-1.5">
            <select
              value={nuevaVis}
              onChange={(e) => setNuevaVis(e.target.value as UmlVisibility)}
              className="h-7 w-8 rounded border border-surface-700 bg-surface-800 px-0.5 text-center text-xs text-surface-200"
            >
              {VISIBILIDADES.map((v) => (
                <option key={v.valor} value={v.valor}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="nombre"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAgregar();
                if (e.key === 'Escape') setNuevoAbierto(false);
              }}
              className="h-7 min-w-0 flex-1 rounded border border-surface-700 bg-surface-800 px-1.5 text-xs text-surface-100"
            />
            <input
              type="text"
              value={nuevoRetorno}
              onChange={(e) => setNuevoRetorno(e.target.value)}
              placeholder="retorno"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAgregar();
                if (e.key === 'Escape') setNuevoAbierto(false);
              }}
              className="h-7 w-20 rounded border border-surface-700 bg-surface-800 px-1.5 text-xs text-surface-100"
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNuevoAbierto(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void handleAgregar()}
              loading={isLoading}
            >
              Agregar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperationsEditor;