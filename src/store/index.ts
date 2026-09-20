// src/store/index.ts
/**
 * Barrel de exportación de stores.
 *
 * Uso:
 *   import { useAuthStore, useUIStore, toast } from '@/store';
 */

export { useAuthStore } from './authStore';
export { useProyectoStore } from './proyectoStore';
export { useDiagramaStore } from './diagramaStore';
export {
  useColaboracionStore,
  selectCantidadConectados,
  selectColaboradorPorId,
} from './colaboracionStore';
export { useUIStore, toast } from './uiStore';

// Re-exportar tipos útiles
export type {
  ElementoSeleccionado,
} from './diagramaStore';

export type {
  ColaboradorConectado,
} from './colaboracionStore';

export type {
  Theme,
  Toast,
  ToastTipo,
  ModalKey,
} from './uiStore';