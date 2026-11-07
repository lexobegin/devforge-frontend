// src/websocket/index.ts
/**
 * Barrel del módulo WebSocket de colaboración.
 *
 * Uso:
 *   import { createSocketClient, WS_CLOSE_CODES } from '@/websocket';
 *   import type { WSMessage, SocketStatus } from '@/websocket';
 *
 * El cliente solo se usa a través de
 * features/diagrama-editor/hooks/useDiagramSocket (F22), que lo conecta
 * con los stores (diagramaStore / colaboracionStore).
 */

// Cliente
export { SocketClient, createSocketClient } from './socketClient';

// Constantes y helpers de protocolo
export {
  WS_CLOSE_CODES,
  WS_TIPOS_DE_CAMBIO,
  describeCloseCode,
} from './collaborationEvents';

// Tipos del canal
export type {
  WSEventType,
  WSMessage,
  WSUserRef,
  SocketStatus,
  SocketHandlers,
  JoinPayload,
  LeavePayload,
  CursorMovedPayload,
  SelectionChangedPayload,
  ClassCreatedPayload,
  EntidadEliminadaPayload,
  SyncSnapshotPayload,
  ErrorPayload,
} from './collaborationEvents';