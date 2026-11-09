// src/features/diagrama-editor/canvas/DiagramCanvas.tsx
/**
 * Canvas principal del editor colaborativo.
 *
 * Usa React Flow (@xyflow/react) con:
 * - Nodos personalizados: ClassNode
 * - Aristas personalizadas: RelationshipEdge
 * - Modos: select / add-class / add-relation / add-interface
 * - Drag & drop de nodos (persiste pos_x/pos_y al soltar, cuantizados a
 *   2 decimales igual que PosicionLienzo del backend)
 * - Cursor y selección en vivo (vía colaboracionStore)
 *
 * CONTRATO CICLO 2: los ids de clase/relación son uuid str (Id = string)
 * de los elementos EMBEBIDOS del Diagrama. El prefijo `clase-`/`rel-` de
 * los ids de nodo/edge lo agrega ESTE archivo y se quita aquí mismo —
 * un hex/uuid no es un número, así que nada de conversiones a int.
 *
 * La fuente de verdad es el diagramaStore: los nodos/edges se DERIVAN del
 * store en cada render y los handlers de React Flow solo traducen
 * eventos → acciones del store (por eso no se necesita aplicar en local
 * los cambios que React Flow reporta: ya quedan reflejados vía
 * moverClase/setSeleccion).
 */

import { useCallback, useEffect, useMemo } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {
  useDiagramaStore,
  useColaboracionStore,
  useUIStore,
  toast,
} from '@/store';
import type { ClaseUML, Id } from '@/types';
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

/** Prefijos de los ids de nodo/edge de React Flow (los pone este archivo). */
const PREFIJO_CLASE = 'clase-';
const PREFIJO_REL = 'rel-';

// ======================================================================
// Componente interno (ya dentro del Provider)
// ======================================================================
function DiagramCanvasInner() {
  const { screenToFlowPosition } = useReactFlow();

  // Store del diagrama
  const clases = useDiagramaStore((s) => s.clases);
  const relaciones = useDiagramaStore((s) => s.relaciones);
  const seleccion = useDiagramaStore((s) => s.seleccion);
  const modoEditor = useDiagramaStore((s) => s.modoEditor);
  const setSeleccion = useDiagramaStore((s) => s.setSeleccion);
  const setModoEditor = useDiagramaStore((s) => s.setModoEditor);
  const moverClase = useDiagramaStore((s) => s.moverClase);
  const actualizarClase = useDiagramaStore((s) => s.actualizarClase);
  const crearClase = useDiagramaStore((s) => s.crearClase);
  const crearRelacion = useDiagramaStore((s) => s.crearRelacion);

  // Colaboradores conectados (para mostrar sus selecciones)
  const colaboradores = useColaboracionStore((s) => s.conectados);

  // Emisores del WebSocket (registrados por useDiagramSocket)
  const emisores = useColaboracionStore((s) => s.emisores);

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
          id: `${PREFIJO_CLASE}${c.id}`,
          type: 'classNode',
          position: { x: Number(c.pos_x), y: Number(c.pos_y) },
          data: {
            clase: c,
            seleccionadaPor: colab
              ? { color: colab.color, nombre: colab.nombre }
              : null,
          },
          selected: seleccion?.tipo === 'clase' && seleccion.id === c.id,
        };
      }),
    [clases, seleccion, colaboradores]
  );

  const edges: Edge[] = useMemo(
    () =>
      relaciones.map((r) => ({
        id: `${PREFIJO_REL}${r.id}`,
        source: `${PREFIJO_CLASE}${r.id_clase_origen}`,
        target: `${PREFIJO_CLASE}${r.id_clase_destino}`,
        type: 'relationshipEdge',
        data: {
          id: r.id,
          tipo: r.tipo_relacion,
          multiplicidad_origen: r.multiplicidad_origen,
          multiplicidad_destino: r.multiplicidad_destino,
          nombre_asociacion: r.nombre_asociacion,
        },
        selected: seleccion?.tipo === 'relacion' && seleccion.id === r.id,
      })),
    [relaciones, seleccion]
  );

  // ------------------------------------------------------------------
  // Handlers de React Flow
  // ------------------------------------------------------------------
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id) {
          const claseId = change.id.replace(PREFIJO_CLASE, '');
          moverClase(claseId, change.position.x, change.position.y);
        } else if (change.type === 'select' && change.id) {
          const claseId = change.id.replace(PREFIJO_CLASE, '');
          if (change.selected) {
            setSeleccion({ tipo: 'clase', id: claseId });
          } else if (
            seleccion?.tipo === 'clase' &&
            seleccion.id === claseId
          ) {
            // Deselección: limpiar el store si apuntaba a este nodo.
            setSeleccion(null);
          }
        }
      }
    },
    [moverClase, setSeleccion, seleccion]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'select' && change.id) {
          const relacionId = change.id.replace(PREFIJO_REL, '');
          if (change.selected) {
            setSeleccion({ tipo: 'relacion', id: relacionId });
          } else if (
            seleccion?.tipo === 'relacion' &&
            seleccion.id === relacionId
          ) {
            setSeleccion(null);
          }
        }
      }
    },
    [setSeleccion, seleccion]
  );

  // Al soltar un nodo tras un drag → persistir en backend
  const onNodeDragStop = useCallback(
    (_event: globalThis.MouseEvent | TouchEvent, node: Node) => {
      const claseId = node.id.replace(PREFIJO_CLASE, '');
      const clase = clases.find((c) => c.id === claseId);
      if (!clase) return;
      // Cuantizar a 2 decimales igual que PosicionLienzo del backend
      // (evita el ruido flotante tipo 12.300000000000001)
      const pos_x = Math.round(node.position.x * 100) / 100;
      const pos_y = Math.round(node.position.y * 100) / 100;
      moverClase(claseId, pos_x, pos_y);
      void actualizarClase(claseId, { pos_x, pos_y });
    },
    [clases, moverClase, actualizarClase]
  );

  // Conectar dos nodos → crear relación
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.warning('No se puede relacionar una clase consigo misma');
        return;
      }
      const origenId: Id = connection.source.replace(PREFIJO_CLASE, '');
      const destinoId: Id = connection.target.replace(PREFIJO_CLASE, '');
      try {
        const relacionCreada = await crearRelacion({
          id_clase_origen: origenId,
          id_clase_destino: destinoId,
          tipo_relacion: 'ASOCIACION',
        });
        // FIX F58: relación COMPLETA (los campos nuleables incluidos).
        emisores.evento?.('relation_created', { ...relacionCreada });
        toast.success('Relación creada');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo crear la relación'
        );
      }
    },
    [crearRelacion, emisores]
  );

  // Click en el canvas vacío → crear clase (si modo add-class)
  const onPaneClick = useCallback(
    async (event: ReactMouseEvent) => {
      if (modoEditor !== 'add-class') return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nombre = window.prompt('Nombre de la nueva clase:', 'NuevaClase');
      if (!nombre || !nombre.trim()) return;

      try {
        const claseCreada = await crearClase({
          nombre: nombre.trim(),
          pos_x: Math.round(position.x * 100) / 100,
          pos_y: Math.round(position.y * 100) / 100,
        });
        // FIX F58: se emite la clase COMPLETA (respuesta REST de crearClase).
        // Antes solo { id, nombre, pos_x, pos_y } → el compañero insertaba
        // una clase sin atributos/operaciones y ClassNode crasheaba con
        // "Cannot read properties of undefined (reading 'length')".
        emisores.evento?.('class_created', { ...claseCreada });

        toast.success(`Clase "${nombre.trim()}" creada`);
        setModoEditor('select');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo crear la clase'
        );
      }
    },
    [modoEditor, screenToFlowPosition, crearClase, setModoEditor, emisores]
  );

  // ------------------------------------------------------------------
  // Cursores remotos (overlay dentro del viewport: se mueve con pan/zoom)
  // ------------------------------------------------------------------
  const cursoresRemotos = colaboradores.filter((c) => c.cursor);

  // Emitir cursor al mover el mouse (el hook WS se encarga del throttle)
  const handleMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      if (!emisores.cursor) return;
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      emisores.cursor(flowPos.x, flowPos.y);
    },
    [emisores, screenToFlowPosition]
  );

  // Emitir selección cuando cambia
  useEffect(() => {
    if (!seleccion || !emisores.seleccion) return;
    emisores.seleccion(seleccion.tipo, seleccion.id);
  }, [seleccion, emisores]);

  return (
    <div
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
    >
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
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="#334155"
          />
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

        {/* Cursores remotos: ViewportPortal dibuja en coordenadas de
            flujo, así que el punto sigue al lienzo con pan y zoom. */}
        <ViewportPortal>
          {cursoresRemotos.map((c) => (
            <RemoteCursor
              key={c.id}
              x={c.cursor!.x}
              y={c.cursor!.y}
              color={c.color}
              nombre={c.nombre}
            />
          ))}
        </ViewportPortal>
      </ReactFlow>

      {/* Toolbar flotante */}
      <CanvasToolbar />

      {/* Indicador de modo */}
      {modoEditor !== 'select' && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-brand-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
          {modoEditor === 'add-class' &&
            'Hacé click en el lienzo para crear una clase'}
          {modoEditor === 'add-relation' &&
            'Arrastrá desde un nodo a otro para crear una relación'}
          {modoEditor === 'add-interface' &&
            'Hacé click en el lienzo para crear una interfaz'}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Cursor remoto (dentro de ViewportPortal: x/y son coords de flujo)
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
      className="pointer-events-none absolute z-20"
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
