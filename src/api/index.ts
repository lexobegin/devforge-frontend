// src/api/index.ts
/**
 * Barrel de exportación de la capa API.
 *
 * Uso:
 *   import { authApi, proyectosApi, iaApi, auditoriaApi } from '@/api';
 *
 * BLOQUE C COMPLETO (F11-F17) + colaboracionApi (F20): los 13 módulos de API están cerrados.
 */

// Cliente base y utilidades
export {
  httpClient,
  http,
  tokenStorage,
  uploadFile,
  ApiError,
  STORAGE_KEYS,
  estaEnModoLocal,
  resetearModoLocal,
} from './httpClient';

// APIs por módulo (Bloque C)
export { authApi } from './authApi';
export { usuariosApi, type UsuariosQuery } from './usuariosApi';
export { proyectosApi } from './proyectosApi';
export { diagramasApi } from './diagramasApi';
export {
  iaApi,
  type OrigenMensaje,
  type EstadoAccionIA,
  type PromptIARequest,
  type AccionIAPropuesta,
  type RespuestaIA,
  type ConfirmarAccionIARequest,
  type AccionIA,
} from './iaApi';
export {
  aiVisionApi,
  type VisionReconocimientoResponse,
  type IdiomaVision,
} from './aiVisionApi';
export {
  intercambioApi,
  type FormatoIntercambio,
  type EstadoImportacion,
  type ExportacionDiagrama,
  type ExportacionResultado,
  type ImportacionDiagrama,
  type ImportacionResultado,
} from './intercambioApi';
export { generacionApi } from './generacionApi';
export {
  notificacionesApi,
  type TipoNotificacion,
  type Notificacion,
  type ContadorNoLeidas,
  type MarcarLeidasRequest,
  type MarcarLeidasResponse,
} from './notificacionesApi';
export {
  trazabilidadApi,
  type TipoCambio,
  type HistorialCambio,
  type VersionDiagramaResumen,
  type VersionDiagrama,
  type VersionDiagramaCreate,
  type ComentarioDiagrama,
  type ComentarioDiagramaCreate,
  type ComentarioDiagramaUpdate,
} from './trazabilidadApi';
//Adelanto de F17: lo consume offline/syncManager (Bloque F).
export {
  sincronizacionApi,
  type EstadoSincronizacion,
  type CambioOfflineItem,
  type BatchSincronizacionRequest,
  type ResultadoCambioSync,
  type BatchSincronizacionResponse,
  type ConflictoSync,
  type EstrategiaResolucion,
  type ResolverConflictoRequest,
} from './sincronizacionApi';
export {
  auditoriaApi,
  type BitacoraSistema,
  type BitacoraQuery,
} from './auditoriaApi';
export {
  colaboracionApi,
  type SesionColaboracion,
  type ParticipanteSesion,
  type SesionConParticipantes,
  type PosicionCursor,
  type CursorUpdate,
  type CierreSesionesResponse,
} from './colaboracionApi';