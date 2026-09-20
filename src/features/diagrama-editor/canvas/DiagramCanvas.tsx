// src/features/diagrama-editor/canvas/DiagramCanvas.tsx
/**
 * Canvas principal del editor colaborativo.
 *
 * Usa React Flow (@xyflow/react) con:
 * - Nodos personalizados: ClassNode
 * - Aristas personalizadas: RelationshipEdge
 * - Modos: select / add-class / add-relation / add-interface
 * - Drag & drop de nodos (actualiza pos_x/pos_y al soltar)
 * - Cursor y selección en vivo (vía colaboracionStore)
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Node,
  type Edge,
  useReactFlow,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { useDiagramaStore, useColaboracionStore, useUIStore, toast } from '@/store';
import type { ClaseUML } from '@/types';
import CanvasToolbar from './CanvasToolbar';
import ClassNode from './ClassNode';
import RelationshipEdge from './RelationshipEdge';

// ======================================================================
// Registro de tipos (fuera del componente para evitar re-renders)
// ======================================================================
const nodeTypes = {
  classNode: ClassNode,
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

// ======================================================================
// Componente interno (ya dentro del Provider)
// ======================================================================
function DiagramCanvasInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Store del diagrama
  const clases = useDiagramaStore((s) => s.clases);
  const relaciones = useDiagramaStore((s) => s.relaciones);
  const seleccion = useDiagramaStore((s) => s.seleccion);
  const modoEditor = useDiagramaStore((s) => s.modoEditor);
  const seleccionar = useDiagramaStore((s) => s.seleccionar);
  const setModoEditor = useDiagramaStore((s) => s.setModoEditor);
  const moverClase = useDiagramaStore((s) => s.moverClase);
  const actualizarClase = useDiagramaStore((s) => s.actualizarClase);
  const crearClase = useDiagramaStore((s) => s.crearClase);
  const crearRelacion = useDiagramaStore((s) => s.crearRelacion);

  // Colaboradores conectados (para mostrar sus selecciones)
  const colaboradores = useColaboracionStore((s) => s.conectados);

  // Preferencias del editor
  const mostrarGrid = useUIStore((s) => s.mostrarGrid);
  const ajustarAGrid = useUIStore((s) => s.ajustarAGrid);

  // ------------------------------------------------------------------
  // Derivar nodos y edges desde el store
  // ------------------------------------------------------------------
  const nodes: Node[] = useMemo(
    () =>
      clases.map((c) => {
        // ¿Algún colaborador tiene esta clase seleccionada?
        const colab = colaboradores.find(
          (co) => co.seleccion?.tipo === 'clase' && co.seleccion.id === c.id
        );
        return {
          id: `clase-${c.id}`,
          type: 'classNode',
          position: { x: Number(c.pos_x), y: Number(c.pos_y) },
          data: {
            clase: c,
            seleccionadaPor: colab
              ? { color: colab.color, nombre: colab.nombre }
              : null,
          },
          selected:
            seleccion?.tipo === 'clase' && seleccion.id === c.id,
        };
      }),
    [clases, seleccion, colaboradores]
  );

  const edges: Edge[] = useMemo(
    () =>
      relaciones.map((r) => ({
        id: `rel-${r.id}`,
        source: `clase-${r.id_clase_origen}`,
        target: `clase-${r.id_clase_destino}`,
        type: 'relationshipEdge',
        data: {
          id: r.id,
          tipo: r.tipo_relacion,
          multiplicidad_origen: r.multiplicidad_origen,
          multiplicidad_destino: r.multiplicidad_destino,
          nombre_asociacion: r.nombre_asociacion,
        },
        selected:
          seleccion?.tipo === 'relacion' && seleccion.id === r.id,
      })),
    [relaciones, seleccion]
  );

  // ------------------------------------------------------------------
  // Handlers de React Flow
  // ------------------------------------------------------------------
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Solo permitimos mover y seleccionar desde React Flow;
      // la fuente de verdad es el store.
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id) {
          const claseId = parseInt(change.id.replace('clase-', ''), 10);
          moverClase(
            claseId,
            change.position.x,
            change.position.y
          );
        } else if (change.type === 'select' && change.id) {
          if (change.selected) {
            const claseId = parseInt(change.id.replace('clase-', ''), 10);
            seleccionar({ tipo: 'clase', id: claseId });
          }
        }
      }
      // Aplicamos los cambios visuales para que React Flow no se queje
      //void applyNodeChanges(changes, nodes);
    },
    //[moverClase, seleccionar, nodes]
    [moverClase, seleccionar]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'select' && change.id && change.selected) {
          const relId = parseInt(change.id.replace('rel-', ''), 10);
          seleccionar({ tipo: 'relacion', id: relId });
        }
      }
      //void applyEdgeChanges(changes, edges);
    },
    //[seleccionar, edges]
    [seleccionar]
  );

  // Al soltar un nodo tras un drag → persistir en backend
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const claseId = parseInt(node.id.replace('clase-', ''), 10);
      const clase = clases.find((c) => c.id === claseId);
      if (!clase) return;
      //// Persistir la posición final (con debounce en otro sitio si hiciera falta)
      //void actualizarClase(claseId, {
      //  pos_x: node.position.x,
      //  pos_y: node.position.y,
      //});
      // Redondear a 2 decimales para respetar Numeric(10, 2)
      const pos_x = Math.round(node.position.x * 100) / 100;
      const pos_y = Math.round(node.position.y * 100) / 100;

      void actualizarClase(claseId, { pos_x, pos_y });
    },
    [clases, actualizarClase]
  );

  // Conectar dos nodos → crear relación
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.warning('No se puede relacionar una clase consigo misma');
        return;
      }
      const origenId = parseInt(connection.source.replace('clase-', ''), 10);
      const destinoId = parseInt(connection.target.replace('clase-', ''), 10);
      try {
        await crearRelacion({
          id_clase_origen: origenId,
          id_clase_destino: destinoId,
          tipo_relacion: 'ASOCIACION',
        });
        toast.success('Relación creada');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo crear la relación'
        );
      }
    },
    [crearRelacion]
  );

  // Click en el canvas vacío → crear clase (si modo add-class)
  const onPaneClick = useCallback(
    async (event: React.MouseEvent) => {
      if (modoEditor !== 'add-class') return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nombre = window.prompt(
        'Nombre de la nueva clase:',
        'NuevaClase'
      );
      if (!nombre || !nombre.trim()) return;

      try {
        await crearClase({
          nombre: nombre.trim(),
          //pos_x: position.x,
          //pos_y: position.y,
          pos_x: Math.round(position.x * 100) / 100,
          pos_y: Math.round(position.y * 100) / 100,
        });
        toast.success(`Clase "${nombre.trim()}" creada`);
        setModoEditor('select');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo crear la clase'
        );
      }
    },
    [modoEditor, screenToFlowPosition, crearClase, setModoEditor]
  );

  // ------------------------------------------------------------------
  // Cursores remotos (overlay)
  // ------------------------------------------------------------------
  const cursoresRemotos = colaboradores.filter((c) => c.cursor);


  // Dentro del componente:
const emisores = useColaboracionStore((s) => s.emisores);

// 1) Emitir cursor al mover el mouse
const handleMouseMove = useCallback(
  (event: React.MouseEvent) => {
    if (!emisores.cursor) return;
    const flowPos = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    emisores.cursor(flowPos.x, flowPos.y);
  },
  [emisores, screenToFlowPosition]
);


// 3) Emitir selección cuando cambia
useEffect(() => {
  if (!seleccion || !emisores.seleccion) return;
  emisores.seleccion(seleccion.tipo, seleccion.id);
}, [seleccion, emisores]);

// 4) Emitir evento al crear clase
// En onPaneClick, después de crearClase():
emisores.evento?.('class_created', { ...claseCreada });

// 5) Emitir evento al crear relación
emisores.evento?.('relation_created', { ...relacionCreada });

// 6) Emitir evento al eliminar clase/relación
// (cuando estén los handlers de eliminar en el canvas)

  return (
    <div className="relative h-full w-full" ref={wrapperRef} onMouseMove={handleMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid={ajustarAGrid}
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
      >
        {mostrarGrid && (
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        )}
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!bg-surface-900 !border-surface-800 [&>button]:!bg-surface-900 [&>button]:!border-surface-800 [&>button]:!text-surface-300"
        />
        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          nodeColor={(n) => {
            const c = (n.data as { clase?: ClaseUML })?.clase;
            return c?.es_abstracta ? '#4f46e5' : '#475569';
          }}
          className="!bg-surface-900 !border-surface-800"
        />
      </ReactFlow>

      {/* Toolbar flotante */}
      <CanvasToolbar />

      {/* Cursores remotos */}
      {cursoresRemotos.map((c) => (
        <RemoteCursor
          key={c.id}
          x={c.cursor!.x}
          y={c.cursor!.y}
          color={c.color}
          nombre={c.nombre}
        />
      ))}

      {/* Indicador de modo */}
      {modoEditor !== 'select' && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-brand-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
          {modoEditor === 'add-class' && 'Hacé click en el lienzo para crear una clase'}
          {modoEditor === 'add-relation' && 'Arrastrá desde un nodo a otro para crear una relación'}
          {modoEditor === 'add-interface' && 'Hacé click en el lienzo para crear una interfaz'}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Cursor remoto
// ======================================================================
interface RemoteCursorProps {
  x: number;
  y: number;
  color: string;
  nombre: string;
}

function RemoteCursor({ x, y, color, nombre }: RemoteCursorProps) {
  return (
    <div
      className="pointer-events-none absolute z-20 transition-all duration-100"
      style={{ left: x, top: y, transform: 'translate(-2px, -2px)' }}
    >
      <svg className="h-5 w-5 drop-shadow-md" viewBox="0 0 24 24" fill={color}>
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 00-.85.36z" />
      </svg>
      <span
        className="ml-3 rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        {nombre}
      </span>
    </div>
  );
}

// ======================================================================
// Wrapper con Provider
// ======================================================================
export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}

export default DiagramCanvas;