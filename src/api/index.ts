// src/api/index.ts
/**
 * Barrel de exportación de la capa API.
 *
 * Uso:
 *   import { authApi, proyectosApi } from '@/api';
 */

// Cliente base y utilidades
export {
  httpClient,
  http,
  tokenStorage,
  uploadFile,
  ApiError,
  STORAGE_KEYS,
} from './httpClient';

// APIs por módulo
export { authApi } from './authApi';
export { proyectosApi } from './proyectosApi';
export { diagramasApi } from './diagramasApi';
export { trazabilidadApi } from './trazabilidadApi';
export { intercambioApi } from './intercambioApi';
export { generacionApi } from './generacionApi';
export { iaApi } from './iaApi';
export { aiVisionApi } from './aiVisionApi';
export { sincronizacionApi } from './sincronizacionApi';
export { notificacionesApi } from './notificacionesApi';

// Re-exportar tipos locales que pueden ser útiles desde fuera
export type {
  TipoCambio,
  HistorialCambio,
  VersionDiagrama,
  VersionDiagramaResumen,
  VersionDiagramaCreate,
  ComentarioDiagrama,
  ComentarioDiagramaCreate,
  ComentarioDiagramaUpdate,
} from './trazabilidadApi';

export type {
  FormatoIntercambio,
  EstadoImportacion,
  ExportacionDiagrama,
  ExportacionResultado,
  ImportacionDiagrama,
  ImportacionResultado,
} from './intercambioApi';

export type {
  CanalIA,
  PromptIARequest,
  AccionIAPropuesta,
  RespuestaIA,
  ConfirmarAccionIARequest,
  InteraccionIA,
} from './iaApi';

export type { VisionReconocimientoResponse } from './aiVisionApi';

export type {
  EstadoColaSync,
  CambioOfflineItem,
  BatchSincronizacionRequest,
  BatchSincronizacionResponse,
  ResultadoCambioSync,
  ConflictoSync,
  EstrategiaConflicto,
  ResolverConflictoRequest,
} from './sincronizacionApi';

export type {
  TipoNotificacion,
  Notificacion,
  ContadorNoLeidas,
  MarcarLeidasRequest,
  MarcarLeidasResponse,
} from './notificacionesApi';