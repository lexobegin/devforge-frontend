// src/features/diagrama-editor/panels/DiagramSidebar.tsx
/**
 * Sidebar derecho del editor.
 *
 * Orquesta qué panel mostrar según la selección actual:
 * - Clase seleccionada → ClassPropertiesPanel
 * - Relación seleccionada → RelationshipPanel
 * - Nada seleccionado → panel de "nada seleccionado" + participantes
 */

import { useDiagramaStore } from '@/store';
import ClassPropertiesPanel from './ClassPropertiesPanel';
import ParticipantsPanel from './ParticipantsPanel';
import RelationshipPanel from './RelationshipPanel';

export function DiagramSidebar() {
  const seleccion = useDiagramaStore((s) => s.seleccion);
  const clases = useDiagramaStore((s) => s.clases);
  const relaciones = useDiagramaStore((s) => s.relaciones);

  // Resolver la entidad seleccionada
  const claseSeleccionada =
    seleccion?.tipo === 'clase'
      ? clases.find((c) => c.id === seleccion.id)
      : undefined;

  const relacionSeleccionada =
    seleccion?.tipo === 'relacion'
      ? relaciones.find((r) => r.id === seleccion.id)
      : undefined;

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col border-l border-surface-800 bg-surface-900/40">
      {/* Participantes siempre visibles arriba */}
      <ParticipantsPanel />

      {/* Panel contextual */}
      <div className="min-h-0 flex-1">
        {claseSeleccionada ? (
          <ClassPropertiesPanel
            key={claseSeleccionada.id}
            clase={claseSeleccionada}
          />
        ) : relacionSeleccionada ? (
          <RelationshipPanel
            key={relacionSeleccionada.id}
            relacion={relacionSeleccionada}
          />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </aside>
  );
}

// ======================================================================
// Panel vacío (nada seleccionado)
// ======================================================================
function EmptyPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800">
        <svg
          className="h-6 w-6 text-surface-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-surface-300">
        Nada seleccionado
      </p>
      <p className="max-w-[220px] text-xs text-surface-500">
        Seleccioná una clase o relación para ver y editar sus propiedades.
      </p>
    </div>
  );
}

export default DiagramSidebar;