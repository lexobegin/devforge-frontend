// src/offline/index.ts
/**
 * Barrel del módulo offline.
 */

export {
  db,
  getDispositivoId,
  generarIdTemporalLocal,
  limpiarBaseLocal,
} from './indexedDbClient';

export type {
  DiagramaLocal,
  ClaseLocal,
  RelacionLocal,
  ItemColaSync,
  TipoOperacionSync,
} from './indexedDbClient';

export { diagramaLocalRepo } from './diagramaLocalRepo';
export { syncQueue } from './syncQueue';
export { syncManager } from './syncManager';
export { registerServiceWorker, unregisterServiceWorkers } from './serviceWorker';