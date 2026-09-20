// src/store/uiStore.ts
/**
 * Store de estado de UI global.
 *
 * Mantiene: tema, sidebar, modales abiertos, toasts, preferencias de
 * visualización. Es estado puramente de interfaz, sin lógica de negocio.
 */

import { create } from 'zustand';

// ======================================================================
// Tipos
// ======================================================================
export type Theme = 'dark' | 'light';

export type ToastTipo = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  tipo: ToastTipo;
  mensaje: string;
  duracionMs: number;
}

export type ModalKey =
  | 'crearProyecto'
  | 'editarProyecto'
  | 'miembrosProyecto'
  | 'generarBackend'
  | 'exportarXMI'
  | 'importarXMI'
  | 'confirmarEliminar'
  | 'subirBoceto'
  | null;

interface UIState {
  // --- Tema ---
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // --- Sidebar ---
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // --- Modales ---
  modalAbierto: ModalKey;
  modalPayload: Record<string, unknown> | null;
  abrirModal: (key: ModalKey, payload?: Record<string, unknown>) => void;
  cerrarModal: () => void;

  // --- Toasts ---
  toasts: Toast[];
  addToast: (tipo: ToastTipo, mensaje: string, duracionMs?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // --- Panel del editor ---
  panelPropiedadesAbierto: boolean;
  togglePanelPropiedades: () => void;

  // --- Preferencias del editor ---
  mostrarGrid: boolean;
  toggleGrid: () => void;
  ajustarAGrid: boolean;
  toggleAjustarAGrid: () => void;
}

// ======================================================================
// Store
// ======================================================================
export const useUIStore = create<UIState>((set) => ({
  // --- Tema ---
  theme: 'dark',
  setTheme: (theme) => {
    document.documentElement.classList.toggle('light', theme === 'light');
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light', next === 'light');
      return { theme: next };
    }),

  // --- Sidebar ---
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // --- Modales ---
  modalAbierto: null,
  modalPayload: null,
  abrirModal: (key, payload) =>
    set({ modalAbierto: key, modalPayload: payload ?? null }),
  cerrarModal: () => set({ modalAbierto: null, modalPayload: null }),

  // --- Toasts ---
  toasts: [],
  addToast: (tipo, mensaje, duracionMs = 4000) =>
    set((state) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nuevo: Toast = { id, tipo, mensaje, duracionMs };
      // Auto-eliminar
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          useUIStore.getState().removeToast(id);
        }, duracionMs);
      }
      return { toasts: [...state.toasts, nuevo] };
    }),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),

  // --- Panel del editor ---
  panelPropiedadesAbierto: true,
  togglePanelPropiedades: () =>
    set((s) => ({ panelPropiedadesAbierto: !s.panelPropiedadesAbierto })),

  // --- Preferencias del editor ---
  mostrarGrid: true,
  toggleGrid: () => set((s) => ({ mostrarGrid: !s.mostrarGrid })),
  ajustarAGrid: true,
  toggleAjustarAGrid: () => set((s) => ({ ajustarAGrid: !s.ajustarAGrid })),
}));

// ======================================================================
// Helpers para usar los toasts desde cualquier parte
// ======================================================================
export const toast = {
  success: (m: string) => useUIStore.getState().addToast('success', m),
  error: (m: string) => useUIStore.getState().addToast('error', m),
  warning: (m: string) => useUIStore.getState().addToast('warning', m),
  info: (m: string) => useUIStore.getState().addToast('info', m),
};