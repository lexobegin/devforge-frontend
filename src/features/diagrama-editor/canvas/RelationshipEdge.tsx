// src/features/diagrama-editor/canvas/RelationshipEdge.tsx
/**
 * Arista de relación UML para React Flow.
 *
 * Representa visualmente el tipo de relación con una etiqueta y un estilo
 * distintivo:
 *   - ASOCIACION:    línea sólida + etiqueta "asociación"
 *   - AGREGACION:    línea sólida + diamante blanco (◇) al origen
 *   - COMPOSICION:   línea sólida + diamante negro (◆) al origen
 *   - DEPENDENCIA:   línea discontinua
 *   - GENERALIZACION: línea sólida + flecha triangular hueca
 *   - REALIZACION:   línea discontinua + flecha triangular hueca
 */

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';

import type { TipoRelacion } from '@/types';

// ======================================================================
// Datos del edge
// ======================================================================
export interface RelationshipEdgeData extends Record<string, unknown> {
  id: number;
  tipo: TipoRelacion;
  multiplicidad_origen?: string | null;
  multiplicidad_destino?: string | null;
  nombre_asociacion?: string | null;
}

export type RelationshipEdgeType = Edge<RelationshipEdgeData, 'relationshipEdge'>;

// ======================================================================
// Estilos por tipo
// ======================================================================
const TIPO_ESTILO: Record<
  TipoRelacion,
  { stroke: string; dash?: string; markerEnd?: string }
> = {
  ASOCIACION: { stroke: '#94a3b8' },
  AGREGACION: { stroke: '#94a3b8' },
  COMPOSICION: { stroke: '#94a3b8' },
  DEPENDENCIA: { stroke: '#94a3b8', dash: '5,5' },
  GENERALIZACION: {
    stroke: '#94a3b8',
    markerEnd: 'url(#uml-inheritance)',
  },
  REALIZACION: {
    stroke: '#94a3b8',
    dash: '5,5',
    markerEnd: 'url(#uml-inheritance)',
  },
};

const TIPO_LABEL: Record<TipoRelacion, string> = {
  ASOCIACION: '',
  AGREGACION: '',
  COMPOSICION: '',
  DEPENDENCIA: 'depende',
  GENERALIZACION: 'hereda',
  REALIZACION: 'implementa',
};

// ======================================================================
// Componente
// ======================================================================
export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationshipEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const tipo = data?.tipo ?? 'ASOCIACION';
  const estilo = TIPO_ESTILO[tipo];
  const label = TIPO_LABEL[tipo];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#818cf8' : estilo.stroke,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: estilo.dash,
        }}
        markerEnd={estilo.markerEnd}
      />

      <EdgeLabelRenderer>
        {/* -------- Etiqueta central -------- */}
        {(label || data?.nombre_asociacion) && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-surface-900 px-1.5 py-0.5 text-[10px] text-surface-300 ring-1 ring-surface-700"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data?.nombre_asociacion || label}
          </div>
        )}

        {/* -------- Multiplicidad origen -------- */}
        {data?.multiplicidad_origen && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-surface-900 px-1 text-[9px] font-medium text-surface-400"
            style={{
              transform: `translate(-50%, -50%) translate(${(sourceX + labelX) / 2}px,${(sourceY + labelY) / 2}px)`,
            }}
          >
            {data.multiplicidad_origen}
          </div>
        )}

        {/* -------- Multiplicidad destino -------- */}
        {data?.multiplicidad_destino && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-surface-900 px-1 text-[9px] font-medium text-surface-400"
            style={{
              transform: `translate(-50%, -50%) translate(${(targetX + labelX) / 2}px,${(targetY + labelY) / 2}px)`,
            }}
          >
            {data.multiplicidad_destino}
          </div>
        )}
      </EdgeLabelRenderer>

      {/* Marker SVG para herencia/realización */}
      <defs>
        <marker
          id="uml-inheritance"
          viewBox="0 0 20 20"
          refX="18"
          refY="10"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 20 10 L 0 20 z"
            fill="#0f172a"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        </marker>
      </defs>
    </>
  );
}

export default RelationshipEdge;