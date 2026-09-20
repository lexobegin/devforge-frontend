// src/store/colaboracionStore.ts
/**
 * Store de colaboración en tiempo real.
 *
 * Mantiene el estado de los colaboradores conectados al diagrama actual
 * y la posición de sus cursores en el lienzo. Se actualiza exclusivamente
 * desde los eventos WebSocket (nunca hace requests HTTP propios).
 */

import { create } from 'zustand';

import type { Id } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
export interface ColaboradorConectado {
  id: Id;
  nombre: string;
  /** Posición del cursor en el lienzo (coordenadas del canvas). */
  cursor?: { x: number; y: number } | null;
  /** Color asignado automáticamente para distinguirlo visualmente. */
  color: string;
  /** Elemento actualmente seleccionado por este colaborador. */
  seleccion?: { tipo: string; id: Id } | null;
}

interface ColaboracionState {
  // --- Estado ---
  conectados: ColaboradorConectado[];
  isConnected: boolean;
  /** Mi propio id de usuario (para excluirme de la lista). */
  miUsuarioId: Id | null;

      /** Emisores registrados por el hook del WS. */
  emisores: {
    cursor: ((x: number, y: number) => void) | null;
    seleccion: ((tipo: string, id: number) => void) | null;
    evento: ((type: string, payload: Record<string, unknown>) => void) | null;
  };
  setEmisores: (
    e: Partial<ColaboracionState['emisores']>
  ) => void;

  // --- Acciones (invocadas desde el WS) ---
  setMiUsuarioId: (id: Id | null) => void;
  setConectados: (colaboradores: Array<{ id: Id; nombre: string }>) => void;
  agregarColaborador: (colaborador: { id: Id; nombre: string }) => void;
  quitarColaborador: (id: Id) => void;
  actualizarCursor: (id: Id, cursor: { x: number; y: number } | null) => void;
  actualizarSeleccion: (
    id: Id,
    seleccion: { tipo: string; id: Id } | null
  ) => void;
  setConnected: (connected: boolean) => void;
  limpiar: () => void;


}

// ======================================================================
// Paleta de colores para colaboradores (se asigna por id)
// ======================================================================
const COLORES = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
];

function colorPorId(id: Id): string {
  return COLORES[Math.abs(id) % COLORES.length];
}

// ======================================================================
// Store
// ======================================================================
export const useColaboracionStore = create<ColaboracionState>((set, get) => ({
  conectados: [],
  isConnected: false,
  miUsuarioId: null,
  emisores: { cursor: null, seleccion: null, evento: null },

setEmisores: (nuevos) =>
  set((state) => ({
    emisores: { ...state.emisores, ...nuevos },
  })),

  setMiUsuarioId: (id) => set({ miUsuarioId: id }),

  setConectados: (colaboradores) =>
    set((state) => ({
      conectados: colaboradores
        .filter((c) => c.id !== state.miUsuarioId)
        .map((c) => ({
          id: c.id,
          nombre: c.nombre,
          color: colorPorId(c.id),
          cursor: null,
          seleccion: null,
        })),
    })),

  agregarColaborador: (colaborador) =>
    set((state) => {
      if (colaborador.id === state.miUsuarioId) return {};
      if (state.conectados.some((c) => c.id === colaborador.id)) return {};
      return {
        conectados: [
          ...state.conectados,
          {
            id: colaborador.id,
            nombre: colaborador.nombre,
            color: colorPorId(colaborador.id),
            cursor: null,
            seleccion: null,
          },
        ],
      };
    }),

  quitarColaborador: (id) =>
    set((state) => ({
      conectados: state.conectados.filter((c) => c.id !== id),
    })),

  actualizarCursor: (id, cursor) =>
    set((state) => ({
      conectados: state.conectados.map((c) =>
        c.id === id ? { ...c, cursor } : c
      ),
    })),

  actualizarSeleccion: (id, seleccion) =>
    set((state) => ({
      conectados: state.conectados.map((c) =>
        c.id === id ? { ...c, seleccion } : c
      ),
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  limpiar: () =>
    set({
      conectados: [],
      isConnected: false,
    }),
}));

// ======================================================================
// Selectores útiles
// ======================================================================
export const selectCantidadConectados = (state: ColaboracionState) =>
  state.conectados.length;

export const selectColaboradorPorId = (id: Id) => (state: ColaboracionState) =>
  state.conectados.find((c) => c.id === id);