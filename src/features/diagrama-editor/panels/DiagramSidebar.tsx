// src/features/diagrama-editor/panels/DiagramSidebar.tsx
/**
 * Sidebar derecho del editor (pestaña "Propiedades" del RightPanel).
 *
 * Orquesta qué panel mostrar según la selección actual del diagramaStore:
 * - Clase seleccionada → ClassPropertiesPanel (F47).
 * - Relación seleccionada → RelationshipPanel (F48).
 * - Nada seleccionado → panel vacío + participantes arriba.
 *
 * ⚠️ DiagramEditorPage (F44) ya renderiza este componente DENTRO de un
 * contenedor `w-80 border-l border-surface-800 bg-surface-900/40` (el
 * RightPanel con tabs propiedades/versiones/comentarios), así que acá NO
 * se repiten ni el ancho ni el borde ni el fondo: el aside ocupa el 100%
 * del contenedor. El paste traía `w-80 border-l` duplicado dentro del
 * mismo `w-80 border-l` (borde doble y desborde de 1px+ por el box
 * model).
 *
 * Los ids de la selección son uuid str (Id del Ciclo 2): el find es por
 * igualdad de strings, sin parseInt.
 */

import { useDiagramaStore } from '@/store';
import ClassPropertiesPanel from './ClassPropertiesPanel';
import ParticipantsPanel from './ParticipantsPanel';
import RelationshipPanel from './RelationshipPanel';

export function DiagramSidebar() {
  const seleccion = useDiagramaStore((s) => s.seleccion);
  const clases = useDiagramaStore((s) => s.clases);
  const relaciones = useDiagramaStore((s) => s.relaciones);

  // Resolver la entidad seleccionada (ElementoSeleccionado del store).
  // Nota: 'interfaz' no tiene panel dedicado todavía (no hay
  // InterfaceNode en el lienzo, F45) → cae al panel vacío.
  const claseSeleccionada =
    seleccion?.tipo === 'clase'
      ? clases.find((c) => c.id === seleccion.id)
      : undefined;

  const relacionSeleccionada =
    seleccion?.tipo === 'relacion'
      ? relaciones.find((r) => r.id === seleccion.id)
      : undefined;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col">
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