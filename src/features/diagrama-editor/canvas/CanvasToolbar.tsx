// src/features/diagrama-editor/canvas/CanvasToolbar.tsx
/**
 * Toolbar del canvas del editor.
 *
 * Botones:
 * - Seleccionar
 * - Agregar clase
 * - Agregar relación
 * - Agregar interfaz
 * - Ordenar automáticamente (F55: elkjs layered, arriba→abajo)
 * - Zoom in / out / reset
 * - Ajustar vista
 * - Toggle grid
 *
 * Se renderiza DENTRO de <ReactFlow> (ver DiagramCanvas), por eso
 * useReactFlow() resuelve el contexto del Provider.
 */

import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { ReactNode } from 'react';

import { useDiagramaStore, useUIStore, toast } from '@/store';
import { calcularLayout } from './autoLayout';

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const modoEditor = useDiagramaStore((s) => s.modoEditor);
  const setModoEditor = useDiagramaStore((s) => s.setModoEditor);

  // F55: layout automático (mueve las clases y persiste cada posición).
  const clases = useDiagramaStore((s) => s.clases);
  const relaciones = useDiagramaStore((s) => s.relaciones);
  const moverClase = useDiagramaStore((s) => s.moverClase);
  const actualizarClase = useDiagramaStore((s) => s.actualizarClase);
  const [ordenando, setOrdenando] = useState(false);

  const mostrarGrid = useUIStore((s) => s.mostrarGrid);
  const alternarGrid = useUIStore((s) => s.alternarGrid);

  // ------------------------------------------------------------------
  // Ordenar automáticamente: calcular con ELK → aplicar en local →
  // persistir cada posición (igual que al soltar un nodo). Los errores
  // de una posición no abortan el resto (allSettled).
  // ------------------------------------------------------------------
  const ordenarAutomaticamente = useCallback(async () => {
    if (ordenando) return;
    if (clases.length === 0) {
      toast.info('No hay clases para ordenar');
      return;
    }

    setOrdenando(true);
    try {
      const posiciones = await calcularLayout(clases, relaciones);

      for (const [claseId, pos] of posiciones) {
        moverClase(claseId, pos.x, pos.y);
      }

      const resultados = await Promise.allSettled(
        [...posiciones.entries()].map(([claseId, pos]) =>
          actualizarClase(claseId, { pos_x: pos.x, pos_y: pos.y })
        )
      );
      const fallidas = resultados.filter(
        (r) => r.status === 'rejected'
      ).length;

      void fitView({ padding: 0.2, duration: 300 });

      if (fallidas === 0) {
        toast.success(
          `Diagrama ordenado (${posiciones.size} clase${
            posiciones.size !== 1 ? 's' : ''
          })`
        );
      } else {
        toast.warning(
          `Layout aplicado en local, pero ${fallidas} posición(es) no se pudieron guardar`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo calcular el layout del diagrama'
      );
    } finally {
      setOrdenando(false);
    }
  }, [ordenando, clases, relaciones, moverClase, actualizarClase, fitView]);

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-md border border-surface-800 bg-surface-900/95 p-1 shadow-lg backdrop-blur-sm">
      {/* -------- Modo selección -------- */}
      <ToolbarButton
        active={modoEditor === 'select'}
        onClick={() => setModoEditor('select')}
        title="Seleccionar (V)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      </ToolbarButton>

      <div className="mx-1 my-0.5 h-px bg-surface-800" />

      {/* -------- Agregar clase -------- */}
      <ToolbarButton
        active={modoEditor === 'add-class'}
        onClick={() =>
          setModoEditor(modoEditor === 'add-class' ? 'select' : 'add-class')
        }
        title="Agregar clase (C)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </ToolbarButton>

      {/* -------- Agregar relación -------- */}
      <ToolbarButton
        active={modoEditor === 'add-relation'}
        onClick={() =>
          setModoEditor(
            modoEditor === 'add-relation' ? 'select' : 'add-relation'
          )
        }
        title="Agregar relación (R)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarButton>

      {/* -------- Agregar interfaz -------- */}
      <ToolbarButton
        active={modoEditor === 'add-interface'}
        onClick={() =>
          setModoEditor(
            modoEditor === 'add-interface' ? 'select' : 'add-interface'
          )
        }
        title="Agregar interfaz (I)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </ToolbarButton>

      <div className="mx-1 my-0.5 h-px bg-surface-800" />

      {/* -------- Ordenar automáticamente (F55, elkjs) -------- */}
      <ToolbarButton
        onClick={() => void ordenarAutomaticamente()}
        disabled={ordenando}
        title="Ordenar automáticamente (layout jerárquico)"
      >
        {ordenando ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        )}
      </ToolbarButton>

      <div className="mx-1 my-0.5 h-px bg-surface-800" />

      {/* -------- Zoom controls -------- */}
      <ToolbarButton onClick={() => void zoomIn()} title="Acercar">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={() => void zoomOut()} title="Alejar">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={() => void fitView({ padding: 0.2 })} title="Ajustar a pantalla">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </ToolbarButton>

      <div className="mx-1 my-0.5 h-px bg-surface-800" />

      {/* -------- Toggle grid -------- */}
      <ToolbarButton active={mostrarGrid} onClick={alternarGrid} title="Mostrar/Ocultar grilla">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

// ======================================================================
// Botón interno
// ======================================================================
interface ToolbarButtonProps {
  children: ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({
  children,
  onClick,
  title,
  active,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        disabled
          ? 'cursor-wait text-surface-500'
          : active
            ? 'bg-brand-600 text-white'
            : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default CanvasToolbar;
