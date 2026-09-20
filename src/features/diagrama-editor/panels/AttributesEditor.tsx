// src/features/diagrama-editor/panels/AttributesEditor.tsx
/**
 * Editor de atributos de una clase UML.
 *
 * Lista los atributos existentes y permite:
 * - Editar nombre, tipo, visibilidad, valor por defecto (inline).
 * - Agregar un nuevo atributo.
 * - Eliminar un atributo.
 *
 * Todos los cambios persisten vía diagramaStore.
 */

import { useState } from 'react';

import Button from '@/components/Button';
import { useDiagramaStore, toast } from '@/store';
import type { AtributoUML, UmlVisibility } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface AttributesEditorProps {
  claseId: number;
  atributos: AtributoUML[];
  disabled?: boolean;
}

const VISIBILIDADES: { valor: UmlVisibility; label: string; titulo: string }[] = [
  { valor: '+', label: '+', titulo: 'Público' },
  { valor: '-', label: '-', titulo: 'Privado' },
  { valor: '#', label: '#', titulo: 'Protegido' },
  { valor: '~', label: '~', titulo: 'Paquete' },
];

// ======================================================================
// Componente
// ======================================================================
export function AttributesEditor({
  claseId,
  atributos,
  disabled = false,
}: AttributesEditorProps) {
  const agregarAtributo = useDiagramaStore((s) => s.agregarAtributo);
  const actualizarAtributo = useDiagramaStore((s) => s.actualizarAtributo);
  const eliminarAtributo = useDiagramaStore((s) => s.eliminarAtributo);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('String');
  const [nuevaVis, setNuevaVis] = useState<UmlVisibility>('-');
  const [isLoading, setIsLoading] = useState(false);

  // ------------------------------------------------------------------
  // Agregar
  // ------------------------------------------------------------------
  async function handleAgregar() {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      toast.warning('El nombre del atributo es obligatorio');
      return;
    }
    if (!nuevoTipo.trim()) {
      toast.warning('El tipo es obligatorio');
      return;
    }

    setIsLoading(true);
    try {
      await agregarAtributo(claseId, {
        nombre,
        tipo_dato: nuevoTipo.trim(),
        visibilidad: nuevaVis,
      });
      setNuevoNombre('');
      setNuevoTipo('String');
      setNuevaVis('-');
      setNuevoAbierto(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo agregar el atributo'
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Actualizar (inline)
  // ------------------------------------------------------------------
  async function handleActualizar(
    atributoId: number,
    campo: 'nombre' | 'tipo_dato' | 'visibilidad',
    valor: string
  ) {
    try {
      await actualizarAtributo(claseId, atributoId, { [campo]: valor });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo actualizar'
      );
    }
  }

  // ------------------------------------------------------------------
  // Eliminar
  // ------------------------------------------------------------------
  async function handleEliminar(atributo: AtributoUML) {
    if (!window.confirm(`¿Eliminar el atributo "${atributo.nombre}"?`)) return;
    try {
      await eliminarAtributo(claseId, atributo.id);
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
          Atributos ({atributos.length})
        </h4>
        {!disabled && (
          <button
            type="button"
            onClick={() => setNuevoAbierto((v) => !v)}
            className="rounded p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-100"
            title="Agregar atributo"
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
        {atributos.length === 0 && !nuevoAbierto && (
          <p className="text-xs text-surface-500">Sin atributos.</p>
        )}

        {atributos.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-1.5 rounded border border-surface-800 bg-surface-900/40 px-1.5 py-1"
          >
            {/* Visibilidad */}
            <select
              value={a.visibilidad}
              onChange={(e) =>
                void handleActualizar(a.id, 'visibilidad', e.target.value)
              }
              disabled={disabled}
              className="h-6 w-8 rounded border border-surface-700 bg-surface-800 px-0.5 text-center text-xs text-surface-200"
              title="Visibilidad"
            >
              {VISIBILIDADES.map((v) => (
                <option key={v.valor} value={v.valor} title={v.titulo}>
                  {v.label}
                </option>
              ))}
            </select>

            {/* Nombre */}
            <input
              type="text"
              defaultValue={a.nombre}
              onBlur={(e) => {
                const nuevo = e.target.value.trim();
                if (nuevo && nuevo !== a.nombre) {
                  void handleActualizar(a.id, 'nombre', nuevo);
                } else {
                  e.target.value = a.nombre;
                }
              }}
              disabled={disabled}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-surface-100 hover:border-surface-700 focus:border-brand-500 focus:outline-none"
            />

            {/* Tipo */}
            <input
              type="text"
              defaultValue={a.tipo_dato}
              onBlur={(e) => {
                const nuevo = e.target.value.trim();
                if (nuevo && nuevo !== a.tipo_dato) {
                  void handleActualizar(a.id, 'tipo_dato', nuevo);
                } else {
                  e.target.value = a.tipo_dato;
                }
              }}
              disabled={disabled}
              className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-surface-400 hover:border-surface-700 focus:border-brand-500 focus:outline-none"
            />

            {/* Eliminar */}
            {!disabled && (
              <button
                type="button"
                onClick={() => void handleEliminar(a)}
                className="flex-shrink-0 rounded p-0.5 text-surface-500 hover:bg-danger/10 hover:text-danger"
                title="Eliminar atributo"
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

      {/* Formulario nuevo atributo */}
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
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              placeholder="Tipo"
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

export default AttributesEditor;