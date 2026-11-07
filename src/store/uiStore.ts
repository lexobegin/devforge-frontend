// src/store/uiStore.ts
/**
 * Store de UI global (zustand): tema, sidebar, modales, toasts y
 * paneles del editor.
 *
 * - Tema: `dark` (default) / `light`. El tema se aplica toggling la
 *   clase `light` en <html> (Tailwind se configura con darkMode de
 *   referencia; el CSS base define las variables de cada tema).
 * - Sidebar: visible/oculto (el Navbar lo alterna con toggleSidebar).
 * - Modales: un solo modal abierto a la vez (ModalKey | null).
 * - Toasts: lista auto-removible con setTimeout (4 s por defecto).
 *   El helper `toast.*` se puede usar fuera de React (api, offline...).
 *
 * Solo depende de zustand: nada de API ni de otros stores.
 */

import { create } from 'zustand';

// ======================================================================
// Tipos
// ======================================================================
export type Theme = 'dark' | 'light';

/** Llaves de los modales globales de la app (uno a la vez). */
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

export type ToastTipo = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  tipo: ToastTipo;
  mensaje: string;
}

// ======================================================================
// Constantes
// ======================================================================
/** Duración por defecto de un toast (ms). */
const TOAST_DURACION_MS = 4000;

// ======================================================================
// Estado
// ======================================================================
interface UIState {
  theme: Theme;
  /** Clave del modal abierto, o null si ninguno. */
  modalAbierto: ModalKey;
  /** Dato opcional para el modal (ej. id del proyecto a eliminar). */
  modalData: unknown;
  toasts: Toast[];
  panelPropiedadesAbierto: boolean;
  mostrarGrid: boolean;
  ajustarAGrid: boolean;
  /** Sidebar lateral visible (F29: lo alterna el Navbar). */
  sidebarOpen: boolean;

  alternarTema: () => void;
  abrirModal: (key: Exclude<ModalKey, null>, data?: unknown) => void;
  cerrarModal: () => void;
  addToast: (tipo: ToastTipo, mensaje: string) => string;
  removeToast: (id: string) => void;
  alternarPanelPropiedades: () => void;
  alternarGrid: () => void;
  alternarAjustarAGrid: () => void;
  toggleSidebar: () => void;
}

// ======================================================================
// Aplicación del tema al documento
// ======================================================================
function aplicarTema(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
}

// ======================================================================
// Store
// ======================================================================
export const useUIStore = create<UIState>()((set, get) => ({
  theme: 'dark',
  modalAbierto: null,
  modalData: null,
  toasts: [],
  panelPropiedadesAbierto: true,
  mostrarGrid: true,
  ajustarAGrid: true,
  sidebarOpen: true,

  alternarTema: () => {
    const nuevo: Theme = get().theme === 'dark' ? 'light' : 'dark';
    aplicarTema(nuevo);
    set({ theme: nuevo });
  },

  abrirModal: (key, data = null) => set({ modalAbierto: key, modalData: data }),
  cerrarModal: () => set({ modalAbierto: null, modalData: null }),

  addToast: (tipo, mensaje) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ toasts: [...s.toasts, { id, tipo, mensaje }] }));
    // Auto-remoción (guardamos el timer para poder cancelarlo si el
    // toast se cierra manualmente antes).
    window.setTimeout(() => get().removeToast(id), TOAST_DURACION_MS);
    return id;
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  alternarPanelPropiedades: () =>
    set((s) => ({ panelPropiedadesAbierto: !s.panelPropiedadesAbierto })),
  alternarGrid: () => set((s) => ({ mostrarGrid: !s.mostrarGrid })),
  alternarAjustarAGrid: () =>
    set((s) => ({ ajustarAGrid: !s.ajustarAGrid })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// ======================================================================
// Helper de conveniencia (usable fuera de componentes React)
// ======================================================================
export const toast = {
  success: (mensaje: string) => useUIStore.getState().addToast('success', mensaje),
  error: (mensaje: string) => useUIStore.getState().addToast('error', mensaje),
  warning: (mensaje: string) => useUIStore.getState().addToast('warning', mensaje),
  info: (mensaje: string) => useUIStore.getState().addToast('info', mensaje),
};