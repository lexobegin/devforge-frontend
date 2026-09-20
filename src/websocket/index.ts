// src/websocket/index.ts
/**
 * Barrel del módulo WebSocket.
 */

export {
  SocketClient,
  createSocketClient,
} from './socketClient';

export {
  WS_CLOSE_CODES,
  describeCloseCode,
} from './collaborationEvents';

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
  SyncSnapshotPayload,
  ErrorPayload,
} from './collaborationEvents';