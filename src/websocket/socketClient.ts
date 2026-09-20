// src/websocket/socketClient.ts
/**
 * Cliente WebSocket para la colaboración en tiempo real.
 *
 * Responsabilidades:
 * - Abrir y mantener la conexión WS al diagrama actual.
 * - Enviar mensajes tipados al servidor.
 * - Recibir y parsear mensajes entrantes.
 * - Reconectar automáticamente con backoff exponencial.
 * - Notificar cambios de estado (connected / reconnecting / disconnected).
 *
 * La URL del WebSocket tiene la forma:
 *   <wsBase>/ws/diagramas/<id>?token=<jwt>
 *
 * El token de acceso se lee del localStorage en cada conexión (así
 * funciona correctamente tras un refresh).
 */

import { env, buildDiagramWsUrl } from '@/config/env';
import { tokenStorage } from '@/api';
import {
  WS_CLOSE_CODES,
  describeCloseCode,
  type SocketHandlers,
  type SocketStatus,
  type WSMessage,
} from './collaborationEvents';

// ======================================================================
// Opciones
// ======================================================================
interface SocketClientOptions {
  diagramaId: number;
  handlers?: SocketHandlers;
  /** Máximo de intentos de reconexión. -1 = infinito. */
  maxReconnectAttempts?: number;
  /** Delay inicial de reconexión en ms (se duplica en cada intento). */
  initialReconnectDelayMs?: number;
  /** Delay máximo entre intentos (tope del backoff). */
  maxReconnectDelayMs?: number;
}

// ======================================================================
// Cliente
// ======================================================================
export class SocketClient {
  private ws: WebSocket | null = null;
  private diagramaId: number;
  private handlers: SocketHandlers;
  private status: SocketStatus = 'idle';

  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private initialReconnectDelayMs: number;
  private maxReconnectDelayMs: number;

  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manualClose = false;

  constructor(options: SocketClientOptions) {
    this.diagramaId = options.diagramaId;
    this.handlers = options.handlers ?? {};
    this.maxReconnectAttempts =
      options.maxReconnectAttempts ?? env.ws.reconnectMaxAttempts;
    this.initialReconnectDelayMs =
      options.initialReconnectDelayMs ?? env.ws.reconnectInitialDelayMs;
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000;
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  getStatus(): SocketStatus {
    return this.status;
  }

  connect(): void {
    this.manualClose = false;
    this.openSocket();
  }

  close(): void {
    this.manualClose = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close(WS_CLOSE_CODES.NORMAL, 'Cierre manual');
      } catch {
        /* noop */
      }
      this.ws = null;
    }
    this.setStatus('idle');
  }

  /** Envía un mensaje tipado al servidor. */
  send<T = unknown>(type: string, payload: T = {} as T): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(
        JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString(),
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Atajo para actualizar el cursor (frecuente, sin sobrecarga). */
  sendCursor(x: number, y: number): boolean {
    return this.send('cursor_moved', { x, y });
  }

  /** Atajo para informar la selección actual. */
  sendSelection(tipo: string, id: number): boolean {
    return this.send('selection_changed', { tipo, id });
  }

  /** Atajo para emitir un cambio del diagrama (lo persiste el backend). */
  sendDiagramEvent(type: string, payload: Record<string, unknown>): boolean {
    return this.send(type, payload);
  }

  // ------------------------------------------------------------------
  // Internos
  // ------------------------------------------------------------------
  private openSocket(): void {
    const token = tokenStorage.getAccess();
    if (!token) {
      this.setStatus('disconnected');
      this.handlers.onError?.(new Event('no-token'));
      return;
    }

    this.setStatus(
      this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting'
    );

    const url = buildDiagramWsUrl(this.diagramaId, token);
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.handlers.onOpen?.();
      this.startHeartbeat();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        // Responder a ping del servidor con pong
        if (data.type === 'ping') {
          this.send('pong', {});
          return;
        }
        // Ignorar pong del servidor
        if (data.type === 'pong') return;
        this.handlers.onMessage?.(data);
      } catch {
        // Mensaje no parseable: ignorar
      }
    };

    socket.onerror = (event) => {
      this.handlers.onError?.(event);
    };

    socket.onclose = (event) => {
      this.stopHeartbeat();
      const estabaConectado = this.status === 'connected';
      this.setStatus('disconnected');
      this.handlers.onClose?.(event);

      // No reconectar si fue cierre manual o error de auth/permisos
      if (this.manualClose) return;
      if (
        event.code === WS_CLOSE_CODES.UNAUTHORIZED ||
        event.code === WS_CLOSE_CODES.FORBIDDEN ||
        event.code === WS_CLOSE_CODES.NOT_FOUND
      ) {
        console.warn('[WS] Cierre sin reintento:', describeCloseCode(event.code));
        return;
      }

      // Reintentar si estaba conectado o si aún tenemos margen
      if (estabaConectado) {
        this.reconnectAttempts = 0;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;
    if (
      this.maxReconnectAttempts >= 0 &&
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      this.setStatus('disconnected');
      return;
    }

    const delay = Math.min(
      this.initialReconnectDelayMs * 2 ** this.reconnectAttempts,
      this.maxReconnectDelayMs
    );
    this.reconnectAttempts++;

    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  // ------------------------------------------------------------------
  // Heartbeat (cliente envía ping cada 30s para mantener viva la conexión)
  // ------------------------------------------------------------------
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send('ping', {});
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
  }

  private setStatus(status: SocketStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.handlers.onStatusChange?.(status);
  }
}

// ======================================================================
// Factory
// ======================================================================
export function createSocketClient(
  diagramaId: number,
  handlers: SocketHandlers = {}
): SocketClient {
  return new SocketClient({ diagramaId, handlers });
}