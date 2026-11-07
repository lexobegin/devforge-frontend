// src/features/diagrama-editor/hooks/useDiagramHistory.ts
/**
 * Hook de undo/redo fino del editor (F51).
 *
 * Guarda snapshots LIGEROS de las colecciones del diagramaStore
 * (clases/interfaces/relaciones — solo referencias, el store es la
 * fuente de verdad) en dos pilas en memoria. Sirve para deshacer
 * acciones del usuario durante la sesión.
 *
 * Límites (documentados, mismos del Ciclo 1 + decisiones Ciclo 2):
 * - El undo/redo solo revierte el estado LOCAL: si el cambio ya se
 *   persistió por REST, deshacer NO llama al backend; el estado
 *   revertido queda marcado `haycambiosSinGuardar` para que el
 *   siguiente guardar/sync lo mande.
 * - Los cambios REMOTOS (WebSocket) no entran a estas pilas: las
 *   aplica*Remota del store no pasan por el hook.
 *
 * Correcciones sobre el paste:
 * - canUndo/canRedo devolvían flags CONGELADOS (las pilas viven en refs
 *   que no re-renderizan): ahora un contador de versión fuerza el
 *   recálculo en cada push/undo/redo.
 * - undo/redo ahora marcan `haycambiosSinGuardar: true` (el estado local
 *   deja de coincidir con el servidor hasta el próximo guardado).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDiagramaStore } from '@/store';
import type { ClaseUML, InterfazUML, RelacionUML } from '@/types';

interface Snapshot {
  clases: ClaseUML[];
  interfaces: InterfazUML[];
  relaciones: RelacionUML[];
}

interface UseDiagramHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  push: () => void;
}

export function useDiagramHistory(maxDepth = 30): UseDiagramHistoryReturn {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  // Las refs no re-renderizan: el contador fuerza el recálculo de los
  // flags canUndo/canRedo en cada mutación de las pilas.
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Snapshot actual del store
  const tomarSnapshot = useCallback((): Snapshot => {
    const s = useDiagramaStore.getState();
    return {
      clases: s.clases,
      interfaces: s.interfaces,
      relaciones: s.relaciones,
    };
  }, []);

  // ------------------------------------------------------------------
  // Push manual (llamado antes de una acción que queremos deshacer)
  // ------------------------------------------------------------------
  const push = useCallback(() => {
    undoStack.current.push(tomarSnapshot());
    if (undoStack.current.length > maxDepth) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    bump();
  }, [maxDepth, tomarSnapshot, bump]);

  // ------------------------------------------------------------------
  // Undo
  // ------------------------------------------------------------------
  const undo = useCallback(() => {
    const previo = undoStack.current.pop();
    if (!previo) return;
    redoStack.current.push(tomarSnapshot());

    useDiagramaStore.setState({
      clases: previo.clases,
      interfaces: previo.interfaces,
      relaciones: previo.relaciones,
      haycambiosSinGuardar: true,
    });
    bump();
  }, [tomarSnapshot, bump]);

  // ------------------------------------------------------------------
  // Redo
  // ------------------------------------------------------------------
  const redo = useCallback(() => {
    const siguiente = redoStack.current.pop();
    if (!siguiente) return;
    undoStack.current.push(tomarSnapshot());

    useDiagramaStore.setState({
      clases: siguiente.clases,
      interfaces: siguiente.interfaces,
      relaciones: siguiente.relaciones,
      haycambiosSinGuardar: true,
    });
    bump();
  }, [tomarSnapshot, bump]);

  // ------------------------------------------------------------------
  // Atajos de teclado globales (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    undo,
    redo,
    push,
  };
}

export default useDiagramHistory;