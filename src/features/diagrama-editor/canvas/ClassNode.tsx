// src/features/diagrama-editor/canvas/ClassNode.tsx
/**
 * Nodo de clase UML para React Flow.
 *
 * Renderiza visualmente:
 *   ┌───────────────────────────┐
 *   │ <<stereotype>>            │
 *   │ NombreClase               │  (en cursiva si es_abstracta)
 *   ├───────────────────────────┤
 *   │ - atributo: Tipo          │
 *   │ + otroAtributo: Tipo      │
 *   ├───────────────────────────┤
 *   │ + operacion(): Tipo       │
 *   └───────────────────────────┘
 *
 * Se registra como tipo `classNode` en React Flow.
 */

import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

import type { ClaseUML } from '@/types';

// ======================================================================
// Tipo de datos que viaja en el nodo
// ======================================================================
export interface ClassNodeData extends Record<string, unknown> {
  clase: ClaseUML;
  /** Colaborador que la tiene seleccionada, si aplica. */
  seleccionadaPor?: { color: string; nombre: string } | null;
}

export type ClassNodeType = Node<ClassNodeData, 'classNode'>;

// ======================================================================
// Iconos de visibilidad
// ======================================================================
const VIS_SIMBOLO: Record<string, string> = {
  '+': '+',
  '-': '-',
  '#': '#',
  '~': '~',
};

// ======================================================================
// Componente
// ======================================================================
export function ClassNode({ data, selected }: NodeProps<ClassNodeType>) {
  const { clase, seleccionadaPor } = data;
  const abstracta = clase.es_abstracta;

  return (
    <div
      className={[
        'min-w-[200px] max-w-[280px] rounded-md border-2 bg-surface-900 text-surface-100 shadow-lg',
        selected
          ? 'border-brand-500 ring-2 ring-brand-500/30'
          : 'border-surface-600',
      ].join(' ')}
      style={
        seleccionadaPor
          ? { boxShadow: `0 0 0 2px ${seleccionadaPor.color}` }
          : undefined
      }
    >
      {/* Handles para relaciones */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-surface-900 !bg-surface-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-surface-900 !bg-surface-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-2 !w-2 !border-surface-900 !bg-surface-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2 !w-2 !border-surface-900 !bg-surface-500"
      />

      {/* -------- Cabecera: estereotipo + nombre -------- */}
      <div className="border-b border-surface-700 px-3 py-2 text-center">
        {clase.estereotipo && (
          <p className="text-[10px] uppercase tracking-wider text-surface-400">
            &laquo;{clase.estereotipo}&raquo;
          </p>
        )}
        <p
          className={[
            'text-sm font-semibold leading-tight text-surface-100',
            abstracta ? 'italic' : '',
          ].join(' ')}
        >
          {clase.nombre}
        </p>
      </div>

      {/* -------- Atributos -------- */}
      {clase.atributos.length > 0 && (
        <div className="border-b border-surface-700 px-3 py-1.5">
          {clase.atributos.map((a) => (
            <p
              key={a.id}
              className="truncate text-[11px] leading-5 text-surface-300"
              title={`${a.nombre}: ${a.tipo_dato}`}
            >
              <span className="mr-1 text-surface-500">
                {VIS_SIMBOLO[a.visibilidad] ?? '-'}
              </span>
              <span className={a.es_estatico ? 'underline' : ''}>
                {a.nombre}
              </span>
              <span className="text-surface-500">: {a.tipo_dato}</span>
            </p>
          ))}
        </div>
      )}

      {/* -------- Operaciones -------- */}
      {clase.operaciones.length > 0 && (
        <div className="px-3 py-1.5">
          {clase.operaciones.map((op) => {
            const params = op.parametros
              .map((p) => `${p.nombre}: ${p.tipo_dato}`)
              .join(', ');
            return (
              <p
                key={op.id}
                className="truncate text-[11px] leading-5 text-surface-300"
                title={`${op.nombre}(${params}): ${op.tipo_retorno}`}
              >
                <span className="mr-1 text-surface-500">
                  {VIS_SIMBOLO[op.visibilidad] ?? '+'}
                </span>
                <span className={op.es_estatico ? 'underline' : ''}>
                  {op.nombre}
                </span>
                <span className="text-surface-500">
                  ({params}): {op.tipo_retorno}
                </span>
              </p>
            );
          })}
        </div>
      )}

      {/* -------- Badge de colaborador -------- */}
      {seleccionadaPor && (
        <div
          className="absolute -top-6 left-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: seleccionadaPor.color }}
        >
          {seleccionadaPor.nombre}
        </div>
      )}
    </div>
  );
}

export default ClassNode;