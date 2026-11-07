// src/websocket/collaborationEvents.ts
/**
 * Definición de los eventos del canal WebSocket de colaboración.
 *
 * Refleja 1:1 los tipos definidos en el backend
 * (`app/websocket/events.py`). Cualquier evento nuevo debe agregarse aquí
 * y en el backend en paralelo.
 *
 * Contrato Ciclo 2 (verificado contra events.py + collaboration_ws.py):
 * - El sobre del mensaje es { type, payload, timestamp?, sender? }.
 * - TODOS los ids son string: ObjectId hex (usuario, diagrama) o uuid
 *   de los elementos embebidos del Diagrama (clases, atributos, ...).
 * - El servidor responde `pong` ante cada `ping` del cliente y emite
 *   `sync_snapshot` al conectar y ante `request_sync`.
 * - Códigos de cierre propios: 4401 token, 4403 sin acceso, 4404
 *   diagrama inexistente (o id malformado).
 */

import type { Id } from '@/types';

// ======================================================================
// Tipos de evento (EventType de events.py)
// ======================================================================
export type WSEventType =
  // Conexión / presencia
  | 'join'
  | 'leave'
  | 'cursor_moved'
  | 'selection_changed'
  // Cambios en el diagrama (TIPOS_DE_CAMBIO del backend: se retransmiten
  // y se registran en historial_cambios_diagrama)
  | 'class_created'
  | 'class_updated'
  | 'class_deleted'
  | 'attribute_created'
  | 'attribute_updated'
  | 'attribute_deleted'
  | 'operation_created'
  | 'operation_updated'
  | 'operation_deleted'
  | 'relation_created'
  | 'relation_updated'
  | 'relation_deleted'
  | 'interface_created'
  | 'interface_updated'
  | 'interface_deleted'
  // Sincronía
  | 'diagram_updated'
  | 'request_sync'
  | 'sync_snapshot'
  // Sistema
  | 'error'
  | 'ping'
  | 'pong'
  // Notificaciones de IA
  | 'ai_action_applied';

// ======================================================================
// Referencia de usuario (UserRef de events.py: id = ObjectId hex)
// ======================================================================
export interface WSUserRef {
  id: Id;
  nombre: string;
}

// ======================================================================
// Mensaje genérico (WSMessage de events.py)
// ======================================================================
export interface WSMessage<T = Record<string, unknown>> {
  type: WSEventType;
  payload: T;
  /** ISO con zona del servidor (datetime.now(timezone.utc).isoformat()). */
  timestamp?: string;
  /** Lo agrega el servidor al retransmitir (nunca viene del cliente). */
  sender?: WSUserRef;
}

// ======================================================================
// Payloads específicos
// ======================================================================
/** join / leave: payload + sender con el usuario que entra o sale. */
export interface JoinPayload {
  id_usuario: Id;
  nombre: string;
}

export type LeavePayload = JoinPayload;

/** cursor_moved: coordenadas del lienzo (@xyflow/react). */
export interface CursorMovedPayload {
  x: number;
  y: number;
}

/** selection_changed: elemento seleccionado por el colaborador. */
export interface SelectionChangedPayload {
  /** 'clase' | 'interfaz' | 'relacion' | 'diagrama' (ElementoSeleccionado). */
  tipo: string;
  id: Id;
}

/**
 * class_created / class_updated: la clase embebida serializada (los ids
 * son uuid). El índice firma permite campos extra sin romper el tipo.
 */
export interface ClassCreatedPayload {
  id: Id;
  nombre: string;
  es_abstracta: boolean;
  estereotipo: string | null;
  pos_x: number;
  pos_y: number;
  [key: string]: unknown;
}

/**
 * class_deleted / relation_deleted / etc.: el backend extrae el id de la
 * entidad del payload con la convención `id`, `id_clase`, `id_atributo`,
 * `id_operacion`, `id_relacion` o `id_interfaz` (ver _extraer_id_entidad).
 */
export interface EntidadEliminadaPayload {
  id?: Id;
  id_clase?: Id;
  id_atributo?: Id;
  id_operacion?: Id;
  id_relacion?: Id;
  id_interfaz?: Id;
}

/**
 * sync_snapshot: lista de usuarios únicos conectados al diagrama
 * (manager.usuarios_conectados: {id, nombre, conexiones}).
 */
export interface SyncSnapshotPayload {
  conectados: Array<{ id: Id; nombre: string; conexiones?: number }>;
}

/** error (build_error): códigos como BAD_MESSAGE / UNKNOWN_EVENT. */
export interface ErrorPayload {
  code: string;
  mensaje: string;
}

// ======================================================================
// Tipos de cambio retransmitidos (TIPOS_DE_CAMBIO de events.py)
// ======================================================================
export const WS_TIPOS_DE_CAMBIO = [
  'class_created',
  'class_updated',
  'class_deleted',
  'attribute_created',
  'attribute_updated',
  'attribute_deleted',
  'operation_created',
  'operation_updated',
  'operation_deleted',
  'relation_created',
  'relation_updated',
  'relation_deleted',
  'interface_created',
  'interface_updated',
  'interface_deleted',
] as const;

// ======================================================================
// Estado de conexión (para la UI)
// ======================================================================
export type SocketStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting';

// ======================================================================
// Handlers que el cliente puede registrar
// ======================================================================
export interface SocketHandlers {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WSMessage) => void;
  onStatusChange?: (status: SocketStatus) => void;
}

// ======================================================================
// Códigos de cierre personalizados (los define collaboration_ws.py)
// ======================================================================
export const WS_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  UNAUTHORIZED: 4401,
  FORBIDDEN: 4403,
  NOT_FOUND: 4404,
} as const;

export function describeCloseCode(code: number): string {
  switch (code) {
    case WS_CLOSE_CODES.NORMAL:
      return 'Cerrado normalmente';
    case WS_CLOSE_CODES.GOING_AWAY:
      return 'Servidor cerrando';
    case WS_CLOSE_CODES.UNAUTHORIZED:
      return 'Sesión expirada o token inválido';
    case WS_CLOSE_CODES.FORBIDDEN:
      return 'Sin acceso a este diagrama';
    case WS_CLOSE_CODES.NOT_FOUND:
      return 'Diagrama no encontrado';
    default:
      return `Cerrado con código ${code}`;
  }
}