// src/features/diagrama-editor/hooks/useDiagramHistory.ts
/**
 * Hook de undo/redo local del editor.
 *
 * Guarda snapshots ligeros del estado del diagrama en memoria (no en el
 * backend). Sirve para deshacer acciones del usuario durante la sesión
 * antes de confirmarlas al servidor.
 *
 * Importante: el undo/redo actual no revierte cambios ya persistidos en
 * el backend, solo el estado local. En la Fase 10 (WebSocket) podemos
 * conectarlo a eventos remotos.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useDiagramaStore } from '@/store';

interface Snapshot {
  clases: ReturnType<typeof useDiagramaStore.getState>['clases'];
  relaciones: ReturnType<typeof useDiagramaStore.getState>['relaciones'];
  interfaces: ReturnType<typeof useDiagramaStore.getState>['interfaces'];
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

  // Snapshot actual del store
  const tomarSnapshot = useCallback((): Snapshot => {
    const s = useDiagramaStore.getState();
    return {
      clases: s.clases,
      relaciones: s.relaciones,
      interfaces: s.interfaces,
    };
  }, []);

  // ------------------------------------------------------------------
  // Push manual (llamado antes de una acción que queremos deshacer)
  // ------------------------------------------------------------------
  const push = useCallback(() => {
    const snap = tomarSnapshot();
    undoStack.current.push(snap);
    if (undoStack.current.length > maxDepth) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, [maxDepth, tomarSnapshot]);

  // ------------------------------------------------------------------
  // Undo
  // ------------------------------------------------------------------
  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    const actual = tomarSnapshot();
    redoStack.current.push(actual);

    useDiagramaStore.setState({
      clases: prev.clases,
      relaciones: prev.relaciones,
      interfaces: prev.interfaces,
    });
  }, [tomarSnapshot]);

  // ------------------------------------------------------------------
  // Redo
  // ------------------------------------------------------------------
  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    const actual = tomarSnapshot();
    undoStack.current.push(actual);

    useDiagramaStore.setState({
      clases: next.clases,
      relaciones: next.relaciones,
      interfaces: next.interfaces,
    });
  }, [tomarSnapshot]);

  // ------------------------------------------------------------------
  // Atajos de teclado globales
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        mod &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
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