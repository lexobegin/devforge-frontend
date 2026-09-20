// src/websocket/collaborationEvents.ts
/**
 * Definición de los eventos del canal WebSocket de colaboración.
 *
 * Refleja 1:1 los tipos definidos en el backend
 * (`app/websocket/events.py`). Cualquier evento nuevo debe agregarse aquí
 * y en el backend en paralelo.
 */

import type { Id } from '@/types';

// ======================================================================
// Tipos de evento
// ======================================================================
export type WSEventType =
  // Conexión / presencia
  | 'join'
  | 'leave'
  | 'cursor_moved'
  | 'selection_changed'
  // Cambios en el diagrama
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
  | 'ai_action_applied';

// ======================================================================
// Referencia de usuario
// ======================================================================
export interface WSUserRef {
  id: Id;
  nombre: string;
}

// ======================================================================
// Mensaje genérico
// ======================================================================
export interface WSMessage<T = Record<string, unknown>> {
  type: WSEventType;
  payload: T;
  timestamp?: string;
  sender?: WSUserRef;
}

// ======================================================================
// Payloads específicos
// ======================================================================
export interface JoinPayload {
  id_usuario: Id;
  nombre: string;
}

export interface LeavePayload {
  id_usuario: Id;
  nombre: string;
}

export interface CursorMovedPayload {
  x: number;
  y: number;
}

export interface SelectionChangedPayload {
  tipo: string;
  id: Id;
}

export interface ClassCreatedPayload {
  id: Id;
  id_diagrama: Id;
  nombre: string;
  es_abstracta: boolean;
  estereotipo: string | null;
  pos_x: number;
  pos_y: number;
  [key: string]: unknown;
}

export interface SyncSnapshotPayload {
  conectados: Array<{ id: Id; nombre: string }>;
}

export interface ErrorPayload {
  code: string;
  mensaje: string;
}

// ======================================================================
// Estado de conexión
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
// Códigos de cierre personalizados (definidos en el backend)
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